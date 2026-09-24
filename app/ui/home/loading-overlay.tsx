"use client";

import { fredoka } from "@/app/ui/fonts";
import { usePhotos } from "@/app/ui/home/photo-context";

export default function LoadingOverlay() {
    const { progress } = usePhotos();

    if (!progress) return null;

    const { done, total } = progress;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy
            // Covers the app so a second pick, or a tap on a half-written
            // thumbnail, cannot land mid-run.
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-8 backdrop-blur-sm"
        >
            {/* Card */}
            <div className="flex w-full max-w-[220px] flex-col items-center gap-4 rounded-2xl border-[2px] border-chip-ink/25 bg-chip px-6 py-7">
                {/* Circle */}
                {/* animate-spin rotates with a transform, so it keeps moving on
                    the compositor while the main thread encodes images. */}
                <span className="size-9 animate-spin rounded-full border-[3px] border-chip-ink/25 border-t-chip-ink" />

                <p
                    className={`${fredoka.className} text-base font-medium text-chip-ink`}
                >
                    Adding {done} of {total}
                </p>
                
                {/* Bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-chip-ink/20">
                    <div
                        className="h-full rounded-full bg-chip-ink transition-[width] duration-200 ease-out"
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
