import Logo from "@/app/ui/logo";
import { ArrowDownTrayIcon, SunIcon } from "@heroicons/react/24/outline";

const actions = [
    { label: "Toggle light/dark mode", Icon: SunIcon },
    { label: "Download", Icon: ArrowDownTrayIcon },
];

export default function Header() {
    return (
        <header className="flex shrink-0 items-center justify-between px-4 pb-7 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
            <Logo />
            <div className="flex gap-2">
                {actions.map(({ label, Icon }) => (
                    <button
                        key={label}
                        type="button"
                        aria-label={label}
                        className="size-11 rounded-full bg-primary-soft p-2 text-primary"
                    >
                        <Icon className="size-7" />
                    </button>
                ))}
            </div>
        </header>
    );
}
