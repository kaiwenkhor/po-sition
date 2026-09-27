"use client";

import { useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { usePhotos } from "@/app/ui/home/photo-context";
import { frameStyles } from "@/app/ui/home/image-utils";

export default function PhotoCarousel() {
    const { photos, selectedIndex, ratio, drag, select, openEditor } = usePhotos();
    const [emblaRef, embla] = useEmblaCarousel({
        align: "start",
        loop: false,
        containScroll: "trimSnaps",
    });

    // Swipe -> context. Guarded so the write below cannot bounce back.
    const onSelect = useCallback(() => {
        if (!embla) return;
        const index = embla.selectedScrollSnap();
        if (index !== selectedIndex) select(index);
    }, [embla, selectedIndex, select]);

    useEffect(() => {
        if (!embla) return;
        embla.on("select", onSelect);
        return () => {
            embla.off("select", onSelect);
        };
    }, [embla, onSelect]);

    // Thumbnail tap -> carousel. While a thumbnail is being dragged the index
    // changes with every slot crossed, so jump rather than animate: sliding
    // through the slides in between only shows blanks, because just the
    // neighbours of the selected slide hold an image.
    const isDragging = !!drag;
    useEffect(() => {
        if (!embla) return;
        if (embla.selectedScrollSnap() !== selectedIndex) {
            embla.scrollTo(selectedIndex, isDragging);
        }
    }, [embla, selectedIndex, isDragging]);

    // Embla measures on mount; the frame changes size when the ratio changes.
    useEffect(() => {
        embla?.reInit();
    }, [embla, ratio, photos.length]);

    // The frame fits inside the free space and centres. Container query units
    // are measured against the slide, so cqh is a real height: the frame is as
    // wide as the slide allows, or as wide as the height permits at this ratio,
    // whichever is smaller. Plain percentages resolve against width only.
    const frameStyle = {
        aspectRatio: String(ratio),
        width: `min(100cqw, calc(100cqh * ${ratio}))`,
    };

    return (
        <section aria-label="Photos" className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-hidden" ref={emblaRef}>
                <div className="flex h-full">
                    {photos.length === 0 ? (
                        <div className="flex h-full min-w-0 flex-[0_0_100%] items-center justify-center px-4 [container-type:size]">
                            <div
                                className="rounded-lg bg-foreground/20"
                                style={frameStyle}
                            />
                        </div>
                    ) : (
                        photos.map((photo, i) => (
                            <div
                                key={photo.id}
                                className="flex h-full min-w-0 flex-[0_0_100%] items-center justify-center px-4 [container-type:size]"
                            >
                                <button
                                    type="button"
                                    aria-label={`Edit photo ${i + 1}`}
                                    // Embla suppresses the click after a drag,
                                    // so a swipe cannot open the editor.
                                    onClick={() => openEditor(i)}
                                    className="relative block overflow-hidden rounded-lg bg-surface"
                                    style={frameStyle}
                                >
                                    {/* Embla keeps every slide mounted, so only
                                        the neighbours hold a decoded image. */}
                                    {Math.abs(i - selectedIndex) <= 1 && (
                                        // eslint-disable-next-line @next/next/no-img-element -- blob: URLs can't be optimized by next/image
                                        <img
                                            src={photo.displayUrl}
                                            alt=""
                                            decoding="async"
                                            draggable={false}
                                            className="pointer-events-none max-w-none select-none"
                                            style={frameStyles(
                                                photo.transform,
                                                photo.width / photo.height,
                                                ratio,
                                            )}
                                        />
                                    )}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
