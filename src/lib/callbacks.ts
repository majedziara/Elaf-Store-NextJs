import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { config, cookieNames, seal, unseal } from "./server";

type OrderGrant = { uuid: string; token: string; expires: number };
type CallbackAction = "return" | "cancel";
type LinkPage =
  | "verify-email"
  | "change-email"
  | "reset-password"
  | "guest-order";
const orderUUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const accessToken = /^[a-f0-9]{64}$/i;
const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
function redirect(path: string, query: Record<string, string> = {}) {
  const target = new URL(path, config().app);
  for (const [name, value] of Object.entries(query))
    target.searchParams.set(name, value);
  const response = NextResponse.redirect(target, 303);
  for (const [name, value] of Object.entries(privateHeaders))
    response.headers.set(name, value);
  return response;
}
function singleParameter(
  request: NextRequest,
  name: string,
  maximum: number,
) {
  const values = request.nextUrl.searchParams.getAll(name);
  return values.length === 1 &&
    values[0].length > 0 &&
    values[0].length <= maximum &&
    !/[\u0000-\u001f\u007f]/.test(values[0])
    ? values[0]
    : null;
}
function rememberOrder(
  request: NextRequest,
  response: NextResponse,
  uuid: string,
  token: string,
) {
  const previous = unseal<unknown>(
    request.cookies.get(cookieNames.orders)?.value,
  );
  const now = Date.now();
  const grants: OrderGrant[] = Array.isArray(previous)
    ? previous.filter(
        (grant): grant is OrderGrant =>
          grant &&
          typeof grant === "object" &&
          typeof grant.uuid === "string" &&
          orderUUID.test(grant.uuid) &&
          typeof grant.token === "string" &&
          accessToken.test(grant.token) &&
          typeof grant.expires === "number" &&
          grant.expires > now &&
          grant.uuid !== uuid,
      )
    : [];
  const cfg = config();
  response.cookies.set(
    cookieNames.orders,
    seal([...grants, { uuid, token, expires: now + 1800000 }].slice(-8)),
    {
      httpOnly: true,
      secure: cfg.secure,
      sameSite: "lax",
      path: "/",
      maxAge: 1800,
    },
  );
}
export async function paypalCallback(
  request: NextRequest,
  action: CallbackAction,
) {
  const state = singleParameter(request, "state", 4096);
  const token = singleParameter(request, "token", 120);
  if (
    !state ||
    (action === "return" && !token) ||
    (request.nextUrl.searchParams.has("token") && !token)
  )
    return redirect("/checkout/failed", { problem: "invalid-link" });
  const cfg = config();
  const target = new URL(`/api/paypal/${action}`, cfg.base);
  target.searchParams.set("state", state);
  if (token) target.searchParams.set("token", token);
  try {
    const upstream = await fetch(target, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Origin: cfg.app,
        Referer: cfg.app + "/",
      },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(60000),
    });
    if (!upstream.ok) {
      return upstream.status >= 400 &&
        upstream.status < 500 &&
        upstream.status !== 429
        ? redirect("/checkout/failed", { problem: "invalid-link" })
        : redirect("/checkout/pending", { problem: "unavailable" });
    }
    if (!upstream.headers.get("Content-Type")?.includes("application/json"))
      return redirect("/checkout/pending", { problem: "unavailable" });
    const body = await upstream.json();
    const data = body?.data;
    if (
      !data ||
      typeof data.order_uuid !== "string" ||
      !orderUUID.test(data.order_uuid) ||
      typeof data.order_token !== "string" ||
      !accessToken.test(data.order_token) ||
      typeof data.payment_status !== "string" ||
      typeof data.verification_pending !== "boolean"
    )
      return redirect("/checkout/pending", { problem: "unavailable" });
    let page = "pending";
    if (!data.verification_pending) {
      if (["paid", "partially_refunded"].includes(data.payment_status))
        page = "confirmed";
      else if (data.payment_status === "canceled") page = "canceled";
      else if (
        ["failed", "expired", "reversed", "refunded"].includes(data.payment_status)
      )
        page = "failed";
    }
    const query: Record<string, string> = { order: data.order_uuid };
    if (action === "cancel" && page === "pending") query.returned = "cancel";
    const response = redirect(`/checkout/${page}`, query);
    rememberOrder(request, response, data.order_uuid, data.order_token);
    return response;
  } catch {
    return redirect("/checkout/pending", { problem: "unavailable" });
  }
}
export function mailLink(request: NextRequest, page: LinkPage) {
  const token = singleParameter(request, "token", 64);
  const email =
    page === "reset-password"
      ? singleParameter(request, "email", 254)
      : null;
  if (
    !token ||
    !accessToken.test(token) ||
    (page === "reset-password" && !email)
  )
    return NextResponse.json(
      { message: "This link is invalid or incomplete." },
      { status: 400, headers: privateHeaders },
    );
  return redirect(`/${page}`, { token, ...(email ? { email } : {}) });
}
