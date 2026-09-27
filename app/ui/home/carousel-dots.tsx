"use client";

import { usePhotos } from "@/app/ui/home/photo-context";

/** Lives outside the carousel so the bottom of the screen can be rearranged
 *  without touching the Embla viewport. Height: 18px pad + 6px dot = 24px. */
export default function CarouselDots() {
    const { photos, selectedIndex } = usePhotos();

    return (
        <div className="flex shrink-0 justify-center gap-1.5 pt-[18px]">
            {(photos.length === 0 ? [0] : photos).map((_, i) => (
                <span
                    key={i}
                    className={`size-1.5 rounded-full ${
                        i === selectedIndex ? "bg-primary" : "bg-surface-strong/50"
                    }`}
                />
            ))}
        </div>
    );
}
