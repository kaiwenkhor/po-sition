import { Metadata } from "next";
import Header from "@/app/ui/home/header";
import PhotoCarousel from "@/app/ui/home/photo-carousel";
import FormatSelector from "@/app/ui/home/format-selector";
import PhotoStrip from "@/app/ui/home/photo-strip";
import { PhotoProvider } from "@/app/ui/home/photo-context";

export const metadata: Metadata = {
    title: "Home",
};

export default function Page() {
    return (
        <PhotoProvider>
            <div className="flex h-dvh flex-col overflow-hidden">
                <Header />
                <main className="flex min-h-0 flex-1 flex-col">
                    <PhotoCarousel />
                    <FormatSelector />
                </main>
                <PhotoStrip />
            </div>
        </PhotoProvider>
    );
}
