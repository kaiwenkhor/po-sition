import type { MetadataRoute } from "next";

// Required by `output: export`: the manifest is a route, so it has to be
// declared static for the build to emit it as a file.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "PO-sition",
        short_name: "PO-sition",
        description:
            "A simple tool that allows you to reposition photos to your liking before posting them on social media.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#000000",
        icons: [
            {
                src: "/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
