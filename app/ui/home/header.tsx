import Logo from "@/app/ui/logo";
import { 
    ArrowDownTrayIcon, 
    SunIcon, 
    MoonIcon, 
} from "@heroicons/react/24/outline";

// TODO: Implement dark mode logic
const isDark = false;

const actions = [
    { 
        label: "Toggle light/dark mode", 
        Icon: isDark ? MoonIcon : SunIcon,
        iconClass: "",
    },
    { 
        label: "Download", 
        Icon: ArrowDownTrayIcon, 
        iconClass: "p-0.5",
    },
];

export default function Header() {
    return (
        <header className="flex shrink-0 items-center justify-between px-4 pb-7 pt-[calc(env(safe-area-inset-top)+24px)]">
            <Logo />
            <div className="flex gap-3">
                {actions.map(({ label, Icon, iconClass }) => (
                    <button
                        key={label}
                        type="button"
                        aria-label={label}
                        className="size-11 rounded-full bg-soft p-2 text-primary"
                    >
                        <Icon className={`size-full ${iconClass}`} strokeWidth={1.75}/>
                    </button>
                ))}
            </div>
        </header>
    );
}
