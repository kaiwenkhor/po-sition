"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
    IDENTITY,
    encodeAt,
    toBitmap,
    type Transform,
} from "@/app/ui/home/image-utils";

export const MAX_PHOTOS = 20;

// A browser keeps width * height * 4 bytes for every decoded image, however
// small the file or the box it is drawn in. A 12MP phone photo costs ~49MB, so
// 20 of them shown twice would be ~2GB and the device starts painting black
// rectangles. We therefore display downscaled copies and keep the original File
// for export.
const DISPLAY_MAX_EDGE = 1200;
const THUMB_MAX_EDGE = 200;

// One crop ratio for every photo at once. `ratio` feeds CSS aspect-ratio.
export const FORMATS = [
    { key: "3:4", label: "3 : 4", ratio: 3 / 4 },
    { key: "4:5", label: "4 : 5", ratio: 4 / 5 },
    { key: "1:1", label: "1 : 1", ratio: 1 },
    { key: "16:9", label: "16 : 9", ratio: 16 / 9 },
] as const;

export type Format = (typeof FORMATS)[number]["key"];
export type Photo = {
    id: string;
    name: string;
    /** The untouched original, kept for full-quality export. */
    file: File;
    displayUrl: string;
    thumbUrl: string;
    /** Natural pixel size of the original, after EXIF rotation. */
    width: number;
    height: number;
    transform: Transform;
};

export type Progress = { done: number; total: number };

/** A thumbnail being dragged out of the strip. `overDelete` drives the drop
 *  target's highlight, and is only written when it actually changes. */
export type Drag = { index: number; overDelete: boolean };

type PhotoContextValue = {
    photos: Photo[];
    progress: Progress | null;
    selectedIndex: number;
    format: Format;
    ratio: number;
    canAdd: boolean;
    drag: Drag | null;
    editingIndex: number | null;
    addPhotos: (files: File[]) => void;
    openEditor: (index: number) => void;
    closeEditor: () => void;
    setTransform: (index: number, transform: Transform) => void;
    removePhoto: (index: number) => void;
    movePhoto: (from: number, to: number) => void;
    select: (index: number) => void;
    setDrag: (drag: Drag | null) => void;
    setFormat: (format: Format) => void;
};

const PhotoContext = createContext<PhotoContextValue | null>(null);

// crypto.randomUUID() only exists in secure contexts, so it is undefined when
// the dev server is opened over a LAN IP (http://192.168.x.x) from a phone.
let idCounter = 0;
function createId() {
    return `photo-${Date.now().toString(36)}-${idCounter++}`;
}

/** Decode the original once, then write both copies from that single bitmap. */
async function makeCopies(file: File) {
    const bitmap = await toBitmap(file);
    try {
        return {
            displayUrl: await encodeAt(bitmap, DISPLAY_MAX_EDGE, 0.92, file),
            thumbUrl: await encodeAt(bitmap, THUMB_MAX_EDGE, 0.8, file),
            // Natural size drives both the cover maths and the zoom ceiling.
            width: bitmap.width,
            height: bitmap.height,
        };
    } finally {
        bitmap.close();
    }
}

export function PhotoProvider({ children }: { children: React.ReactNode }) {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [progress, setProgress] = useState<Progress | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [drag, setDrag] = useState<Drag | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [format, setFormat] = useState<Format>("3:4");

    async function addPhotos(files: File[]) {
        const room = Math.max(0, MAX_PHOTOS - photos.length);
        const queue = files.slice(0, room);
        if (queue.length === 0) return;

        setProgress({ done: 0, total: queue.length });

        // One at a time: each source photo is briefly decoded at full size, so
        // processing in parallel would spike memory exactly as we are avoiding.
        try {
            for (const [i, file] of queue.entries()) {
                const copies = await makeCopies(file);
                const photo = {
                    id: createId(),
                    name: file.name,
                    file,
                    transform: IDENTITY,
                    ...copies,
                };

                setPhotos((current) =>
                    current.length >= MAX_PHOTOS ? current : [...current, photo],
                );
                setProgress({ done: i + 1, total: queue.length });
            }
        } finally {
            setProgress(null);
        }
    }

    function removePhoto(index: number) {
        const photo = photos[index];
        if (!photo) return;

        // Both copies hold memory until released. The original File is only
        // referenced by this object, so dropping it is enough.
        URL.revokeObjectURL(photo.displayUrl);
        URL.revokeObjectURL(photo.thumbUrl);

        setPhotos((current) => current.filter((_, i) => i !== index));
        setSelectedIndex((current) => {
            // Removing something earlier in the list shifts everything after it.
            const shifted = current > index ? current - 1 : current;
            return Math.max(0, Math.min(shifted, photos.length - 2));
        });
    }

    function setTransform(index: number, transform: Transform) {
        setPhotos((current) =>
            current.map((photo, i) => (i === index ? { ...photo, transform } : photo)),
        );
    }

    /** Reorder in place. The selection is an index, so it has to be remapped or
     *  the highlight would jump to whichever photo landed in that slot. */
    function movePhoto(from: number, to: number) {
        if (from === to) return;

        setPhotos((current) => {
            const next = [...current];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });

        setSelectedIndex((current) => {
            if (current === from) return to;
            if (from < current && current <= to) return current - 1;
            if (to <= current && current < from) return current + 1;
            return current;
        });
    }

    // Free browser memory when the app closes. The ref is updated in an effect,
    // never during render, so the cleanup always sees the latest list.
    const latest = useRef(photos);
    useEffect(() => {
        latest.current = photos;
    }, [photos]);
    useEffect(() => {
        return () =>
            latest.current.forEach((photo) => {
                URL.revokeObjectURL(photo.displayUrl);
                URL.revokeObjectURL(photo.thumbUrl);
            });
    }, []);

    return (
        <PhotoContext.Provider
            value={{
                photos,
                progress,
                selectedIndex,
                format,
                ratio: FORMATS.find((f) => f.key === format)!.ratio,
                canAdd: photos.length < MAX_PHOTOS,
                drag,
                editingIndex,
                addPhotos,
                openEditor: setEditingIndex,
                closeEditor: () => setEditingIndex(null),
                setTransform,
                removePhoto,
                movePhoto,
                select: setSelectedIndex,
                setDrag,
                setFormat,
            }}
        >
            {children}
        </PhotoContext.Provider>
    );
}

export function usePhotos() {
    const context = useContext(PhotoContext);

    if (!context) {
        throw new Error("usePhotos must be used inside <PhotoProvider>");
    }

    return context;
}
