import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Lets the dev server serve dev-only assets to phones on the LAN
    allowedDevOrigins: ["192.168.1.214"],
    turbopack: {
        rules: {
            // Import .svg files as React components
            "*.svg": {
                loaders: [
                    {
                        loader: "@svgr/webpack",
                        options: {
                            // Keep viewBox so icons scale with size-* classes
                            svgoConfig: {
                                plugins: [
                                    {
                                        name: "preset-default",
                                        params: {
                                            overrides: { removeViewBox: false },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
                as: "*.js",
            },
        },
    },
};

export default nextConfig;
