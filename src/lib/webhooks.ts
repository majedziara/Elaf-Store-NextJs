import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { config } from "./server";
export async function forwardPaymentWebhook(request: NextRequest, gateway: string, environment: string) {
  const headers = { "Cache-Control": "no-store" };
  const respond = (status: number) => new NextResponse(null, { status, headers });
  if (!["paypal", "stripe", "triple-a"].includes(gateway) || !["sandbox", "live"].includes(environment)) return respond(404);
  const incomingLength = Number(request.headers.get("Content-Length") || 0);
  if (incomingLength > 262144) return respond(413);
  const upstreamHeaders = new Headers({ Accept: "application/json", "Content-Type": "application/json" });
  const names = gateway === "stripe" ? ["Stripe-Signature"] : gateway === "triple-a" ? ["Triplea-Signature"] : ["PAYPAL-TRANSMISSION-ID", "PAYPAL-TRANSMISSION-TIME", "PAYPAL-CERT-URL", "PAYPAL-AUTH-ALGO", "PAYPAL-TRANSMISSION-SIG"];
  for (const name of names) {
    const value = request.headers.get(name);
    if (!value || value.length > 8192) return respond(400);
    upstreamHeaders.set(name, value);
  }
  try {
    const reader = request.body?.getReader();
    if (!reader) return respond(400);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 262144) { await reader.cancel(); return respond(413); }
      chunks.push(value);
    }
    const response = await fetch(`${config().base}/api/v1/webhooks/${gateway}/${environment}`, {
      method: "POST", headers: upstreamHeaders, body: Buffer.concat(chunks), cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(60000),
    });
    return respond(response.status >= 200 && response.status < 300 ? 200 : response.status >= 400 && response.status < 500 ? response.status : 502);
  } catch { return respond(502); }
}
