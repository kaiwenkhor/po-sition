import { dynaPuff } from "@/app/ui/fonts";

export default function Logo() {
    return (
        <div
            className={`${dynaPuff.className} flex flex-row items-center leading-none text-foreground`}
        >
            <p className="text-[32px] font-semibold">PO-sition</p>
        </div>
    );
}