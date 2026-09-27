/** Rendering finished photos from the untouched originals. */

import {
    coverRatios,
    metrics,
    resolveTransform,
    toBitmap,
    type Transform,
} from "@/app/ui/home/image-utils";

const QUALITY = 0.95;

type Source = {
    file: File;
    width: number;
    height: number;
    transform: Transform;
};

/** Output size is however many source pixels the crop actually covers, so the
 *  export is never upscaled and never larger than the detail behind it. */
export function outputSize(photo: Source, frameAspect: number) {
    const imageAspect = photo.width / photo.height;
    const transform = resolveTransform(photo.transform, imageAspect, frameAspect);
    const cover = coverRatios(imageAspect, frameAspect);

    const width = Math.max(1, Math.round(photo.width / (cover.width * transform.scale)));
    return { width, height: Math.max(1, Math.round(width / frameAspect)), transform };
}

/** Draw one photo at full resolution. The placement repeats what the preview
 *  does, using the same helpers, so what is exported cannot drift from what was
 *  on screen. */
export async function renderPhoto(photo: Source, frameAspect: number) {
    const imageAspect = photo.width / photo.height;
    const { width, height, transform } = outputSize(photo, frameAspect);
    const size = metrics(transform, imageAspect, frameAspect, { width, height });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.imageSmoothingQuality = "high";

    const bitmap = await toBitmap(photo.file);
    try {
        // Same order as the CSS: centre, turn, then shift along the photo's own
        // axes, because the translate is applied after the rotate.
        context.translate(width / 2, height / 2);
        context.rotate((transform.rotation * Math.PI) / 180);
        context.translate(transform.x * size.roomX, transform.y * size.roomY);
        context.drawImage(
            bitmap,
            -size.width / 2,
            -size.height / 2,
            size.width,
            size.height,
        );
    } finally {
        bitmap.close();
    }

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    canvas.width = 0;
    canvas.height = 0;

    if (!blob) throw new Error("Could not encode the photo");
    return blob;
}

/** "YYYY:MM:DD HH:MM:SS", the only date format EXIF accepts. */
function exifDate(date: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
        `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}

/** A minimal Exif APP1 segment carrying nothing but the capture date.
 *  iOS Photos orders the camera roll by that date, so giving each export an
 *  increasing one is what keeps them in the order shown in the app. */
function exifSegment(date: Date) {
    const text = exifDate(date); // 19 chars + a NUL = 20 bytes
    const TIFF_BYTES = 128;
    const buffer = new ArrayBuffer(TIFF_BYTES);
    const view = new DataView(buffer);
    const little = true;

    // TIFF header: little-endian, magic 42, IFD0 starts at byte 8.
    view.setUint16(0, 0x4949, little);
    view.setUint16(2, 42, little);
    view.setUint32(4, 8, little);

    const IFD0 = 8;
    const EXIF_IFD = 38;
    const DATA = 68;

    const entry = (at: number, tag: number, type: number, count: number, value: number) => {
        view.setUint16(at, tag, little);
        view.setUint16(at + 2, type, little);
        view.setUint32(at + 4, count, little);
        view.setUint32(at + 8, value, little);
    };

    // IFD0: DateTime, and a pointer to the Exif sub-IFD.
    view.setUint16(IFD0, 2, little);
    entry(IFD0 + 2, 0x0132, 2, 20, DATA);
    entry(IFD0 + 14, 0x8769, 4, 1, EXIF_IFD);
    view.setUint32(IFD0 + 26, 0, little);

    // Exif sub-IFD: the two dates readers actually sort on.
    view.setUint16(EXIF_IFD, 2, little);
    entry(EXIF_IFD + 2, 0x9003, 2, 20, DATA + 20);
    entry(EXIF_IFD + 14, 0x9004, 2, 20, DATA + 40);
    view.setUint32(EXIF_IFD + 26, 0, little);

    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < 3; i++) {
        for (let c = 0; c < text.length; c++) {
            bytes[DATA + i * 20 + c] = text.charCodeAt(c);
        }
        bytes[DATA + i * 20 + 19] = 0;
    }

    const header = new Uint8Array(10);
    header[0] = 0xff;
    header[1] = 0xe1; // APP1
    const length = 2 + 6 + TIFF_BYTES;
    header[2] = length >> 8;
    header[3] = length & 0xff;
    header.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4); // "Exif\0\0"

    return new Uint8Array([...header, ...bytes]);
}

/** Splice the date in straight after the start-of-image marker. */
export async function withExifDate(jpeg: Blob, date: Date) {
    const bytes = new Uint8Array(await jpeg.arrayBuffer());
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return jpeg; // not a JPEG

    const segment = exifSegment(date);
    const out = new Uint8Array(bytes.length + segment.length);
    out.set(bytes.subarray(0, 2), 0);
    out.set(segment, 2);
    out.set(bytes.subarray(2), 2 + segment.length);

    return new Blob([out], { type: "image/jpeg" });
}

/** Render every photo, oldest-looking first, so the gallery keeps app order. */
export async function exportPhotos(
    photos: Source[],
    frameAspect: number,
    onProgress: (done: number) => void,
) {
    const stamp = Date.now() - photos.length * 1000;
    const files: File[] = [];

    for (const [i, photo] of photos.entries()) {
        const rendered = await renderPhoto(photo, frameAspect);
        const dated = await withExifDate(rendered, new Date(stamp + i * 1000));
        files.push(
            new File([dated], `${String(i + 1).padStart(2, "0")}-position.jpg`, {
                type: "image/jpeg",
            }),
        );
        onProgress(i + 1);
    }

    return files;
}
