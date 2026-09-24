"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { usePhotos } from "@/app/ui/home/photo-context";

/** The id lets the strip find this element's box while a finger is moving. */
export const DELETE_TARGET_ID = "delete-target";

/** Matches the combined height of the dots (18px pad + 6px dot) and the format
 *  row (24px pad + 48px button) it stands in for: 24 + 72 = 96px. Centring the
 *  button in that space lifts it away from the strip, so letting go early
 *  during a reorder drag does not land on delete. */
export default function DeleteTarget() {
    const { drag } = usePhotos();
    const armed = drag?.overDelete ?? false;

    return (
        <div className="flex h-24 shrink-0 items-center justify-center px-4">
            <div
                id={DELETE_TARGET_ID}
                aria-hidden
                className={`flex size-12 items-center justify-center rounded-[8px] transition-colors ${
                    armed ? "bg-danger text-danger-ink" : "bg-danger/15 text-danger"
                }`}
            >
                <TrashIcon className="size-6" strokeWidth={1.75} />
            </div>
        </div>
    );
}
