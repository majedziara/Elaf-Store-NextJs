import assert from "node:assert/strict";
import { test } from "node:test";
import { canRequestReturn } from "../src/lib/order-eligibility.ts";
const now = Date.parse("2026-10-13T12:00:00Z");
const order = { payment_status: "paid", delivered_at: "2026-10-12T12:00:00Z", items: [{ returnable: true }] };
const policy = { returns_enabled: true, return_days: 14 };
test("paid delivered returnable orders inside the configured policy are eligible", () => {
  assert.equal(canRequestReturn(order, policy, now), true);
  assert.equal(canRequestReturn({ ...order, payment_status: "partially_refunded" }, policy, now), true);
});
test("disabled or missing policy cannot offer a return", () => {
  for (const settings of [{}, { ...policy, returns_enabled: false }, { ...policy, return_days: 0 }])
    assert.equal(canRequestReturn(order, settings, now), false);
});
test("unpaid refunded and reversed orders cannot offer a return", () => {
  for (const payment_status of ["pending", "unknown", "failed", "refunded", "reversed", "canceled"])
    assert.equal(canRequestReturn({ ...order, payment_status }, policy, now), false);
});
test("delivery and a returnable item are required", () => {
  assert.equal(canRequestReturn({ ...order, delivered_at: null }, policy, now), false);
  assert.equal(canRequestReturn({ ...order, items: [{ returnable: false }] }, policy, now), false);
});
test("expired return windows cannot offer a return", () => {
  assert.equal(canRequestReturn({ ...order, delivered_at: "2026-09-01T12:00:00Z" }, policy, now), false);
  assert.equal(canRequestReturn({ ...order, delivered_at: "invalid" }, policy, now), false);
});
