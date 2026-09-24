"use client";

import { useRef } from "react";
import Logo from "@/app/ui/logo";
import {
    ArrowDownTrayIcon,
    SunIcon,
    MoonIcon,
} from "@heroicons/react/24/outline";

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
        <header className="flex shrink-0 items-center justify-between px-4 pb-5 pt-[calc(env(safe-area-inset-top)+6px)]">
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
                    aria-label="Download"
                    className={iconButton}
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
