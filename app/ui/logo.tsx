import { dynaPuff } from "@/app/ui/fonts";

export default function Logo() {
    return (
        <div
            className={`${dynaPuff.className} flex flex-row items-center leading-none text-logo`}
        >
            <p className="text-3xl font-semibold">PO-sition</p>
        </div>
    );
}
