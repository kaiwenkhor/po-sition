"use client";

import { useRef, useState } from "react";
import Logo from "@/app/ui/logo";
import { usePhotos } from "@/app/ui/home/photo-context";
import { exportPhotos } from "@/app/ui/home/export";
import {
    ArrowDownTrayIcon,
    SunIcon, 
} from "@heroicons/react/24/outline";
import { MoonIcon } from "@heroicons/react/24/solid";

/** Spacing between downloads in the no-share-sheet fallback. */
const DOWNLOAD_GAP_MS = 350;

const iconButton =
    "theme-instant size-11 rounded-full bg-icon-btn p-2 text-icon-btn-ink " +
    // Same press mechanic as the editor's round buttons: snap in, ease out.
    "transition duration-150 active:duration-75 active:scale-90 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The theme in force right now: the override if one is set, else the system. */
function currentTheme() {
    const forced = document.documentElement.dataset.theme;
    if (forced === "light" || forced === "dark") return forced;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

const TRANSITION_MS = 260;

export default function Header() {
    const { photos, ratio, progress, setProgress } = usePhotos();
    // Held when the share sheet could not be opened straight away, so a second
    // tap can hand over the files that are already rendered.
    const [pending, setPending] = useState<File[] | null>(null);

    async function share(files: File[]) {
        if (navigator.canShare?.({ files })) {
            await navigator.share({ files, title: "PO-sition" });
            return;
        }
        // No share sheet: fall back to downloads, numbered so the order
        // survives anywhere that sorts by filename.
        for (const [i, file] of files.entries()) {
            // Requesting them all in one task makes browsers coalesce the
            // downloads and keep only the last, so each one gets its own turn.
            if (i > 0) await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_GAP_MS));

            const url = URL.createObjectURL(file);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.name;
            // Some browsers ignore a click on an anchor that is not in the
            // document, so it has to be attached for the moment it is used.
            link.style.display = "none";
            document.body.append(link);
            link.click();
            link.remove();

            // Revoking in the same tick can cancel the download before the
            // browser has read the blob.
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
        }
    }

    async function download() {
        if (pending) {
            // Second tap: user activation is fresh, so this one will be allowed.
            const files = pending;
            setPending(null);
            await share(files);
            return;
        }
        if (photos.length === 0 || progress) return;

        setProgress({ done: 0, total: photos.length, label: "Exporting" });
        try {
            const files = await exportPhotos(photos, ratio, (done) =>
                setProgress({ done, total: photos.length, label: "Exporting" }),
            );
            setProgress(null);
            try {
                await share(files);
            } catch (error) {
                // Safari refuses a share that is no longer tied to a tap, and
                // rendering takes long enough to lose that. Keep the files and
                // let the next tap send them.
                if ((error as Error)?.name === "NotAllowedError") setPending(files);
            }
        } finally {
            setProgress(null);
        }
    }

    const endTransition = useRef<ReturnType<typeof setTimeout> | null>(null);

    function toggleTheme() {
        const root = document.documentElement;
        const next = currentTheme() === "dark" ? "light" : "dark";

        root.classList.add("theme-transition");
        // A transition only runs if it is already in the style the change starts
        // from, so flush the new rule before swapping the theme.
        void root.offsetHeight;

        root.dataset.theme = next;

        if (endTransition.current) clearTimeout(endTransition.current);
        endTransition.current = setTimeout(
            () => root.classList.remove("theme-transition"),
            TRANSITION_MS,
        );

        // Next renders one theme-color meta per scheme. Giving both the chosen
        // colour keeps the phone's status bar in step with the override.
        const colour = next === "dark" ? "#141414" : "#fafafa";
        document
            .querySelectorAll('meta[name="theme-color"]')
            .forEach((meta) => meta.setAttribute("content", colour));
    }

    return (
        <header className="flex shrink-0 items-center justify-between px-4 pb-5 pt-[calc(env(safe-area-inset-top)+6px)] sm:pt-[calc(env(safe-area-inset-top)+16px)]">
            <Logo />
            <div className="flex gap-3">
                <button
                    type="button"
                    aria-label="Toggle light and dark theme"
                    onClick={toggleTheme}
                    className={iconButton}
                >
                    {/* Both icons render; CSS shows the one matching the theme.
                        Choosing in JS would need the system preference, which
                        the server cannot know, and would mismatch on hydration. */}
                    <SunIcon className="size-full dark:hidden" strokeWidth={1.75} />
                    <MoonIcon
                        className="hidden size-full dark:block"
                        strokeWidth={1.75}
                    />
                </button>

                <button
                    type="button"
                    aria-label={pending ? "Save photos" : "Download"}
                    onClick={download}
                    disabled={photos.length === 0}
                    className={`${iconButton} disabled:opacity-40 disabled:active:scale-100`}
                >
                    <ArrowDownTrayIcon
                        className="size-full p-0.5"
                        strokeWidth={1.75}
                    />
                </button>
            </div>
        </header>
    );
}
