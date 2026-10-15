import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/admin-sign-in",
        "/search",
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
