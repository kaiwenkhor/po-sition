"use client";

import { useRef } from "react";
import { usePhotos } from "@/app/ui/home/photo-context";
import { PlusIcon } from "@heroicons/react/24/outline";

export default function PhotoStrip() {
    const { photos, selectedIndex, canAdd, addPhotos, select } = usePhotos();
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <footer className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-7">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                // sr-only, not hidden: iOS Safari will not open the picker for
                // an input that is display:none
                className="sr-only"
                onChange={(event) => {
                    addPhotos(Array.from(event.target.files ?? []));
                    // lets the same photo to be added again
                    event.target.value = "";
                }}
            />
            <ul className="-m-1 flex gap-1.5 overflow-x-auto p-1">
                {photos.map((photo, i) => (
                    <li key={photo.id} className="shrink-0">
                        <button
                            type="button"
                            aria-label={`Photo ${i + 1}`}
                            aria-current={i === selectedIndex}
                            onClick={() => select(i)}
                            className={`block h-12 w-9 overflow-hidden rounded-lg ${
                                i === selectedIndex
                                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                    : ""
                            }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element -- blob: URLs can't be optimized by next/image */}
                            <img
                                src={photo.url}
                                alt=""
                                className="size-full object-cover"
                            />
                        </button>
                    </li>
                ))}
                {canAdd && (
                    <li className="shrink-0">
                        <button
                            type="button"
                            aria-label="Add photos"
                            onClick={() => inputRef.current?.click()}
                            className="h-12 w-9 rounded-lg bg-add-btn p-2 text-add-btn-ink"
                        >
                            <PlusIcon
                                className="size-full"
                                strokeWidth={1.75}
                            />
                        </button>
                    </li>
                )}
            </ul>
        </footer>
    );
}
