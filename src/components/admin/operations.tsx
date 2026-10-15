"use client";
import { paymentPresentation } from "@/lib/payment-status";
import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, useAction, useResource } from "@/lib/api";
import {
  type Row,
  type PageData,
  type Order,
  type User,
  money,
  date,
  str,
  rows,
  safeHttps,
} from "@/lib/types";
import {
  PageHeading,
  Button,
  Form,
  InputField,
  TextAreaField,
  SelectField,
  Errors,
  Notice,
  ResourceState,
  Pagination,
  Confirm,
  LinkButton,
  Badge,
  downloadURL,
} from "../ui";
import { AddressView } from "../account";
import { TotalsView } from "../checkout";
export function Dashboard() {
  const [range, setRange] = useState({ from: "", to: "" }),
    [active, setActive] = useState("");
  const r = useResource<{ data: Row }>("admin/dashboard" + active);
  const d = r.data?.data,
    days = rows(d?.daily_sales),
    max = Math.max(1, ...days.map((x) => Number(x.net_cents)));
  return (
    <>
      <PageHeading
        eyebrow="Store operations"
        title="Overview"
        action={
          <form
            className="date-filter"
            onSubmit={(e) => {
              e.preventDefault();
              const params = new URLSearchParams();
              if (range.from) params.set("from", range.from);
              if (range.to) params.set("to", range.to);
              setActive(params.size ? "?" + params : "");
            }}
          >
            <InputField
              label="From (UTC)"
              type="date"
              value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })}
            />
            <InputField
              label="To (UTC)"
              type="date"
              min={range.from}
              value={range.to}
              onChange={(e) => setRange({ ...range, to: e.target.value })}
            />
            <Button variant="secondary">Apply</Button>
          </form>
        }
      />
      <ResourceState {...r} />
      {d ? (
        <>
          <div className="metrics">
            {[
              [
                "Paid sales, net",
                money(d.paid_sales_net_cents),
                "Confirmed sales less recorded refunds",
              ],
              ["Paid orders", str(d.paid_orders), "Selected date range"],
              [
                "Awaiting fulfillment",
                str(d.awaiting_fulfillment),
                "Paid orders awaiting action",
              ],
              [
                "Pending payment",
                money(d.pending_payment_cents),
                "Excluded from paid sales",
              ],
            ].map(([title, value, note]) => (
              <div className="metric" key={title}>
                <p className="eyebrow">{title}</p>
                <strong>{value}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>
          <div className="admin-two-col">
            <div className="panel">
              <h2>Daily net sales</h2>
              <p className="muted">USD · UTC · confirmed payment dates</p>
              {days.length ? (
                <div
                  className="chart"
                  role="img"
                  aria-label="Daily confirmed net sales. Detailed values in table below."
                >
                  {days.map((day) => (
                    <div
                      className="chart-bar"
                      key={str(day.date)}
                      title={str(day.date) + " / " + money(day.net_cents)}
                    >
                      <span
                        style={{
                          height:
                            Math.max(1, (Number(day.net_cents) / max) * 140) +
                            "px",
                        }}
                      />
                      <small>{str(day.date).slice(5)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No confirmed sales in this date range.</p>
              )}
              <details>
                <summary>View daily values</summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Net sales</th>
                        <th>Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day) => (
                        <tr key={str(day.date)}>
                          <td>{str(day.date)}</td>
                          <td>{money(day.net_cents)}</td>
                          <td>{str(day.orders)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
            <div className="panel stack">
              <h2>Needs attention</h2>
              <p>
                {str(d.returns_awaiting_review)} return requests awaiting review
              </p>
              <p>{str(d.unresolved_payments)} unresolved payments</p>
              <p>Average order value: {money(d.average_order_value_cents)}</p>
              <Link href="/admin/returns">Review returns ↗</Link>
              <Link href="/admin/payments">Review payments ↗</Link>
            </div>
          </div>
          <div className="panel stack" style={{ marginTop: 24 }}>
            <h2>Recent orders</h2>
            <OrdersTable orders={rows(d.recent_orders)} />
          </div>
          <div className="panel stack" style={{ marginTop: 24 }}>
            <h2>Low-stock selections</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Colour / size</th>
                    <th>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {rows(d.low_stock).map((v) => (
                    <tr key={str(v.id)}>
                      <td>
                        <Link href={"/admin/products/" + str(v.product_id)}>
                          {str((v.product as Row)?.name)}
                        </Link>
                      </td>
                      <td>{str(v.sku)}</td>
                      <td>
                        {str(v.color)} / {str(v.size)}
                      </td>
                      <td>
                        {Math.max(0, Number(v.stock) - Number(v.reserved))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
export function OrdersTable({ orders }: { orders: Row[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Payment</th>
            <th>Fulfillment</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={str(o.uuid)}>
              <td>
                <Link href={"/admin/orders/" + str(o.uuid)}>
                  {str(o.reference)}
                </Link>
              </td>
              <td>{str(o.email)}</td>
              <td>{date(o.created_at)}</td>
              <td>
                <Badge value={o.payment_status} />
              </td>
              <td>
                <Badge value={o.fulfillment_status} />
              </td>
              <td>{money(o.total_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function AdminOrders() {
  const [page, setPage] = useState(1),
    [filters, setFilters] = useState({
      q: "",
      payment_status: "",
      fulfillment_status: "",
    }),
    [search, setSearch] = useState({});
  const params = new URLSearchParams({ page: String(page), ...search });
  const r = useResource<PageData<Row>>("admin/orders?" + params);
  return (
    <>
      <PageHeading
        eyebrow="Operations"
        title="Orders"
        action={
          <a
            className="button secondary"
            href={downloadURL("admin/exports/orders")}
          >
            Export CSV
          </a>
        }
      />
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(
            Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
          );
          setPage(1);
        }}
      >
        <InputField
          label="Reference or email"
          value={filters.q}
          maxLength={100}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <SelectField
          label="Payment"
          value={filters.payment_status}
          onChange={(e) =>
            setFilters({ ...filters, payment_status: e.target.value })
          }
        >
          <option value="">All</option>
          {[
            "pending",
            "paid",
            "partially_refunded",
            "refunded",
            "failed",
            "canceled",
            "expired",
            "reversed",
          ].map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Fulfillment"
          value={filters.fulfillment_status}
          onChange={(e) =>
            setFilters({ ...filters, fulfillment_status: e.target.value })
          }
        >
          <option value="">All</option>
          {[
            "unfulfilled",
            "processing",
            "on_hold",
            "shipped",
            "delivered",
            "canceled",
          ].map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </SelectField>
        <Button variant="secondary">Search</Button>
      </form>
      <ResourceState {...r} />
      {r.data ? (
        <>
          <OrdersTable orders={r.data.data} />
          <Pagination data={r.data} onPage={setPage} />
        </>
      ) : null}
    </>
  );
}
export function AdminOrder({ uuid, user }: { uuid: string; user: User }) {
  const r = useResource<{ data: Order }>("admin/orders/" + uuid),
    a = useAction(),
    o = r.data?.data;
  const manage = user.permissions.includes("orders.manage"),
    refund = user.permissions.includes("refunds.create");
  const perform = (path: string) =>
    a.run(async () => {
      await api(path, { method: "POST" });
      r.reload();
    }, "Order updated.");
  return (
    <>
      <PageHeading
        eyebrow="Order management"
        title={o?.reference || "Order details"}
        action={<Link href="/admin/orders">← All orders</Link>}
      />
      <ResourceState {...r} />
      <Errors error={a.error} />
      {a.message ? <Notice>{a.message}</Notice> : null}
      {o ? (
        <div className="stack">
          <div className="actions">
            <Badge value={o.payment_status} />
            <Badge value={o.fulfillment_status} />
            <Badge value={o.stock_status} />
            <span className="muted">
              {o.email} · {date(o.created_at)}
            </span>
          </div>
          <div className="admin-two-col">
            <div className="panel">
              <h2>Purchased selections</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Product / SKU</th>
                      <th>Colour / size</th>
                      <th>Qty</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.items.map((i) => (
                      <tr key={i.id}>
                        <td className="wrap">
                          {i.product_name}
                          <p className="muted">{i.sku}</p>
                        </td>
                        <td>
                          {i.color} / {i.size}
                        </td>
                        <td>{i.quantity}</td>
                        <td>
                          {money(
                            i.unit_price_cents * i.quantity -
                              i.line_discount_cents,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="panel">
              <h2>Financial summary</h2>
              <TotalsView value={o} />
              <div className="total-row">
                <span>Refunded</span>
                <span>{money(o.refunded_cents)}</span>
              </div>
            </div>
            <div className="panel">
              <h2>Ship to</h2>
              <AddressView address={o.shipping_address} />
              <p>{o.shipping_method}</p>
            </div>
            <div className="panel">
              <h2>Billing address</h2>
              <AddressView address={o.billing_address} />
            </div>
          </div>
          {manage ? (
            <div className="panel stack">
              <h2>Fulfillment actions</h2>
              <div className="actions">
                <Button
                  variant="secondary"
                  disabled={
                    a.busy ||
                    !o.paid_at || !paymentPresentation(o.payment_status).confirmed ||
                    o.fulfillment_status !== "unfulfilled"
                  }
                  onClick={() => perform("admin/orders/" + uuid + "/process")}
                >
                  Mark processing
                </Button>
                <Button
                  variant="secondary"
                  disabled={
                    a.busy || !o.paid_at || !paymentPresentation(o.payment_status).confirmed || o.fulfillment_status !== "on_hold"
                  }
                  onClick={() =>
                    perform("admin/orders/" + uuid + "/allocate-stock")
                  }
                >
                  Allocate stock
                </Button>
                <Confirm
                  title="Cancel this order?"
                  label="Cancel order"
                  busy={a.busy}
                  onConfirm={() => perform("admin/orders/" + uuid + "/cancel")}
                >
                  Cancellation does not issue a refund. The store first checks
                  unresolved payments and fulfillment.
                </Confirm>
              </div>
              <ShipmentForm
                uuid={uuid}
                returns={o.returns || []}
                reload={r.reload}
              />
              <Form
                error={a.error}
                busy={a.busy}
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const message = String(new FormData(form).get("message"));
                  void a.run(async () => {
                    await api("admin/orders/" + uuid + "/notes", {
                      method: "POST",
                      body: { message },
                    });
                    form.reset();
                    r.reload();
                  }, "Internal note added.");
                }}
              >
                <TextAreaField
                  label="Internal order note"
                  name="message"
                  required
                  maxLength={3000}
                />
                <Button busy={a.busy} variant="secondary">
                  Add note
                </Button>
              </Form>
            </div>
          ) : null}
          {o.shipments.length ? (
            <div className="panel stack">
              <h2>Shipments</h2>
              {o.shipments.map((ship) => (
                <div className="spread" key={str(ship.id)}>
                  <div>
                    <strong>
                      {str(ship.carrier)} · {str(ship.tracking_number)}
                    </strong>
                    <p className="muted">
                      {ship.return_request_id
                        ? "Exchange replacement"
                        : "Original shipment"}{" "}
                      · {date(ship.shipped_at)}
                    </p>
                    {safeHttps(ship.tracking_url) ? (
                      <a
                        href={safeHttps(ship.tracking_url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Track ↗
                      </a>
                    ) : null}
                  </div>
                  {ship.delivered_at ? (
                    <Badge value="delivered" />
                  ) : manage ? (
                    <Confirm
                      title="Confirm delivery?"
                      label="Mark delivered"
                      busy={a.busy}
                      onConfirm={() =>
                        perform(
                          "admin/shipments/" + str(ship.id) + "/delivered",
                        )
                      }
                    >
                      Record delivery only after confirming it with the carrier
                      or customer.
                    </Confirm>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          <div className="panel stack">
            <h2>Payment attempts</h2>
            {o.payments.map((p) => (
              <div className="spread" key={str(p.id)}>
                <span>
                  {str(p.gateway)} · {str(p.provider_order_id) || str(p.uuid)}
                </span>
                <Badge value={p.status} />
              </div>
            ))}
          </div>
          {refund ? <RefundForm order={o} reload={r.reload} /> : null}
          {o.refunds.length ? (
            <div className="panel stack">
              <h2>Refund history</h2>
              {o.refunds.map((f) => (
                <div className="spread" key={str(f.id)}>
                  <div>
                    {money(f.amount_cents)} <Badge value={f.status} />
                    {f.return_request_id ? (
                      <p className="muted">
                        Linked return #{str(f.return_request_id)}
                      </p>
                    ) : null}
                  </div>
                  {refund &&
                  f.status !== "completed" &&
                  f.status !== "merged" ? (
                    <Button
                      variant="secondary"
                      busy={a.busy}
                      onClick={() =>
                        perform("admin/refunds/" + str(f.id) + "/sync")
                      }
                    >
                      Sync refund
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          <div className="panel">
            <h2>Order history</h2>
            <ol className="timeline">
              {o.events.map((e, i) => (
                <li key={i}>
                  <Badge value={e.type} /> {str(e.message)}
                  <time>{date(e.created_at)}</time>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </>
  );
}
function ShipmentForm({
  uuid,
  returns,
  reload,
}: {
  uuid: string;
  returns: Row[];
  reload: () => void;
}) {
  const a = useAction();
  return (
    <Form
      error={a.error}
      busy={a.busy}
      message={a.message}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget,
          d = Object.fromEntries(new FormData(form));
        void a.run(async () => {
          await api("admin/orders/" + uuid + "/shipments", {
            method: "POST",
            body: {
              carrier: d.carrier,
              tracking_number: d.tracking_number,
              tracking_url: d.tracking_url || null,
              return_request_id: d.return_request_id
                ? Number(d.return_request_id)
                : null,
            },
          });
          form.reset();
          reload();
        }, "Shipment recorded.");
      }}
    >
      <h3>Record a shipment</h3>
      <div className="form-grid">
        <InputField label="Carrier" name="carrier" required maxLength={100} />
        <InputField
          label="Tracking number"
          name="tracking_number"
          required
          maxLength={120}
        />
        <InputField
          label="Tracking URL (optional, HTTPS)"
          name="tracking_url"
          type="url"
          maxLength={500}
        />
        <SelectField label="Shipment type" name="return_request_id">
          <option value="">Original order shipment</option>
          {returns
            .filter((rr) => rr.type === "exchange" && rr.status === "received")
            .map((rr) => (
              <option key={str(rr.id)} value={str(rr.id)}>
                Exchange {str(rr.reference)}
              </option>
            ))}
        </SelectField>
      </div>
      <Button busy={a.busy} variant="secondary">
        Record shipment
      </Button>
    </Form>
  );
}
function RefundForm({ order, reload }: { order: Order; reload: () => void }) {
  const a = useAction(),
    key = useRef(""),
    frozen = useRef<Row | null>(null);
  const [amount, setAmount] = useState(""),
    [reason, setReason] = useState(""),
    [returnId, setReturnId] = useState(""),
    [unknown, setUnknown] = useState(false);
  const submit = () =>
    a.run(async () => {
      if (!Number(amount) || !reason.trim())
        throw new Error("Enter a refund amount and a reason.");
      if (!key.current) key.current = crypto.randomUUID();
      frozen.current = frozen.current || {
        request_key: key.current,
        amount_cents: Math.round(Number(amount) * 100),
        reason,
        return_request_id: returnId ? Number(returnId) : null,
      };
      try {
        const j = await api<{ data: Row }>(
          "admin/orders/" + order.uuid + "/refunds",
          { method: "POST", body: frozen.current },
        );
        if (["completed", "failed"].includes(str(j.data.status))) {
          key.current = "";
          frozen.current = null;
          setUnknown(false);
          setAmount("");
        } else setUnknown(true);
        reload();
      } catch (e) {
        if (
          (e as { status: number }).status >= 500 ||
          (e as { status: number }).status === 0
        )
          setUnknown(true);
        else {
          frozen.current = null;
        }
        throw e;
      }
    }, "Refund request recorded. Review its confirmed status below.");
  return (
    <div className="panel stack">
      <h2>Issue a refund</h2>
      <p className="muted">
        Available balance: {money(order.total_cents - order.refunded_cents)}.
        Refunding does not restock inventory.
      </p>
      <Errors error={a.error} />
      {a.message ? <Notice>{a.message}</Notice> : null}
      {unknown ? (
        <Notice tone="error">
          This refund is unresolved. Synchronize it in the refund history before
          creating another. Repeating this action uses the original refund key
          and amount.
        </Notice>
      ) : null}
      <fieldset disabled={a.busy || unknown} className="form-grid">
        <InputField
          label="Amount ($)"
          type="number"
          min=".01"
          step=".01"
          max={(order.total_cents - order.refunded_cents) / 100}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <InputField
          label="Reason"
          maxLength={180}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <SelectField
          label="Link to return request (optional)"
          value={returnId}
          onChange={(e) => setReturnId(e.target.value)}
        >
          <option value="">Standalone refund</option>
          {order.returns
            ?.filter(
              (rr) =>
                rr.type === "return" &&
                ["received", "approved"].includes(str(rr.status)),
            )
            .map((rr) => (
              <option key={str(rr.id)} value={str(rr.id)}>
                {str(rr.reference)}
              </option>
            ))}
        </SelectField>
      </fieldset>
      <Confirm
        title={`Refund ${money(Math.round(Number(amount) * 100))}?`}
        label={unknown ? "Check original refund request" : "Issue refund"}
        busy={a.busy}
        onConfirm={submit}
      >
        This submits a financial refund to the original payment provider for order {order.reference}.
        Review the amount and reason before confirming.
      </Confirm>
    </div>
  );
}
export function AdminReturns() {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    r = useResource<PageData<Row>>(
      "admin/returns?page=" + page + (status ? "&status=" + status : ""),
    );
  return (
    <>
      <PageHeading eyebrow="Customer care" title="Returns & exchanges" />
      <div className="admin-toolbar">
        <SelectField
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All</option>
          {[
            "submitted",
            "under_review",
            "approved",
            "rejected",
            "received",
            "completed",
          ].map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </SelectField>
      </div>
      <ResourceState {...r} />
      {r.data ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Order</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {r.data.data.map((rr) => (
                  <tr key={str(rr.uuid)}>
                    <td>
                      <Link href={"/admin/returns/" + str(rr.uuid)}>
                        {str(rr.reference)}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={"/admin/orders/" + str((rr.order as Row)?.uuid)}
                      >
                        {str((rr.order as Row)?.reference)}
                      </Link>
                    </td>
                    <td>{str(rr.type)}</td>
                    <td>
                      <Badge value={rr.status} />
                    </td>
                    <td>{date(rr.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination data={r.data} onPage={setPage} />
        </>
      ) : null}
    </>
  );
}
export function AdminReturn({ uuid }: { uuid: string }) {
  const r = useResource<{ data: Row }>("admin/returns/" + uuid),
    a = useAction(),
    rr = r.data?.data;
  const allowed: Record<string, string[]> = {
    submitted: ["under_review", "approved", "rejected"],
    under_review: ["approved", "rejected"],
    approved: ["received", "rejected"],
    received: ["completed"],
  };
  return (
    <>
      <PageHeading
        eyebrow="Returns & exchanges"
        title={str(rr?.reference) || "Request details"}
      />
      <ResourceState {...r} />
      {rr ? (
        <div className="stack">
          <div className="actions">
            <Badge value={rr.type} />
            <Badge value={rr.status} />
            <Link href={"/admin/orders/" + str((rr.order as Row)?.uuid)}>
              Open order ↗
            </Link>
          </div>
          <p className="prose">{str(rr.notes)}</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Reason</th>
                  <th>Replacement ID</th>
                </tr>
              </thead>
              <tbody>
                {rows(rr.items).map((i) => (
                  <tr key={str(i.id)}>
                    <td className="wrap">
                      {str((i.order_item as Row)?.product_name) ||
                        str(i.order_item_id)}
                    </td>
                    <td>{str(i.quantity)}</td>
                    <td className="wrap">{str(i.reason)}</td>
                    <td>{str(i.replacement_variant_id) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="image-list">
            {(Array.isArray(rr.photo_paths) ? rr.photo_paths : []).map(
              (_, i) => (
                <a
                  key={i}
                  href={downloadURL("admin/returns/" + uuid + "/photos/" + i)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Image
                    src={downloadURL("admin/returns/" + uuid + "/photos/" + i)}
                    alt={`Customer return photo ${i + 1}`}
                    width={280}
                    height={280}
                    unoptimized
                  />
                </a>
              ),
            )}
          </div>
          {allowed[str(rr.status)] ? (
            <Form
              error={a.error}
              busy={a.busy}
              message={a.message}
              onSubmit={(e) => {
                e.preventDefault();
                const d = Object.fromEntries(new FormData(e.currentTarget));
                void a.run(async () => {
                  await api("admin/returns/" + uuid, {
                    method: "PUT",
                    body: d,
                  });
                  r.reload();
                }, "Request updated.");
              }}
            >
              <SelectField label="Next status" name="status" required>
                <option value="">Choose next step</option>
                {allowed[str(rr.status)].map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </SelectField>
              <TextAreaField
                label="Internal review note"
                name="admin_note"
                maxLength={3000}
                defaultValue={str(rr.admin_note)}
              />
              <Button busy={a.busy}>Update request</Button>
            </Form>
          ) : null}
          <Errors error={a.error} />
          <Confirm
            title="Restock inspected items?"
            label={
              rr.restocked ? "Already restocked" : "Restock after inspection"
            }
            busy={
              a.busy ||
              !!rr.restocked ||
              !["received", "completed"].includes(str(rr.status))
            }
            onConfirm={() =>
              a.run(async () => {
                await api("admin/returns/" + uuid + "/restock", {
                  method: "POST",
                });
                r.reload();
              }, "Returned stock updated.")
            }
          >
            Confirm that the returned items were received and inspected. This
            restores the original quantities once.
          </Confirm>
          <Notice>
            For a return, complete the linked refund from the order page before
            completing the request. For an exchange, record the replacement
            shipment after receiving the original item.
          </Notice>
        </div>
      ) : null}
    </>
  );
}
export function Payments() {
  const [tab, setTab] = useState("payments"),
    [page, setPage] = useState(1),
    r = useResource<PageData<Row>>("admin/" + tab + "?page=" + page),
    a = useAction();
  return (
    <>
      <PageHeading
        eyebrow="Payment operations"
        title={
          tab === "payments" ? "Payment attempts" : "Verified payment events"
        }
      />
      <div className="actions">
        <Button
          variant={tab === "payments" ? "primary" : "secondary"}
          onClick={() => {
            setTab("payments");
            setPage(1);
          }}
        >
          Attempts
        </Button>
        <Button
          variant={tab === "webhooks" ? "primary" : "secondary"}
          onClick={() => {
            setTab("webhooks");
            setPage(1);
          }}
        >
          Events
        </Button>
      </div>
      <Errors error={a.error} />
      <ResourceState {...r} />
      {r.data ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {(tab === "payments"
                    ? [
                        "Order",
                        "Gateway",
                        "Status",
                        "Provider order",
                        "Last checked",
                        "Action",
                      ]
                    : [
                        "Event",
                        "Environment",
                        "Type",
                        "Processed",
                        "Date",
                        "Action",
                      ]
                  ).map((s) => (
                    <th key={s}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.data.data.map((p) => (
                  <tr key={str(p.id)}>
                    {tab === "payments" ? (
                      <>
                        <td>
                          <Link
                            href={
                              "/admin/orders/" + str((p.order as Row)?.uuid)
                            }
                          >
                            {str((p.order as Row)?.reference)}
                          </Link>
                        </td>
                        <td>{str(p.gateway)}</td>
                        <td>
                          <Badge value={p.status} />
                        </td>
                        <td>{str(p.provider_order_id) || "—"}</td>
                        <td>{date(p.last_checked_at)}</td>
                        <td>
                          <Confirm
                            title="Synchronize this payment?"
                            label="Sync"
                            busy={a.busy}
                            onConfirm={() =>
                              a.run(async () => {
                                await api(
                                  "admin/payments/" + str(p.id) + "/sync",
                                  { method: "POST" },
                                );
                                r.reload();
                              }, "")
                            }
                          >
                            This verifies the original payment provider and may capture an approved PayPal
                            payment. It does not mark the order paid manually.
                          </Confirm>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{str(p.provider_event_id)}</td>
                        <td>{str(p.environment)}</td>
                        <td>{str(p.type)}</td>
                        <td>{p.processed_at ? "Yes" : "Pending"}</td>
                        <td>{date(p.created_at)}</td>
                        <td>
                          <Button
                            variant="secondary"
                            disabled={a.busy || !!p.processed_at}
                            onClick={() =>
                              a.run(async () => {
                                await api(
                                  "admin/webhooks/" + str(p.id) + "/retry",
                                  { method: "POST" },
                                );
                                r.reload();
                              }, "")
                            }
                          >
                            Retry processing
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination data={r.data} onPage={setPage} />
        </>
      ) : null}
    </>
  );
}
