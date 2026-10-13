export function paymentPresentation(status: string | undefined, canceledCheckout = false) {
  if (status === "paid" || status === "partially_refunded") {
    return { confirmed: true, title: "Your order is confirmed", message: "Your payment is confirmed. We’ll keep you updated as your order moves forward." };
  }
  if (status === "refunded") {
    return { confirmed: false, title: "Your payment has been refunded", message: "This order’s payment has been fully refunded. View the order for refund details." };
  }
  if (["failed", "reversed", "expired", "canceled"].includes(status || "")) {
    const title = status === "expired" ? "The payment window has expired" : status === "canceled" ? "Your order has been canceled" : "Your payment was not completed";
    return { confirmed: false, title, message: "Check the current order status and payment details before starting another purchase." };
  }
  return { confirmed: false, title: canceledCheckout ? "You returned from PayPal" : "Your order is awaiting payment", message: canceledCheckout ? "Returning from PayPal does not cancel the store order. Check its current status before trying again." : "Approval at PayPal and server verification are required. Pending or unknown status is not a payment confirmation." };
}
