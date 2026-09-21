"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export const MAX_PHOTOS = 20;

export type Format = "portrait" | "square" | "landscape";
export type Photo = { id: string; url: string; name: string };

type PhotoContextValue = {
    photos: Photo[];
    selectedIndex: number;
    format: Format;
    canAdd: boolean;
    addPhotos: (files: File[]) => void;
    select: (index: number) => void;
    setFormat: (format: Format) => void;
};

const PhotoContext = createContext<PhotoContextValue | null>(null);

// crypto.randomUUID() only exists in secure contexts, so it is undefined when
// the dev server is opened over a LAN IP (http://192.168.x.x) from a phone.
let idCounter = 0;
function createId() {
    return `photo-${Date.now().toString(36)}-${idCounter++}`;
}

export function PhotoProvider({ children }: { children: React.ReactNode }) {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [format, setFormat] = useState<Format>("portrait");

    function addPhotos(files: File[]) {
        const room = MAX_PHOTOS - photos.length;
        const added = files.slice(0, room).map((file) => ({
            id: createId(),
            url: URL.createObjectURL(file),
            name: file.name,
        }));
        setPhotos([...photos, ...added]);
    }

    // Free browser memory when app closes. The ref is updated in an effect,
    // never during render, so the cleanup always sees the latest list.
    const latest = useRef(photos);
    useEffect(() => {
        latest.current = photos;
    }, [photos]);
    useEffect(() => {
        return () => latest.current.forEach((p) => URL.revokeObjectURL(p.url));
    }, []);

    return (
        <PhotoContext.Provider
            value={{
                photos,
                selectedIndex,
                format,
                canAdd: photos.length < MAX_PHOTOS,
                addPhotos,
                select: setSelectedIndex,
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
        throw new Error("usePhotos must be used inside <PhotoProvided>");
    }

    return context;
}
