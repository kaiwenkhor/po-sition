import { Metadata } from "next";
import Header from "@/app/ui/home/header";
import PhotoCarousel from "@/app/ui/home/photo-carousel";
import BottomControls from "@/app/ui/home/bottom-controls";
import PhotoStrip from "@/app/ui/home/photo-strip";
import LoadingOverlay from "@/app/ui/home/loading-overlay";
import PhotoEditor from "@/app/ui/home/photo-editor";
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
                    <BottomControls />
                </main>
                <PhotoStrip />
            </div>
            <PhotoEditor />
            <LoadingOverlay />
        </PhotoProvider>
    );
}
