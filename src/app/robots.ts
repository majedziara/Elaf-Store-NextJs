import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL || "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/account",
        "/orders/",
        "/checkout",
        "/bag",
        "/guest-order",
        "/sign-in",
        "/create-account",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/change-email",
        "/returns/",
      ],
    },
    sitemap: base + "/sitemap.xml",
  };
}
