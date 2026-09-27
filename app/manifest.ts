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
        background_color: "#fafafa",
        theme_color: "#fafafa",
        icons: [
            {
                src: "/position-logo-192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/position-logo-512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
