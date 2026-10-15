import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const modules = new Map();
function loadSource(relative) {
  if (modules.has(relative)) return modules.get(relative).exports;
  const module = { exports: {} };
  modules.set(relative, module);
  const source = ts.transpileModule(readFileSync(path.join(root, relative), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: relative,
  }).outputText;
  const localRequire = (name) => {
    if (name === "server-only") return {};
    if (name === "./server") return loadSource("src/lib/server.ts");
    return require(name);
  };
  new Function("require", "module", "exports", source)(localRequire, module, module.exports);
  return module.exports;
}
process.env.APP_URL = "http://localhost:3000";
process.env.LARAVEL_API_URL = "http://127.0.0.1:8000";
process.env.APP_COOKIE_KEY = "1f".repeat(32);
const { paypalCallback, mailLink } = loadSource("src/lib/callbacks.ts");
const { seal, unseal, cookieNames } = loadSource("src/lib/server.ts");
const uuid = "0d79ae40-3762-4a54-b74e-137b7e92f645";
const grantToken = "a1".repeat(32);
const nativeQuery = { state: "protected-state", token: "PAYPAL-ORDER-123" };
function request(query = nativeQuery, cookie) {
  const url = new URL("http://localhost:3000/api/paypal/return");
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
  return new NextRequest(url, cookie ? { headers: { Cookie: `${cookieNames.orders}=${cookie}` } } : undefined);
}
function result(status = "paid", pending = false, extra = {}) {
  return Response.json({ data: {
    order_uuid: uuid, order_token: grantToken, payment_status: status,
    verification_pending: pending, ...extra,
  } }, { status: pending ? 202 : 200 });
}
async function withFetch(fake, action) {
  const original = globalThis.fetch;
  globalThis.fetch = fake;
  try { return await action(); }
  finally { globalThis.fetch = original; }
}
function location(response) { return new URL(response.headers.get("Location")); }

test("a verified callback grants private order access and strips PayPal secrets from the redirect", async () => {
  let forwarded;
  const response = await withFetch(async (url, options) => {
    forwarded = { url: new URL(url), options };
    return result();
  }, () => paypalCallback(request({ ...nativeQuery, PayerID: "ignored-buyer", next: "https://example.org", order: "forged-order" }), "return"));
  assert.equal(forwarded.url.origin, "http://127.0.0.1:8000");
  assert.equal(forwarded.url.pathname, "/api/paypal/return");
  assert.deepEqual([...forwarded.url.searchParams.keys()], ["state", "token"]);
  assert.equal(forwarded.options.method, "GET");
  assert.equal(forwarded.options.redirect, "manual");
  assert.equal(forwarded.options.cache, "no-store");
  assert.equal(forwarded.options.headers.Cookie, undefined);
  assert.equal(response.status, 303);
  assert.equal(location(response).pathname, "/checkout/confirmed");
  assert.deepEqual([...location(response).searchParams.entries()], [["order", uuid]]);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const cookie = response.cookies.get(cookieNames.orders);
  assert.ok(cookie);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(cookie.path, "/");
  assert.equal(cookie.maxAge, 1800);
  assert.ok(!cookie.value.includes(grantToken));
  const grants = unseal(cookie.value);
  assert.equal(grants.length, 1);
  assert.equal(grants[0].uuid, uuid);
  assert.equal(grants[0].token, grantToken);
  assert.ok(grants[0].expires > Date.now() + 1790000);
  assert.ok(grants[0].expires <= Date.now() + 1800000);
});

test("cancel forwards only the cancel GET and preserves pending real state", async () => {
  let forwarded;
  const response = await withFetch(async (url, options) => {
    forwarded = { url: new URL(url), options };
    return result("pending", true);
  }, () => paypalCallback(request({ state: "protected-cancel-state", payment_status: "paid", capture: "1" }), "cancel"));
  assert.equal(forwarded.url.pathname, "/api/paypal/cancel");
  assert.deepEqual([...forwarded.url.searchParams.keys()], ["state"]);
  assert.equal(forwarded.options.method, "GET");
  assert.equal(forwarded.options.body, undefined);
  assert.equal(location(response).pathname, "/checkout/pending");
  assert.equal(location(response).searchParams.get("returned"), "cancel");
  assert.equal(location(response).searchParams.get("order"), uuid);
});

test("the backend payment state controls the destination even after a cancel click", async () => {
  for (const [status, destination] of [
    ["paid", "confirmed"], ["partially_refunded", "confirmed"],
    ["failed", "failed"], ["reversed", "failed"], ["expired", "failed"],
    ["refunded", "failed"], ["canceled", "canceled"], ["unknown", "pending"],
  ]) {
    const response = await withFetch(async () => result(status), () => paypalCallback(request(), "cancel"));
    assert.equal(location(response).pathname, `/checkout/${destination}`, status);
    assert.equal(location(response).searchParams.get("order"), uuid);
  }
  const response = await withFetch(async () => result("paid", true), () => paypalCallback(request(), "return"));
  assert.equal(location(response).pathname, "/checkout/pending");
});

test("missing or duplicate state and invalid provider tokens never reach the payment backend", async () => {
  let calls = 0;
  await withFetch(async () => { calls++; return result(); }, async () => {
    const duplicate = request();
    duplicate.nextUrl.searchParams.append("state", "second-state");
    for (const invalid of [request({}), request({ state: "protected-state" }), duplicate, request({ ...nativeQuery, token: "x".repeat(121) })]) {
      const response = await paypalCallback(invalid, "return");
      assert.equal(location(response).pathname, "/checkout/failed");
      assert.equal(location(response).searchParams.get("order"), null);
      assert.equal(response.cookies.get(cookieNames.orders), undefined);
    }
  });
  assert.equal(calls, 0);
});

test("invalid or expired backend state cannot create guest access or confirm a payment", async () => {
  for (const status of [404, 410, 422]) {
    const response = await withFetch(async () => Response.json({ message: "private failure detail", data: { order_uuid: uuid, order_token: grantToken } }, { status }), () => paypalCallback(request(), "return"));
    assert.equal(location(response).pathname, "/checkout/failed");
    assert.equal(location(response).searchParams.get("order"), null);
    assert.equal(response.cookies.get(cookieNames.orders), undefined);
    assert.ok(!response.headers.get("Location").includes(grantToken));
  }
});

test("network errors, upstream redirects, and malformed payloads remain unconfirmed", async () => {
  for (const fake of [
    async () => { throw new TypeError("connection failed with private detail"); },
    async () => new Response(null, { status: 302, headers: { Location: "https://example.org" } }),
    async () => Response.json({ message: "internal private error" }, { status: 503 }),
    async () => new Response("<html>internal error</html>", { headers: { "Content-Type": "text/html" } }),
    async () => result("paid", false, { order_uuid: "invalid" }),
    async () => result("paid", false, { order_token: "invalid" }),
    async () => result("paid", false, { verification_pending: "false" }),
  ]) {
    const response = await withFetch(fake, () => paypalCallback(request(), "return"));
    assert.equal(location(response).origin, "http://localhost:3000");
    assert.equal(location(response).pathname, "/checkout/pending");
    assert.equal(location(response).searchParams.get("order"), null);
    assert.equal(response.cookies.get(cookieNames.orders), undefined);
  }
});

test("order cookie grants expire after thirty minutes and retain at most eight recent orders", async () => {
  const now = Date.now();
  const previous = Array.from({ length: 9 }, (_, index) => ({
    uuid: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    token: "b2".repeat(32), expires: now + 600000,
  }));
  previous.push({ uuid, token: "c3".repeat(32), expires: now + 100000 });
  previous.push({ uuid: "00000000-0000-4000-8000-999999999999", token: "d4".repeat(32), expires: now - 1 });
  previous.push({ uuid: "not-a-uuid", token: "invalid", expires: now + 100000 });
  const response = await withFetch(async () => result(), () => paypalCallback(request(nativeQuery, seal(previous)), "return"));
  const grants = unseal(response.cookies.get(cookieNames.orders).value);
  assert.equal(grants.length, 8);
  assert.equal(grants.at(-1).uuid, uuid);
  assert.equal(grants.at(-1).token, grantToken);
  assert.equal(grants.filter((grant) => grant.uuid === uuid).length, 1);
  assert.equal(grants[0].uuid, previous[2].uuid);
  assert.ok(grants.every((grant) => grant.expires > now));
});

test("email links redirect locally without consuming single-use tokens or forwarding extra query values", () => {
  for (const page of ["verify-email", "change-email", "guest-order", "reset-password"]) {
    const response = mailLink(request({ token: grantToken, email: "buyer+test@example.com", next: "https://example.org", state: "secret" }), page);
    const target = location(response);
    assert.equal(target.origin, "http://localhost:3000");
    assert.equal(target.pathname, `/${page}`);
    assert.equal(target.searchParams.get("token"), grantToken);
    assert.equal(target.searchParams.get("next"), null);
    assert.equal(target.searchParams.get("state"), null);
    assert.equal(target.searchParams.get("email"), page === "reset-password" ? "buyer+test@example.com" : null);
    assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
    assert.equal(response.cookies.get(cookieNames.orders), undefined);
  }
});

test("email alias validation rejects incomplete, oversized, or duplicate tokens without reflecting them", async () => {
  const duplicate = request({ token: grantToken });
  duplicate.nextUrl.searchParams.append("token", grantToken);
  for (const invalid of [request({ token: "private-invalid-value" }), request({ token: "a".repeat(65) }), duplicate]) {
    const response = mailLink(invalid, "guest-order");
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message: "This link is invalid or incomplete." });
  }
  assert.equal(mailLink(request({ token: grantToken }), "reset-password").status, 400);
});

const { paymentCallback } = loadSource("src/lib/callbacks.ts");
const { paymentURL } = loadSource("src/lib/types.ts");
const { forwardPaymentWebhook } = loadSource("src/lib/webhooks.ts");
for (const gateway of ["stripe", "triple-a"]) {
  test(`${gateway} callback forwards protected state and ignores browser payment claims`, async () => {
    let forwarded;
    const response = await withFetch(async (url) => { forwarded = new URL(url); return result(); }, () => paymentCallback(request({state:"protected", status:"paid", amount:"0.01", order:"forged"}), gateway, "return"));
    assert.equal(forwarded.pathname, `/api/payments/${gateway}/return`);
    assert.deepEqual([...forwarded.searchParams.entries()], [["state", "protected"]]);
    assert.equal(location(response).pathname, "/checkout/confirmed");
    assert.equal(location(response).searchParams.get("order"), uuid);
    assert.ok(response.cookies.get(cookieNames.orders));
  });
  test(`${gateway} cancel uses verified pending state`, async () => {
    const response = await withFetch(async () => result("pending", true), () => paymentCallback(request({state:"protected"}), gateway, "cancel"));
    assert.equal(location(response).pathname, "/checkout/pending");
    assert.equal(location(response).searchParams.get("returned"), "cancel");
  });
}
test("unknown gateways and actions cannot reach the backend", async () => {
  await withFetch(async () => {throw new Error("Unexpected upstream request");}, async () => {
    assert.equal((await paymentCallback(request({state:"protected"}), "bank-of-palestine", "return")).status, 404);
    assert.equal((await paymentCallback(request({state:"protected"}), "stripe", "capture")).status, 404);
  });
});
test("payment redirects allow only provider-owned HTTPS hosts", () => {
  assert.ok(paymentURL("stripe", "https://checkout.stripe.com/c/pay/cs_test_1"));
  assert.ok(paymentURL("triple-a", "https://triple-a.io/app/v1/payment_form?access_token=payment-token"));
  for (const value of ["https://checkout.stripe.com.attacker.invalid/pay", "http://checkout.stripe.com/pay", "https://user:password@checkout.stripe.com/pay", "https://checkout.stripe.com:444/pay", "javascript:alert(1)"])
    assert.equal(paymentURL("stripe", value), null);
  assert.equal(paymentURL("stripe", "https://www.paypal.com/checkoutnow"), null);
  assert.equal(paymentURL("unknown", "https://checkout.stripe.com"), null);
});
test("webhook proxy preserves raw signed bytes without browser cookies", async () => {
  const body = '{ "id": "event", "amount": 3900 }\n';
  let captured;
  const req = new NextRequest("http://localhost:3000/api/v1/webhooks/stripe/sandbox", {method:"POST", headers:{"Stripe-Signature":"t=1,v1=signed", Cookie:"secret=session", Origin:"https://provider.invalid"}, body});
  const response = await withFetch(async (url, options) => {captured={url, options};return new Response('private upstream body', {status:200});}, () => forwardPaymentWebhook(req, "stripe", "sandbox"));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
  assert.equal(captured.url, "http://127.0.0.1:8000/api/v1/webhooks/stripe/sandbox");
  assert.equal(captured.options.body.toString(), body);
  assert.equal(captured.options.headers.get("Stripe-Signature"), "t=1,v1=signed");
  assert.equal(captured.options.headers.get("Cookie"), null);
  assert.equal(captured.options.headers.get("Origin"), null);
  assert.equal(captured.options.redirect, "manual");
});
test("webhook proxy rejects missing signatures, unsupported targets and oversized bodies", async () => {
  const make = (body="{}", signature="") => new NextRequest("http://localhost:3000/api/v1/webhooks/stripe/sandbox", {method:"POST", body, headers:signature ? {"Stripe-Signature":signature} : {}});
  await withFetch(async () => {throw new Error("Unexpected upstream request");}, async () => {
    assert.equal((await forwardPaymentWebhook(make(), "stripe", "sandbox")).status, 400);
    assert.equal((await forwardPaymentWebhook(make(), "2checkout", "sandbox")).status, 404);
    assert.equal((await forwardPaymentWebhook(make(), "stripe", "other")).status, 404);
    assert.equal((await forwardPaymentWebhook(make("x".repeat(262145), "signature"), "stripe", "sandbox")).status, 413);
  });
});
test("provider retries are preserved when the backend cannot process a webhook", async () => {
  const req = new NextRequest("http://localhost:3000/api/v1/webhooks/triple-a/live", {method:"POST", body:"{}", headers:{"Triplea-Signature":"signature"}});
  const response = await withFetch(async () => new Response(null, {status:503}), () => forwardPaymentWebhook(req, "triple-a", "live"));
  assert.equal(response.status, 502);
});

const { bridge } = loadSource("src/lib/bridge.ts");
for (const gateway of ["stripe", "triple-a"]) {
  test(`BFF allowlist forwards ${gateway} payment start and its private order grant`, async () => {
    const granted = seal([{uuid, token: grantToken, expires:Date.now()+1800000}]);
    const req = new NextRequest(`http://localhost:3000/api/store/orders/${uuid}/payments/${gateway}`, {method:"POST", headers:{Origin:"http://localhost:3000", "X-Store-Request":"1", Cookie:`${cookieNames.orders}=${granted}`}});
    let forwarded;
    const response = await withFetch(async (url, options) => {forwarded={url,options};return Response.json({data:{status:"awaiting_approval"}});}, () => bridge(req, ["orders",uuid,"payments",gateway]));
    assert.equal(response.status, 200);
    assert.equal(forwarded.url, `http://127.0.0.1:8000/api/v1/orders/${uuid}/payments/${gateway}`);
    assert.equal(forwarded.options.headers.get("X-Order-Token"), grantToken);
  });
}
