import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";
  const media = new URL(
    process.env.NEXT_PUBLIC_MEDIA_URL || "http://127.0.0.1:8000",
  ).origin;
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${media}`,
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    ...(!dev && process.env.APP_URL?.startsWith("https:")
      ? ["upgrade-insecure-requests"]
      : []),
  ].join("; ");
  const h = new Headers(request.headers);
  h.set("x-nonce", nonce);
  h.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: h } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!api/|_next/|images/|fonts/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
