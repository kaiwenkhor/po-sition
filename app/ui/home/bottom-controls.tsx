"use client";

import CarouselDots from "@/app/ui/home/carousel-dots";
import DeleteTarget from "@/app/ui/home/delete-target";
import FormatSelector from "@/app/ui/home/format-selector";
import { usePhotos } from "@/app/ui/home/photo-context";

/** Everything between the photo and the strip. Dragging a thumbnail replaces
 *  the dots and the ratio buttons with the drop target, which is centred over
 *  the whole region so it sits well clear of the strip. Both states are the
 *  same height, so the photo above never resizes mid-drag. */
export default function BottomControls() {
    const { drag } = usePhotos();

    if (drag) return <DeleteTarget />;

    return (
        <>
            <CarouselDots />
            <FormatSelector />
        </>
    );
}
