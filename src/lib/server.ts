import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { User } from "./types";
export const cookieNames = { cart: "nv_cart", orders: "nv_orders" };
export const isLaravelCookie = (name: string) =>
  name === config().session ||
  name === "XSRF-TOKEN" ||
  /^remember_web_[a-f0-9]{40}$/i.test(name);
export function config() {
  const base = new URL(process.env.LARAVEL_API_URL || "http://127.0.0.1:8000");
  const app = new URL(process.env.APP_URL || "http://localhost:3000");
  if (
    !["https:", "http:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/"
  )
    throw new Error("LARAVEL_API_URL must be an origin.");
  const local = (u: URL) =>
    ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (
    process.env.NODE_ENV === "production" &&
    ((base.protocol !== "https:" && !local(base)) ||
      (app.protocol !== "https:" && !local(app)))
  )
    throw new Error("HTTPS is required for public production origins.");
  return {
    base: base.origin,
    app: app.origin,
    session: process.env.LARAVEL_SESSION_COOKIE || "nv_session",
    secure: app.protocol === "https:",
  };
}
function key() {
  const raw = process.env.APP_COOKIE_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(raw))
    throw new Error("Set APP_COOKIE_KEY to 32 random bytes as hex.");
  return Buffer.from(raw, "hex");
}
export function seal(data: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const b = Buffer.concat([c.update(JSON.stringify(data), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), b]).toString("base64url");
}
export function unseal<T>(value: string | undefined): T | null {
  if (!value) return null;
  try {
    const b = Buffer.from(value, "base64url");
    const d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"),
    ) as T;
  } catch {
    return null;
  }
}
export const serverGet = cache(async function serverGet<T>(
  path: string,
  authenticated = false,
): Promise<T> {
  const cfg = config();
  const h = new Headers({
    Accept: "application/json",
    Origin: cfg.app,
    Referer: cfg.app + "/",
  });
  if (authenticated) {
    const jar = await cookies();
    h.set(
      "Cookie",
      jar
        .getAll()
        .filter((c) => isLaravelCookie(c.name))
        .map((c) => `${c.name}=${c.value}`)
        .join("; "),
    );
  }
  const publicContent = !authenticated && /^(settings|categories|collections|faqs|pages\/[a-z0-9-]+)$/.test(path);
  const res = await fetch(cfg.base + "/api/v1/" + path, {
    headers: h,
    ...(publicContent ? { cache: "force-cache" as const, next: { revalidate: 60, tags: ["store-content"] } } : { cache: "no-store" as const }),
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok)
    throw Object.assign(
      new Error(
        res.status === 404
          ? "Not found"
          : "The store is temporarily unavailable.",
      ),
      { status: res.status },
    );
  return (await res.json()) as T;
});
export async function serverUser(): Promise<User | null> {
  try {
    return (await serverGet<{ data: User }>("auth/me", true)).data;
  } catch (e) {
    if ((e as { status?: number }).status === 401) return null;
    throw e;
  }
}
