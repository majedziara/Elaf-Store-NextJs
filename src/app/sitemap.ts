import type { MetadataRoute } from "next";
import { serverGet } from "@/lib/server";
import type { Product, PageData } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "http://localhost:3000";
  const entries: MetadataRoute.Sitemap = [
    "",
    "clothing",
    "intimates",
    "new-arrivals",
    "about",
    "contact",
    "faq",
    "size-fit",
    "shipping",
    "returns",
    "privacy",
    "terms",
  ].map((p) => ({ url: base + "/" + p }));
  try {
    let page = 1,
      last = 1;
    do {
      const d = await serverGet<PageData<Product>>(
        "products?per_page=48&page=" + page,
      );
      entries.push(
        ...d.data.map((p) => ({ url: base + "/products/" + p.slug })),
      );
      last = d.meta?.last_page || d.last_page || 1;
      page++;
    } while (page <= last && page <= 200);
  } catch {}
  return entries;
}
