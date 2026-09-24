import type { Metadata, Viewport } from "next";
import "@/app/ui/globals.css";
import { dynaPuff } from "@/app/ui/fonts";

export const metadata: Metadata = {
    title: {
        template: "%s | PO-sition",
        default: "PO-sition",
    },
    description:
        "A simple tool that allows you to reposition photos and videos to your liking before posting them on social media.",
    appleWebApp: {
        capable: true,
        title: "PO-sition",
        statusBarStyle: "default",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
        { media: "(prefers-color-scheme: dark)", color: "#141414" },
    ],
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en">
            <body className={`${dynaPuff.className} antialiased min-h-dvh`}>
                {children}
            </body>
        </html>
    );
}
