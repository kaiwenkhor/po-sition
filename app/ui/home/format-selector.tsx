import { fredoka } from "@/app/ui/fonts";
import PortraitIcon from "@/app/ui/icons/portrait.svg";
import SquareIcon from "@/app/ui/icons/square.svg";
import LandscapeIcon from "@/app/ui/icons/landscape.svg";

type State = "default" | "selected" | "disabled";

// The icon's fill follows the text colour; its ring matches the chip's fill,
// which is what makes the ring read as a gap. Default is the only state with a
// border, so it pads 7px instead of 8px to keep every chip the same width.
const stateStyles: Record<State, string> = {
    default:
        "border border-chip-ink bg-chip px-[7px] text-chip-ink [&_.icon-ring]:stroke-chip",
    selected: "bg-chip-ink px-2 text-chip [&_.icon-ring]:stroke-chip-ink",
    disabled:
        "bg-chip-disabled px-2 text-chip-disabled-ink [&_.icon-ring]:stroke-chip-disabled",
};

const formats: { label: string; Icon: React.FC; state: State }[] = [
    {
        label: "Portrait",
        Icon: PortraitIcon,
        state: "selected",
    },
    {
        label: "Square",
        Icon: SquareIcon,
        state: "default",
    },
    {
        label: "Landscape",
        Icon: LandscapeIcon,
        state: "default",
    },
];

export default function FormatSelector() {
    return (
        <div className="flex shrink-0 gap-2 overflow-x-auto overscroll-x-contain px-4 pt-7 [scrollbar-width:none]">
            {formats.map(({ label, Icon, state }) => (
                <button
                    key={label}
                    type="button"
                    aria-pressed={state === "selected"}
                    disabled={state === "disabled"}
                    className={`${fredoka.className} flex h-12 shrink-0 items-center justify-center gap-2 rounded-[9px] py-1.5 text-sm font-medium ${stateStyles[state]}`}
                >
                    <Icon aria-hidden />
                    {label}
                </button>
            ))}
        </div>
    );
}
