import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Lets the dev server serve dev-only assets to phones on the LAN
    allowedDevOrigins: ["192.168.1.214"],
    // The default bottom-right badge sits on top of the editor's Done button
    // and swallows taps. Only affects development.
    devIndicators: { position: "top-left" },
};

export default nextConfig;
