import "server-only";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { config, cookieNames, seal, unseal, isLaravelCookie } from "./server";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
type Grant = { uuid: string; token: string; expires: number };
const uuid = "[a-fA-F0-9-]{36}",
  id = "[0-9]+",
  slug = "[a-zA-Z0-9_-]+";
const routes: [string, string][] = [
  ["GET", "csrf-cookie"],
  ["GET", "products"],
  ["GET", `products/${slug}`],
  [
    "GET",
    "categories|collections|faqs|settings|payment-methods|shipping-methods",
  ],
  ["GET", `pages/${slug}`],
  [
    "POST",
    "contact|cart|checkout|checkout/quote|guest-orders/access-link|guest-orders/consume",
  ],
  ["GET", "cart"],
  ["PUT", "cart/items"],
  [
    "POST",
    "auth/register|auth/login|auth/admin-login|auth/forgot-password|auth/reset-password|auth/consume/verify-email|auth/consume/change-email|auth/logout|auth/resend-verification|auth/change-email",
  ],
  ["GET", "auth/me"],
  ["PUT", "auth/profile|auth/password"],
  [
    "GET",
    `orders/${uuid}|orders/${uuid}/receipt|orders/${uuid}/payments/status|orders/${uuid}/returns|returns/${uuid}|returns/${uuid}/photos/${id}`,
  ],
  [
    "POST",
    `orders/${uuid}/cancel|orders/${uuid}/payments/(paypal|stripe|triple-a)|orders/${uuid}/payments/capture|orders/${uuid}/returns|returns/${uuid}/photos`,
  ],
  ["GET", "account/overview|account/orders|account/addresses|account/wishlist"],
  ["POST", `account/addresses|account/orders/${uuid}/claim`],
  ["PUT", `account/addresses/${id}|account/wishlist/${id}`],
  ["DELETE", `account/addresses/${id}|account/wishlist/${id}`],
  [
    "GET",
    `admin/dashboard|admin/exports/products|admin/exports/orders|admin/products|admin/products/${id}|admin/orders|admin/orders/${uuid}|admin/returns|admin/returns/${uuid}|admin/returns/${uuid}/photos/${id}|admin/payments|admin/webhooks|admin/gateways|admin/settings|admin/customers|admin/customers/${id}|admin/contact-messages|admin/contact-messages/${id}|admin/team|admin/roles|admin/audit-log`,
  ],
  [
    "POST",
    `admin/products|admin/variants/${id}/stock|admin/products/${id}/images|admin/orders/${uuid}/notes|admin/orders/${uuid}/process|admin/orders/${uuid}/cancel|admin/orders/${uuid}/allocate-stock|admin/orders/${uuid}/shipments|admin/orders/${uuid}/refunds|admin/shipments/${id}/delivered|admin/returns/${uuid}/restock|admin/payments/${id}/sync|admin/refunds/${id}/sync|admin/webhooks/${id}/retry|admin/media|admin/team`,
  ],
  [
    "PUT",
    `admin/products/${id}|admin/products/${id}/images/${id}|admin/returns/${uuid}|admin/gateways/(paypal|triple-a|btcpay|stripe|2checkout|bank-of-palestine)|admin/settings|admin/contact-messages/${id}|admin/team/${id}|admin/roles/${id}/permissions`,
  ],
  ["DELETE", `admin/products/${id}|admin/products/${id}/images/${id}`],
  ...["GET", "POST", "PUT", "DELETE"].map(
    (m) =>
      [
        m,
        `admin/resources/(categories|collections|size-guides|shipping-methods|tax-rates|coupons|pages|faqs)${m === "POST" ? "" : m === "GET" ? `(/${id})?` : `/${id}`}`,
      ] as [string, string],
  ),
];
function fail(message: string, status: number) {
  return NextResponse.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
async function readBody(req: NextRequest) {
  if (!req.body) return undefined;
  const max = 4 * 1024 * 1024;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      throw Object.assign(
        new Error("Upload is too large. Maximum total is 3 MB."),
        { status: 413 },
      );
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function bridge(req: NextRequest, parts: string[]) {
  const path = parts.join("/");
  if (
    parts.some(
      (p) =>
        !p || p === "." || p === ".." || p.includes("%") || p.includes("\\"),
    ) ||
    !routes.some(
      ([m, p]) => m === req.method && new RegExp(`^(?:${p})$`).test(path),
    )
  )
    return fail("Not found.", 404);
  const cfg = config();
  const write = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (
    write &&
    (req.headers.get("Origin") !== cfg.app ||
      req.headers.get("X-Store-Request") !== "1")
  )
    return fail("Invalid request origin.", 403);
  const h = new Headers({
    Accept: req.headers.get("Accept") || "application/json",
    Origin: cfg.app,
    Referer: cfg.app + "/",
  });
  h.set(
    "Cookie",
    req.cookies
      .getAll()
      .filter((c) => isLaravelCookie(c.name))
      .map((c) => `${c.name}=${c.value}`)
      .join("; "),
  );
  // Enable only for an IP header overwritten by your trusted hosting ingress.
  const ipHeader = process.env.TRUSTED_CLIENT_IP_HEADER || "",
    rateSecret = process.env.BFF_RATE_SECRET || "";
  const clientIP = ipHeader
    ? (req.headers.get(ipHeader) || "").split(",")[0].trim()
    : "";
  if (isIP(clientIP) && /^[a-f0-9]{64}$/i.test(rateSecret)) {
    const time = String(Math.floor(Date.now() / 1000));
    h.set("X-NV-Client-IP", clientIP);
    h.set("X-NV-Client-Time", time);
    h.set(
      "X-NV-Client-Signature",
      createHmac("sha256", rateSecret)
        .update(clientIP + "|" + time)
        .digest("hex"),
    );
  }
  if (write) {
    const x = req.cookies.get("XSRF-TOKEN")?.value;
    if (x) h.set("X-XSRF-TOKEN", decodeURIComponent(x));
  }
  const content = req.headers.get("Content-Type");
  if (content) h.set("Content-Type", content);
  const checkoutKey = req.headers.get("Idempotency-Key");
  if (checkoutKey && /^[a-f0-9-]{36}$/i.test(checkoutKey))
    h.set("Idempotency-Key", checkoutKey);
  const cart = unseal<{ token: string }>(
    req.cookies.get(cookieNames.cart)?.value,
  );
  if (cart?.token) h.set("X-Cart-Token", cart.token);
  let grants = (
    unseal<Grant[]>(req.cookies.get(cookieNames.orders)?.value) || []
  ).filter((g) => g.expires > Date.now());
  const orderUUID =
    path.match(/(?:^|\/)orders\/([a-f0-9-]{36})/i)?.[1] ||
    req.headers.get("X-Order-UUID") ||
    (path.startsWith("returns/")
      ? req.nextUrl.searchParams.get("order")
      : null);
  const grant = grants.find((g) => g.uuid === orderUUID);
  if (grant) h.set("X-Order-Token", grant.token);
  try {
    const body = write ? await readBody(req) : undefined;
    const upstream = await fetch(
      cfg.base +
        (path === "csrf-cookie" ? "/sanctum/csrf-cookie" : "/api/v1/" + path) +
        req.nextUrl.search,
      {
        method: req.method,
        headers: h,
        body,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(60000),
      },
    );
    if (upstream.status >= 300 && upstream.status < 400)
      return fail("Unexpected response from store.", 502);
    const type = upstream.headers.get("Content-Type") || "";
    let output: NextResponse;
    let changed = false;
    let newCart: string | null = null;
    if (type.includes("application/json")) {
      const j = await upstream.json();
      if (upstream.ok) {
        if (write && /^admin\/(settings|media|resources\/(categories|collections|pages|faqs|size-guides))(?:\/|$)/.test(path)) revalidateTag("store-content", { expire: 0 });
        if (
          path === "cart" &&
          req.method === "POST" &&
          typeof j.cart_token === "string"
        ) {
          newCart = seal({ token: j.cart_token });
          delete j.cart_token;
        }
        const token =
          j.order_token ||
          (path === "guest-orders/consume" ? j.data?.order_token : null);
        const order = j.data?.uuid || j.data?.order_uuid;
        if (token && order) {
          grants = [
            ...grants.filter((g) => g.uuid !== order),
            { uuid: order, token, expires: Date.now() + 30 * 60 * 1000 },
          ].slice(-8);
          changed = true;
        }
        delete j.order_token;
        if (j.data && path === "guest-orders/consume")
          delete j.data.order_token;
      }
      output = NextResponse.json(
        upstream.status >= 500
          ? {
              message:
                "The store is temporarily unavailable. Please try again.",
            }
          : j,
        { status: upstream.status },
      );
    } else if (upstream.status === 204)
      output = new NextResponse(null, { status: 204 });
    else if (
      upstream.ok &&
      (type.includes("image/") ||
        type.includes("application/pdf") ||
        type.includes("text/csv"))
    ) {
      output = new NextResponse(upstream.body, {
        status: upstream.status,
        headers: { "Content-Type": type },
      });
      const disposition = upstream.headers.get("Content-Disposition");
      if (disposition) output.headers.set("Content-Disposition", disposition);
    } else
      return fail(
        "The store is temporarily unavailable.",
        upstream.status >= 500 ? upstream.status : 502,
      );
    output.headers.set("Cache-Control", "private, no-store");
    output.headers.set("X-Content-Type-Options", "nosniff");
    for (const raw of upstream.headers.getSetCookie()) {
      const first = raw.split(";")[0];
      const eq = first.indexOf("=");
      const name = first.slice(0, eq),
        value = first.slice(eq + 1);
      if (!isLaravelCookie(name)) continue;
      const expired = /max-age=0/i.test(raw) || value === "";
      const expires = raw.match(/expires=([^;]+)/i)?.[1];
      const expiry = expires ? new Date(expires) : undefined;
      output.cookies.set(name, value, {
        httpOnly: true,
        secure: cfg.secure,
        sameSite: "lax",
        path: "/",
        ...(expired
          ? { maxAge: 0 }
          : expiry && !Number.isNaN(expiry.getTime())
            ? { expires: expiry }
            : {}),
      });
    }
    const options = {
      httpOnly: true,
      secure: cfg.secure,
      sameSite: "lax" as const,
      path: "/",
    };
    if (newCart)
      output.cookies.set(cookieNames.cart, newCart, {
        ...options,
        maxAge: 7 * 86400,
      });
    if (changed)
      output.cookies.set(cookieNames.orders, seal(grants), {
        ...options,
        maxAge: 1800,
      });
    if (
      upstream.ok &&
      [
        "auth/logout",
        "auth/login",
        "auth/admin-login",
        "auth/register",
      ].includes(path)
    )
      output.cookies.set(cookieNames.cart, "", { ...options, maxAge: 0 });
    if (
      upstream.ok &&
      ["auth/logout", "auth/consume/change-email"].includes(path)
    )
      output.cookies.set(cookieNames.orders, "", { ...options, maxAge: 0 });
    return output;
  } catch (e) {
    return fail(
      (e as { status?: number }).status === 413
        ? (e as Error).message
        : "The store could not be reached. Please try again.",
      (e as { status?: number }).status || 502,
    );
  }
}
