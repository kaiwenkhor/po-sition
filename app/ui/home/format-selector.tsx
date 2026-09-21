import { fredoka } from "@/app/ui/fonts";

const formats = [
    { label: "Portrait", shape: "h-[30px] w-[21px] rounded-[6px]", active: true },
    { label: "Square", shape: "size-[30px] rounded-[6px]", active: false },
    { label: "Landscape", shape: "h-[14px] w-[30px] rounded-[4px]", active: false },
];

export default function FormatSelector() {
    return (
        <div className="flex shrink-0 gap-2 px-4 pt-7">
            {formats.map(({ label, shape, active }) => (
                <button
                    key={label}
                    type="button"
                    aria-pressed={active}
                    className={`${fredoka.className} flex h-12 shrink-0 items-center justify-center gap-2 rounded-[9px] border border-primary px-[7px] py-1.5 text-sm font-medium ${
                        active ? "bg-primary text-chip" : "bg-chip text-primary"
                    }`}
                >
                    <span className="flex items-center justify-center rounded-md bg-surface p-[3px]">
                        <span
                            className={`border-2 border-white bg-surface ${shape}`}
                        />
                    </span>
                    {label}
                </button>
            ))}
        </div>
    );
}
