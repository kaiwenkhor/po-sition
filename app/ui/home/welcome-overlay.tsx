"use client";

import Logo from "@/app/ui/logo";
import { fredoka } from "@/app/ui/fonts";
import { usePhotos } from "@/app/ui/home/photo-context";

/** The first thing anyone sees, and the empty state thereafter: with no photos
 *  there is nothing for the home screen to show, so it sits behind this. */
export default function WelcomeOverlay() {
    const { photos, progress, pickPhotos } = usePhotos();

    // Stays up while the first batch is decoding; the loading overlay sits
    // above it, so the home screen is never seen half-empty.
    if (photos.length > 0) return null;

    return (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-9 bg-background px-6">
            <Logo className="text-[40px]" />

            <button
                type="button"
                onClick={pickPhotos}
                disabled={!!progress}
                className={`${fredoka.className} flex h-12 w-[183px] items-center justify-center rounded-full bg-cta text-2xl font-medium text-cta-ink transition duration-150 active:duration-75 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-logo focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:active:scale-100`}
            >
                Add pics
            </button>
        </div>
    );
}
