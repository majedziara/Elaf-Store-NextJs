import { privatePath, publicPages } from "./seo";

export const measurementId = process.env.NEXT_PUBLIC_GA_ID || "G-KXMX3VBRZ7";
export function analyticsPath(path: string): string | null {
  if (privatePath(path)) return null;
  if (Object.hasOwn(publicPages, path.replace(/^\//, "")) || /^\/products\/[a-z0-9_-]+\/?$/i.test(path)) return path;
  return null;
}
export function analyticsLocation(url: string): string | null {
  const parsed = new URL(url);
  const path = analyticsPath(parsed.pathname);
  return path ? parsed.origin + path : null;
}

export function analyticsReferrer(referrer: string): string {
  try {
    const parsed = new URL(referrer);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.origin + "/" : "";
  } catch {
    return "";
  }
}
