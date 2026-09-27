import { dynaPuff } from "@/app/ui/fonts";

export default function Logo({ className = "text-3xl" }: { className?: string }) {
    return (
        <div
            className={`${dynaPuff.className} flex flex-row items-center leading-none text-logo`}
        >
            <p className={`font-semibold ${className}`}>PO-sition</p>
        </div>
    );
}
