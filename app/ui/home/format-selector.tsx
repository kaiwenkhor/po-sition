"use client";

import { fredoka } from "@/app/ui/fonts";
import { FORMATS, usePhotos } from "@/app/ui/home/photo-context";

// A wide button needs a gentler press than the editor's round ones: 90% reads
// as a lurch across 80-odd pixels, where 95% still registers as a press.
const pressable =
    "transition duration-150 active:duration-75 active:scale-95 focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-background";

// Default is the only state with a border, so it pads 1px less to keep every
// button the same size.
const stateStyles = {
    default: " px-[7px] border border-chip-ink bg-chip text-chip-ink hover:bg-chip-ink hover:text-chip active:bg-chip-ink active:text-chip",
    selected: "bg-chip-ink px-2 text-chip",
    disabled: "bg-chip-disabled px-2 text-chip-disabled-ink",
} as const;

export default function FormatSelector() {
    const { photos, format, setFormat } = usePhotos();
    const disabled = photos.length === 0;

    return (
        <div className="flex shrink-0 gap-2 px-4 pt-6">
            {FORMATS.map(({ key, label }) => {
                const state = disabled
                    ? "disabled"
                    : key === format
                      ? "selected"
                      : "default";

                return (
                    <button
                        key={key}
                        type="button"
                        aria-pressed={key === format}
                        disabled={disabled}
                        onClick={() => setFormat(key)}
                        className={`${fredoka.className} flex h-12 flex-1 items-center justify-center rounded-[8px] py-1.5 text-base font-medium ${pressable} ${stateStyles[state]}`}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
