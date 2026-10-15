import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
import { serverGet } from "@/lib/server";
import type { Product, PageData, Row } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    "", "clothing", "intimates", "new-arrivals", "about", "contact", "size-fit",
  ].map(path => ({ url: siteUrl + "/" + path }));
  const [settings, faqs] = await Promise.all([
    serverGet<{ data: Row }>("settings"),
    serverGet<{ data: Row[] }>("faqs"),
  ]);
  if (faqs.data.length) {
    entries.push({ url: siteUrl + "/faq" });
  }
  const policies = await Promise.all(
    ["shipping", "returns", "privacy", "terms"].map(async slug => {
      const page = await serverGet<{ data: Row }>("pages/" + slug).catch(error => {
        if (error.status === 404) return null;
        throw error;
      });
      const fallback = slug === "shipping" ? settings.data.shipping_policy
        : slug === "returns" ? settings.data.return_policy : null;
      return page || fallback ? { url: siteUrl + "/" + slug } : null;
    }),
  );
  for (const policy of policies) {
    if (policy) entries.push(policy);
  }
  let page = 1;
  let lastPage = 1;
  do {
    const products = await serverGet<PageData<Product>>(
      "products?per_page=48&page=" + page,
    );
    entries.push(...products.data.map(product => ({
      url: siteUrl + "/products/" + encodeURIComponent(product.slug),
    })));
    lastPage = products.meta?.last_page || products.last_page || 1;
    page++;
  } while (page <= lastPage && page <= 200);
  return entries;
}
