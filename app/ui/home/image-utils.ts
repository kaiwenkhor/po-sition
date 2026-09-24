/** Shared image decoding and the maths behind positioning a photo in a frame. */

/** An edit, stored as numbers rather than pixels. Nothing is ever re-encoded
 *  until export, so edits never compound and never lose quality.
 *  - x / y: pan, -1..1, where +/-1 is panned fully to that edge. Normalised so
 *    the same edit survives a change of frame size or aspect ratio.
 *  - scale: 1 exactly fills the frame; above that is zoomed in.
 *  - rotation: degrees. */
export type Transform = { x: number; y: number; scale: number; rotation: number };

export const IDENTITY: Transform = { x: 0, y: 0, scale: 1, rotation: 0 };

/** Smallest long edge we are willing to export, which is what caps zoom. */
export const MIN_OUTPUT_EDGE = 1080;

/** Decode once, respecting EXIF rotation. */
export async function toBitmap(file: File) {
    try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
        // Older Safari rejects the options object rather than ignoring it.
        return await createImageBitmap(file);
    }
}

export async function encodeAt(
    bitmap: ImageBitmap,
    maxEdge: number,
    quality: number,
    fallback: Blob,
) {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
    );
    // Release the canvas backing store on iOS, which does not always free it.
    canvas.width = 0;
    canvas.height = 0;

    return URL.createObjectURL(blob ?? fallback);
}

/** A sharper copy of one photo, made when the editor opens and released when it
 *  closes. One photo at full size is affordable; twenty would not be. */
export async function makeEditCopy(file: File, maxEdge: number) {
    const bitmap = await toBitmap(file);
    try {
        return await encodeAt(bitmap, maxEdge, 0.95, file);
    } finally {
        bitmap.close();
    }
}

/** How much larger than the frame the photo is drawn, per axis, at scale 1.
 *  The photo always covers the frame, so one axis is 1 and the other overflows. */
export function coverRatios(imageAspect: number, frameAspect: number) {
    return {
        width: Math.max(1, imageAspect / frameAspect),
        height: Math.max(1, frameAspect / imageAspect),
    };
}

/** Inline styles that place the photo in its frame. Everything is expressed in
 *  percentages of the frame, so it is independent of the frame's pixel size --
 *  the same numbers work for the small carousel and the big editor alike. */
export function frameStyles(
    raw: Transform,
    imageAspect: number,
    frameAspect: number,
): React.CSSProperties {
    const transform = resolveTransform(raw, imageAspect, frameAspect);
    const cover = coverRatios(imageAspect, frameAspect);
    const width = cover.width * transform.scale;
    const height = cover.height * transform.scale;

    // A CSS percentage translate is relative to the element's own size, so the
    // fraction of itself the photo must move to reach the frame's edge is
    // (1 - frame/photo) / 2.
    const shiftX = transform.x * (1 - 1 / width) * 50;
    const shiftY = transform.y * (1 - 1 / height) * 50;

    return {
        position: "absolute",
        left: "50%",
        top: "50%",
        width: `${width * 100}%`,
        height: `${height * 100}%`,
        transform: `translate(-50%, -50%) rotate(${transform.rotation}deg) translate(${shiftX}%, ${shiftY}%)`,
    };
}

/** The frame, rotated by -angle, grows to this axis-aligned box. Covering that
 *  box is what stops empty corners appearing when the photo is turned. */
function rotatedFrame(frameAspect: number, rotation: number) {
    const radians = (Math.abs(rotation) * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    // Frame normalised to width 1, so its height is 1 / aspect.
    const height = 1 / frameAspect;

    return { width: cos + height * sin, height: sin + height * cos };
}

/** The smallest scale that still covers the frame at this angle. Rotating
 *  therefore zooms in on its own; there is no way to turn a photo without it. */
export function minScaleFor(
    imageAspect: number,
    frameAspect: number,
    rotation: number,
) {
    const cover = coverRatios(imageAspect, frameAspect);
    const box = rotatedFrame(frameAspect, rotation);

    return Math.max(
        box.width / cover.width,
        (box.height * frameAspect) / cover.height,
    );
}

/** The photo's drawn size in pixels, and how far it can travel before a corner
 *  of the frame would be exposed. Gestures need real pixels; the stored
 *  transform is deliberately unitless. */
export function metrics(
    transform: Transform,
    imageAspect: number,
    frameAspect: number,
    frame: { width: number; height: number },
) {
    const cover = coverRatios(imageAspect, frameAspect);
    const width = frame.width * cover.width * transform.scale;
    const height = frame.height * cover.height * transform.scale;

    // Travel is measured along the photo's own axes, because the translate in
    // frameStyles is applied after the rotate.
    // rotatedFrame is normalised to a frame one unit wide, so both sides scale
    // by the frame's pixel width.
    const box = rotatedFrame(frameAspect, transform.rotation);
    const needWidth = frame.width * box.width;
    const needHeight = frame.width * box.height;

    return {
        width,
        height,
        roomX: Math.max(0, (width - needWidth) / 2),
        roomY: Math.max(0, (height - needHeight) / 2),
    };
}

/** Zooming in samples fewer source pixels, so the export gets smaller rather
 *  than blurrier. The cap is therefore about output size, not sharpness. */
export function maxScaleFor(
    source: { width: number; height: number },
    frameAspect: number,
) {
    const cover = coverRatios(source.width / source.height, frameAspect);
    const longestOutput = Math.max(
        source.width / cover.width,
        source.height / cover.height,
    );
    return Math.max(1, longestOutput / MIN_OUTPUT_EDGE);
}

/** Force a transform to be legal for the frame it is about to be drawn in:
 *  large enough to cover it at the current angle, and panned within bounds.
 *  Called on every render, which is what lets a stored edit survive a change of
 *  format -- it is re-clamped to the new frame rather than reset. */
export function resolveTransform(
    transform: Transform,
    imageAspect: number,
    frameAspect: number,
    maxScale = Infinity,
): Transform {
    const min = minScaleFor(imageAspect, frameAspect, transform.rotation);
    // Covering always wins: a quality ceiling never justifies a visible gap.
    const max = Math.max(min, maxScale);

    return {
        ...transform,
        scale: Math.min(Math.max(transform.scale, min), max),
        x: Math.min(Math.max(transform.x, -1), 1),
        y: Math.min(Math.max(transform.y, -1), 1),
    };
}
