import type { Metadata } from "next";
import type { Product, Row } from "./types";

export const siteName = "Nella & Vale";
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://elaf-store.vercel.app").replace(/\/+$/, "");
export const defaultDescription = "Discover Nella & Vale women’s clothing and intimates. Explore everyday styles, choose your colour and size, and shop securely in USD.";
export const socialImage = { url: "/images/editorial-hero.png", width: 512, height: 279, alt: "Nella & Vale clothing and intimates" };
export const publicPages: Record<string, { title: string; description: string }> = {
  "": { title: "Everyday Clothing & Intimates", description: defaultDescription },
  clothing: { title: "Everyday Clothing", description: "Explore Nella & Vale women’s clothing. Discover everyday styles and find the colours and sizes that fit your wardrobe." },
  intimates: { title: "Women’s Intimates", description: "Explore Nella & Vale intimates, including available bralettes and briefs. Choose your colour and size and view current availability." },
  "new-arrivals": { title: "New Arrivals", description: "Discover the latest additions to Nella & Vale. Browse women’s clothing and intimates, with available colours, sizes, and prices in USD." },
  about: { title: "About Nella & Vale", description: "Get to know Nella & Vale, an online store for women’s everyday clothing and intimates." },
  contact: { title: "Contact Customer Care", description: "Contact Nella & Vale customer care for questions about the collection, your order, sizing, shipping, and returns." },
  faq: { title: "Frequently Asked Questions", description: "Find answers to common Nella & Vale questions about shopping, payment, orders, and customer care." },
  "size-fit": { title: "Size & Fit Guide", description: "Choose your Nella & Vale size with product size guides and fit information for women’s clothing and intimates." },
  shipping: { title: "Shipping Information", description: "Review Nella & Vale shipping information and delivery policies before placing your order." },
  returns: { title: "Returns & Exchanges", description: "Read Nella & Vale return and exchange policies and learn how to request help with your order." },
  privacy: { title: "Privacy Policy", description: "Read how Nella & Vale handles personal information, account details, and online shopping data." },
  terms: { title: "Terms of Service", description: "Review the terms of shopping with Nella & Vale, including orders, payment, and store services." },
};

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl + "/").href;
}

export function privatePath(path: string): boolean {
  return /^\/(?:api|admin|account|orders|checkout)(?:\/|$)/.test(path) ||
    /^\/(?:bag|guest-order|sign-in|admin-sign-in|create-account|forgot-password|reset-password|verify-email|change-email)(?:\/|$)/.test(path) ||
    /^\/returns\//.test(path);
}

export function plainDescription(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
  return (text || fallback).slice(0, 160);
}

export function pageMetadata(path: string, title: string, description: string, index = true): Metadata {
  const url = absoluteUrl(path);
  return {
    title, description,
    alternates: index ? { canonical: url } : undefined,
    robots: { index, follow: !privatePath(path) },
    openGraph: { type: "website", siteName, locale: "en_US", title, description, url, images: [socialImage] },
    twitter: { card: "summary_large_image", title, description, images: [absoluteUrl(socialImage.url)] },
  };
}

export function productMetadata(product: Product): Metadata {
  const title = product.seo_title || product.name;
  const description = plainDescription(product.seo_description || product.description, `Shop ${product.name} at Nella & Vale. View available colours, sizes, current prices, and product details.`);
  const metadata = pageMetadata("/products/" + encodeURIComponent(product.slug), title, description);
  if (product.images.length) {
    const images = product.images.map(image => ({ url: image.url, alt: image.alt || product.name }));
    metadata.openGraph = { ...metadata.openGraph, images };
    metadata.twitter = { ...metadata.twitter, images: images.map(image => image.url) };
  }
  return metadata;
}

export function productSchema(product: Product): Row {
  const url = absoluteUrl("/products/" + encodeURIComponent(product.slug));
  return {
    "@context": "https://schema.org", "@type": "Product", "@id": url + "#product", url,
    name: product.name, description: plainDescription(product.description, product.name),
    brand: { "@type": "Brand", name: siteName },
    ...(product.category ? { category: product.category.name } : {}),
    ...(product.images.length ? { image: product.images.map(image => image.url) } : {}),
    offers: product.variants.map(variant => ({
      "@type": "Offer", url, sku: variant.sku,
      priceCurrency: product.currency, price: (variant.price_cents / 100).toFixed(2),
      availability: variant.available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": absoluteUrl("/#organization") },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): Row {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({
    "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.path),
  })) };
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0"));
}
