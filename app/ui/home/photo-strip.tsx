import { PlusIcon } from "@heroicons/react/24/outline";

const thumbnails = [0, 1, 2, 3];

export default function PhotoStrip() {
    return (
        <footer className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-7">
            <ul className="flex gap-1.5 overflow-x-auto">
                {thumbnails.map((thumbnail) => (
                    <li
                        key={thumbnail}
                        className="h-12 w-9 shrink-0 rounded-lg bg-surface-strong"
                    />
                ))}
                <li className="shrink-0">
                    <button
                        type="button"
                        aria-label="Add photo"
                        className="flex h-12 w-9 items-center justify-center rounded-lg bg-surface-strong text-surface"
                    >
                        <PlusIcon className="size-5" />
                    </button>
                </li>
            </ul>
        </footer>
    );
}
