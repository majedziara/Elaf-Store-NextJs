import assert from "node:assert/strict";
import { test } from "node:test";
import { paymentPresentation } from "../src/lib/payment-status.ts";

for (const status of ["paid", "partially_refunded"]) {
  test(`${status} confirms verified payment`, () => {
    assert.equal(paymentPresentation(status).confirmed, true);
    assert.equal(paymentPresentation(status, true).title, "Your order is confirmed");
  });
}
for (const status of [undefined, "pending", "unknown", "approved", "failed", "reversed", "expired", "canceled", "refunded"]) {
  test(`${status} never claims payment is confirmed`, () => {
    assert.equal(paymentPresentation(status).confirmed, false);
    assert.notEqual(paymentPresentation(status).title, "Your order is confirmed");
  });
}
test("returning from checkout preserves unresolved payment status", () => {
  assert.equal(paymentPresentation("unknown", true).title, "You returned from checkout");
  assert.equal(paymentPresentation("unknown", true).confirmed, false);
});
test("full refunds and reversals override a checkout confirmation route", () => {
  assert.equal(paymentPresentation("refunded").title, "Your payment has been refunded");
  assert.equal(paymentPresentation("reversed").title, "Your payment was not completed");
});
