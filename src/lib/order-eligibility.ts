export function canRequestReturn(order: { payment_status: string; delivered_at: string | null; items: { returnable: boolean }[] }, settings: { returns_enabled?: unknown; return_days?: unknown }, now = Date.now()): boolean {
  const days = Number(settings.return_days);
  const delivered = order.delivered_at ? new Date(order.delivered_at).getTime() : NaN;
  return settings.returns_enabled === true && Number.isInteger(days) && days > 0 &&
    ["paid", "partially_refunded"].includes(order.payment_status) &&
    Number.isFinite(delivered) && delivered + days * 86400000 >= now &&
    order.items.some(item => item.returnable);
}
