import type { NextConfig } from "next";
const mediaOrigin = new URL(process.env.NEXT_PUBLIC_MEDIA_URL || "http://127.0.0.1:8000");
const config: NextConfig = {
  images: {
    localPatterns: [{ pathname: "/images/**", search: "" }],
    remotePatterns: [{ protocol: mediaOrigin.protocol === "https:" ? "https" : "http", hostname: mediaOrigin.hostname, port: mediaOrigin.port, pathname: "/storage/**", search: "" }],
    qualities: [75, 90],
    formats: ["image/webp"],
    maximumRedirects: 0,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
            : []),
        ],
      },
    ];
  },
};
export default config;
