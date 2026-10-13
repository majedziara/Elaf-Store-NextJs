"use client";
import { canRequestReturn } from "@/lib/order-eligibility";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api, useAction, useResource } from "@/lib/api";
import {
  type User,
  type Address,
  type Order,
  type Product,
  type PageData,
  type Row,
  money,
  date,
  str,
  rows,
  safeHttps,
} from "@/lib/types";
import { useStore } from "./providers";
import { AccountNav } from "./shell";
import { ProductCard } from "./catalog";
import { AddressFields, blankAddress, TotalsView } from "./checkout";
import {
  PageHeading,
  Button,
  Form,
  InputField,
  TextAreaField,
  SelectField,
  Check,
  Drawer,
  Confirm,
  Errors,
  Notice,
  ResourceState,
  Empty,
  LinkButton,
  Badge,
  Photo,
  Pagination,
  downloadURL,
} from "./ui";
export function AddressView({ address }: { address: Address }) {
  return (
    <address>
      <strong>{address.name}</strong>
      <br />
      {address.line1}
      {address.line2 ? (
        <>
          <br />
          {address.line2}
        </>
      ) : null}
      <br />
      {address.city}, {address.state} {address.postal_code}
      <br />
      United States
      {address.phone ? (
        <>
          <br />
          {address.phone}
        </>
      ) : null}
    </address>
  );
}
export function OrderCard({ order }: { order: Order }) {
  return (
    <article className="order-card">
      <div className="spread">
        <div>
          <p className="eyebrow">{date(order.created_at)}</p>
          <h3>{order.reference}</h3>
        </div>
        <strong>{money(order.total_cents)}</strong>
      </div>
      <div className="actions">
        <Badge value={order.payment_status} />
        <Badge value={order.fulfillment_status} />
        <Link href={"/orders/" + order.uuid}>View order ↗</Link>
      </div>
    </article>
  );
}
export function AccountView({
  section,
  user,
}: {
  section: string;
  user: User;
}) {
  return (
    <section className="container section">
      <div className="account-layout">
        <AccountNav />
        <div className="account-main">
          {section === "orders" ? (
            <MyOrders />
          ) : section === "addresses" ? (
            <Addresses />
          ) : section === "details" ? (
            <Details user={user} />
          ) : section === "wishlist" ? (
            <Wishlist />
          ) : (
            <Overview user={user} />
          )}
        </div>
      </div>
    </section>
  );
}
function Overview({ user }: { user: User }) {
  const r = useResource<{
    data: {
      orders_count: number;
      wishlist_count: number;
      recent_order: Order | null;
      addresses: Address[];
    };
  }>("account/overview");
  return (
    <>
      <PageHeading
        eyebrow="Your own little corner"
        title={`Hello, ${user.name.split(" ")[0]}`}
      >
        Keep track of your orders and the pieces you’ve saved.
      </PageHeading>
      {!user.email_verified ? (
        <Notice>
          Please verify your email.{" "}
          <Link href="/verify-email">Request a new verification link</Link>.
        </Notice>
      ) : null}
      <ResourceState {...r} />
      {r.data ? (
        <div className="stack">
          <div className="card-grid">
            <div className="panel">
              <p className="eyebrow">Orders</p>
              <h2>{r.data.data.orders_count}</h2>
              <Link href="/account/orders">View your orders ↗</Link>
            </div>
            <div className="panel">
              <p className="eyebrow">Saved pieces</p>
              <h2>{r.data.data.wishlist_count}</h2>
              <Link href="/account/wishlist">Open your wishlist ↗</Link>
            </div>
          </div>
          {r.data.data.recent_order ? (
            <OrderCard order={r.data.data.recent_order} />
          ) : (
            <Empty title="Your first chapter starts here" href="/new-arrivals">
              Your orders will appear here after checkout.
            </Empty>
          )}
        </div>
      ) : null}
    </>
  );
}
function MyOrders() {
  const [page, setPage] = useState(1),
    [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("");
  const r = useResource<PageData<Order>>(
    `account/orders?page=${page}&q=${encodeURIComponent(search)}${status ? "&fulfillment_status=" + status : ""}`,
  );
  return (
    <>
      <PageHeading eyebrow="Purchase history" title="My orders" />
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q);
          setPage(1);
        }}
      >
        <InputField
          label="Order reference"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={80}
        />
        <SelectField
          label="Fulfillment"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All orders</option>
          {[
            "unfulfilled",
            "processing",
            "on_hold",
            "shipped",
            "delivered",
            "canceled",
          ].map((s) => (
            <option value={s} key={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </SelectField>
        <Button variant="secondary">Search</Button>
      </form>
      <ResourceState {...r} />
      {r.data ? (
        <>
          <div className="stack">
            {r.data.data.length ? (
              r.data.data.map((o) => <OrderCard key={o.uuid} order={o} />)
            ) : (
              <Empty title="No orders found" href="/new-arrivals" />
            )}
          </div>
          <Pagination data={r.data} onPage={setPage} />
        </>
      ) : null}
    </>
  );
}
function Addresses() {
  const r = useResource<{ data: Address[] }>("account/addresses"),
    a = useAction();
  const [open, setOpen] = useState(false),
    [address, setAddress] = useState<Address>(blankAddress);
  const edit = (ad?: Address) => {
    setAddress(ad || blankAddress());
    setOpen(true);
  };
  return (
    <>
      <PageHeading
        eyebrow="Delivery details"
        title="My addresses"
        action={<Button onClick={() => edit()}>Add address</Button>}
      />
      <Errors error={a.error} />
      <ResourceState {...r} />
      <div className="card-grid">
        {r.data?.data.map((ad) => (
          <article className="address-card" key={ad.id}>
            <AddressView address={ad} />
            <div className="actions">
              {ad.default_shipping ? <Badge value="Default shipping" /> : null}
              {ad.default_billing ? <Badge value="Default billing" /> : null}
            </div>
            <div className="actions">
              <Button variant="secondary" onClick={() => edit(ad)}>
                Edit
              </Button>
              <Confirm
                title="Delete this address?"
                label="Delete"
                busy={a.busy}
                onConfirm={() =>
                  a.run(async () => {
                    await api("account/addresses/" + ad.id, {
                      method: "DELETE",
                    });
                    r.reload();
                  }, "")
                }
              >
                This removes the saved address from your account.
              </Confirm>
            </div>
          </article>
        ))}
      </div>
      {r.data && !r.data.data.length ? (
        <Empty title="Make checkout a little easier">
          Save your shipping and billing addresses here.
        </Empty>
      ) : null}
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title={address.id ? "Edit address" : "Add address"}
      >
        <Form
          error={a.error}
          busy={a.busy}
          onSubmit={(e) => {
            e.preventDefault();
            void a.run(async () => {
              await api(
                "account/addresses" + (address.id ? "/" + address.id : ""),
                { method: address.id ? "PUT" : "POST", body: address },
              );
              setOpen(false);
              r.reload();
            }, "");
          }}
        >
          <AddressFields value={address} onChange={setAddress} defaults />
          <Button busy={a.busy}>Save address</Button>
        </Form>
      </Drawer>
    </>
  );
}
function Details({ user }: { user: User }) {
  const s = useStore();
  const profile = useAction(),
    email = useAction(),
    password = useAction();
  return (
    <div className="stack">
      <PageHeading eyebrow="Your preferences" title="Account details" />
      <div className="panel">
        <h2>Profile</h2>
        <Form
          error={profile.error}
          message={profile.message}
          busy={profile.busy}
          onSubmit={(e) => {
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.currentTarget));
            void profile.run(async () => {
              await api("auth/profile", {
                method: "PUT",
                body: {
                  name: d.name,
                  marketing_opt_in: d.marketing_opt_in === "on",
                },
              });
              await s.refreshUser();
            }, "Your profile has been updated.");
          }}
        >
          <InputField
            label="Full name"
            name="name"
            required
            maxLength={120}
            defaultValue={user.name}
          />
          <InputField
            label="Current email"
            type="email"
            value={s.user?.email || user.email}
            readOnly
          />
          <Check name="marketing_opt_in" defaultChecked={user.marketing_opt_in}>
            Receive store news by email
          </Check>
          <Button busy={profile.busy}>Save profile</Button>
        </Form>
      </div>
      <div className="panel">
        <h2>Change email</h2>
        {s.user?.pending_email ? (
          <Notice>
            A confirmation link is waiting at {s.user.pending_email}.
          </Notice>
        ) : null}
        <Form
          error={email.error}
          busy={email.busy}
          message={email.message}
          onSubmit={(e) => {
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.currentTarget));
            void email.run(async () => {
              await api("auth/change-email", { method: "POST", body: d });
              await s.refreshUser();
            }, "A confirmation link has been sent to your new email.");
          }}
        >
          <InputField
            label="New email"
            name="email"
            type="email"
            required
            maxLength={254}
          />
          <InputField
            label="Current password"
            name="current_password"
            type="password"
            required
            autoComplete="current-password"
          />
          <Button busy={email.busy}>Send confirmation link</Button>
        </Form>
      </div>
      <div className="panel">
        <h2>Change password</h2>
        <Form
          error={password.error}
          busy={password.busy}
          message={password.message}
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget,
              d = Object.fromEntries(new FormData(form));
            void password.run(async () => {
              await api("auth/password", { method: "PUT", body: d });
              form.reset();
            }, "Your password has been updated.");
          }}
        >
          <InputField
            label="Current password"
            name="current_password"
            type="password"
            required
            autoComplete="current-password"
          />
          <InputField
            label="New password"
            name="password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            hint="At least 12 characters, with letters and numbers."
          />
          <InputField
            label="Confirm new password"
            name="password_confirmation"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
          />
          <Button busy={password.busy}>Update password</Button>
        </Form>
      </div>
    </div>
  );
}
function Wishlist() {
  const [page, setPage] = useState(1),
    r = useResource<PageData<Product>>("account/wishlist?page=" + page),
    a = useAction();
  return (
    <>
      <PageHeading eyebrow="Your favourites" title="Wishlist" />
      <Errors error={a.error} />
      <ResourceState {...r} />
      {r.data?.data.length ? (
        <>
          <div className="product-grid">
            {r.data.data.map((p) => (
              <div key={p.id}>
                <ProductCard product={p} />
                <button
                  className="text-button"
                  disabled={a.busy}
                  onClick={() =>
                    a.run(async () => {
                      await api("account/wishlist/" + p.id, {
                        method: "DELETE",
                      });
                      r.reload();
                    }, "")
                  }
                >
                  Remove from wishlist
                </button>
              </div>
            ))}
          </div>
          <Pagination data={r.data} onPage={setPage} />
        </>
      ) : r.data ? (
        <Empty title="Keep the pieces you love close" href="/new-arrivals">
          Save a favourite to find it again here.
        </Empty>
      ) : null}
    </>
  );
}
export function OrderDetails({ uuid }: { uuid: string }) {
  const r = useResource<{ data: Order }>("orders/" + uuid),
    a = useAction(),
    store = useStore(),
    router = useRouter();
  const order = r.data?.data;
  return (
    <section className="container section">
      <PageHeading
        eyebrow="Your purchase"
        title={order?.reference || "Order details"}
      />
      <ResourceState {...r} />
      <Errors error={a.error} />
      {order ? (
        <div className="stack">
          <div className="actions">
            <Badge value={order.payment_status} />
            <Badge value={order.fulfillment_status} />
            <span className="muted">{date(order.created_at)}</span>
          </div>
          <div className="order-layout">
            <div className="panel">
              <h2>Your pieces</h2>
              {order.items.map((i) => (
                <div className="mini-line" key={i.id}>
                  <Photo src={i.image_url} alt={i.product_name} />
                  <div>
                    <h3>{i.product_name}</h3>
                    <p className="muted">
                      {i.color} / {i.size} · Qty {i.quantity}
                    </p>
                    <span>
                      {money(
                        i.unit_price_cents * i.quantity - i.line_discount_cents,
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="panel">
              <h2>Payment summary</h2>
              <TotalsView value={order} />
              {order.refunded_cents > 0 ? (
                <div className="total-row">
                  <span>Refunded</span>
                  <span>{money(order.refunded_cents)}</span>
                </div>
              ) : null}
            </div>
            <div className="panel">
              <h2>Shipping address</h2>
              <AddressView address={order.shipping_address} />
              <p className="muted">{order.shipping_method}</p>
            </div>
            <div className="panel">
              <h2>Billing address</h2>
              <AddressView address={order.billing_address} />
            </div>
          </div>
          {order.shipments.length ? (
            <div className="panel">
              <h2>Shipments</h2>
              {order.shipments.map((ship, i) => (
                <div className="stack" key={i}>
                  <p>
                    {str(ship.carrier)} · {str(ship.tracking_number)}
                  </p>
                  <Badge value={ship.delivered_at ? "delivered" : "shipped"} />
                  {safeHttps(ship.tracking_url) ? (
                    <a
                      href={safeHttps(ship.tracking_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Track shipment ↗
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          <div className="actions">
            {order.paid_at ? (
              <a
                className="button secondary"
                href={downloadURL("orders/" + uuid + "/receipt")}
              >
                Download receipt
              </a>
            ) : (
              <LinkButton href={"/checkout/pending?order=" + uuid}>
                View payment status
              </LinkButton>
            )}
            {!order.paid_at ? (
              <Confirm
                title="Cancel this unpaid order?"
                label="Cancel order"
                busy={a.busy}
                onConfirm={() =>
                  a.run(async () => {
                    await api("orders/" + uuid + "/cancel", { method: "POST" });
                    r.reload();
                  }, "")
                }
              >
                The store will first check that no payment is unresolved.
              </Confirm>
            ) : null}
            {canRequestReturn(order, store.settings) ? (
              <LinkButton
                href={"/orders/" + uuid + "/return"}
                variant="secondary"
              >
                Request return or exchange
              </LinkButton>
            ) : null}
            {store.user?.email_verified && store.user.email === order.email ? (
              <Button
                variant="secondary"
                busy={a.busy}
                onClick={() =>
                  a.run(
                    () =>
                      api("account/orders/" + uuid + "/claim", {
                        method: "POST",
                      }),
                    "Order linked to your account.",
                  )
                }
              >
                Link order to my account
              </Button>
            ) : null}
          </div>
          {a.message ? <Notice>{a.message}</Notice> : null}
          <OrderReturns uuid={uuid} />
          <div className="panel">
            <h2>Order updates</h2>
            <ol className="timeline">
              {order.events.map((e, i) => (
                <li key={i}>
                  {str(e.message)}
                  <time>{date(e.created_at)}</time>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}
function OrderReturns({ uuid }: { uuid: string }) {
  const r = useResource<{ data: Row[] }>("orders/" + uuid + "/returns");
  return r.data?.data.length ? (
    <div className="panel">
      <h2>Return & exchange requests</h2>
      {r.data.data.map((rr) => (
        <div className="spread" key={str(rr.uuid)}>
          <Link href={"/returns/" + str(rr.uuid) + "?order=" + uuid}>
            {str(rr.reference)} ↗
          </Link>
          <Badge value={rr.status} />
        </div>
      ))}
    </div>
  ) : null;
}
export function ReturnCreate({ uuid }: { uuid: string }) {
  const r = useResource<{ data: Order }>("orders/" + uuid),
    a = useAction(),
    store = useStore(),
    router = useRouter();
  const [type, setType] = useState("return"),
    [selected, setSelected] = useState<
      Record<
        number,
        { quantity: number; reason: string; replacement_variant_id: string }
      >
    >({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [replacementOptions, setReplacementOptions] = useState<
    Record<number, Product>
  >({});
  const order = r.data?.data;
  const setLine = (
    id: number,
    patch: Partial<{
      quantity: number;
      reason: string;
      replacement_variant_id: string;
    }>,
  ) =>
    setSelected({
      ...selected,
      [id]: {
        ...(selected[id] || {
          quantity: 1,
          reason: "",
          replacement_variant_id: "",
        }),
        ...patch,
      },
    });
  const findReplacement = async (item: Order["items"][0]) => {
    const found = await api<PageData<Product>>(
      "products?q=" + encodeURIComponent(item.product_name) + "&per_page=48",
    );
    const p = found.data.find((p) =>
      p.variants.some((v) => v.sku === item.sku),
    );
    if (!p)
      throw new Error("This product is no longer available for an exchange.");
    setReplacementOptions((s) => ({ ...s, [item.id]: p }));
  };
  return (
    <section className="container section content-page">
      <PageHeading eyebrow="Customer care" title="Return or exchange" />
      <ResourceState {...r} />
      {order ? (
        <Form
          error={a.error}
          busy={a.busy}
          message={a.message}
          onSubmit={(e) => {
            e.preventDefault();
            const notes = String(
              new FormData(e.currentTarget).get("notes") || "",
            );
            void a.run(async () => {
              if (!canRequestReturn(order, store.settings))
                throw new Error("This order is not eligible under the current return policy.");
              if (!Object.keys(selected).length)
                throw new Error("Select at least one item.");
              const body = {
                type,
                notes,
                items: Object.entries(selected).map(([id, line]) => ({
                  order_item_id: Number(id),
                  quantity: line.quantity,
                  reason: line.reason,
                  replacement_variant_id:
                    type === "exchange"
                      ? Number(line.replacement_variant_id)
                      : null,
                })),
              };
              const rr = await api<{ data: Row }>(
                "orders/" + uuid + "/returns",
                { method: "POST", body },
              );
              if (photos.length) {
                const form = new FormData();
                photos.forEach((file) => form.append("photos[]", file));
                try {
                  await api("returns/" + str(rr.data.uuid) + "/photos", {
                    method: "POST",
                    body: form,
                    headers: { "X-Order-UUID": uuid },
                  });
                } catch {
                  store.toast(
                    "Your request was created. You can add photos from its details page.",
                  );
                }
              }
              router.push("/returns/" + str(rr.data.uuid) + "?order=" + uuid);
            }, "");
          }}
        >
          <SelectField
            label="Request type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="return">Return</option>
            {store.settings.exchanges_enabled ? (
              <option value="exchange">Exchange for another size</option>
            ) : null}
          </SelectField>
          <p className="muted">
            Eligibility and quantities are checked against your order and the
            store policy.
          </p>
          {order.items
            .filter((i) => i.returnable)
            .map((i) => (
              <div className="return-item stack" key={i.id}>
                <Check
                  checked={!!selected[i.id]}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setLine(i.id, {});
                      if (type === "exchange")
                        void a.run(() => findReplacement(i), "");
                    } else {
                      const s = { ...selected };
                      delete s[i.id];
                      setSelected(s);
                    }
                  }}
                >
                  {i.product_name} · {i.color} / {i.size}
                </Check>
                {selected[i.id] ? (
                  <>
                    <InputField
                      label="Quantity"
                      type="number"
                      min={1}
                      max={Math.min(20, i.quantity)}
                      required
                      value={selected[i.id].quantity}
                      onChange={(e) =>
                        setLine(i.id, { quantity: Number(e.target.value) })
                      }
                    />
                    <InputField
                      label="Reason"
                      required
                      maxLength={300}
                      value={selected[i.id].reason}
                      onChange={(e) =>
                        setLine(i.id, { reason: e.target.value })
                      }
                    />
                    {type === "exchange" ? (
                      <>
                        {!replacementOptions[i.id] ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => a.run(() => findReplacement(i), "")}
                          >
                            Find available sizes
                          </Button>
                        ) : null}
                        <SelectField
                          label="Replacement size"
                          required
                          value={selected[i.id].replacement_variant_id}
                          onChange={(e) =>
                            setLine(i.id, {
                              replacement_variant_id: e.target.value,
                            })
                          }
                        >
                          <option value="">Choose another size</option>
                          {replacementOptions[i.id]?.variants
                            .filter(
                              (v) =>
                                v.color === i.color &&
                                v.sku !== i.sku &&
                                v.available > 0 &&
                                v.price_cents === i.unit_price_cents,
                            )
                            .map((v) => (
                              <option value={v.id} key={v.id}>
                                {v.size} · {v.available} available
                              </option>
                            ))}
                        </SelectField>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            ))}
          <TextAreaField
            label="Additional notes (optional)"
            name="notes"
            maxLength={3000}
          />
          <InputField
            label="Photos (optional, up to five)"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (
                files.length > 5 ||
                files.reduce((s, f) => s + f.size, 0) > 3 * 1024 * 1024
              ) {
                e.target.value = "";
                store.toast(
                  "Choose up to five images, with a combined size under 3 MB.",
                );
                return;
              }
              setPhotos(files);
            }}
          />
          <Button busy={a.busy} disabled={!canRequestReturn(order, store.settings) || !Object.keys(selected).length}>
            Submit request
          </Button>
        </Form>
      ) : null}
    </section>
  );
}
export function ReturnDetails({
  uuid,
  orderUUID,
}: {
  uuid: string;
  orderUUID: string;
}) {
  const r = useResource<{ data: Row }>(
      "returns/" + uuid + (orderUUID ? "?order=" + orderUUID : ""),
    ),
    a = useAction();
  const [photos, setPhotos] = useState<File[]>([]);
  const rr = r.data?.data;
  return (
    <section className="container section content-page">
      <PageHeading
        eyebrow="Customer care"
        title={str(rr?.reference) || "Request details"}
      />
      <ResourceState {...r} />
      <Errors error={a.error} />
      {rr ? (
        <div className="stack">
          <div className="actions">
            <Badge value={rr.type} />
            <Badge value={rr.status} />
          </div>
          <p className="prose">{str(rr.notes)}</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order item</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows(rr.items).map((i) => (
                  <tr key={str(i.id)}>
                    <td>{str(i.order_item_id)}</td>
                    <td>{str(i.quantity)}</td>
                    <td className="wrap">{str(i.reason)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="image-list">
            {Array.from(
              { length: Math.min(5, Number(rr.photo_count || 0)) },
              (_, i) => (
                <a
                  key={i}
                  href={downloadURL(
                    "returns/" + uuid + "/photos/" + i + "?order=" + orderUUID,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Image
                    src={downloadURL(
                      "returns/" +
                        uuid +
                        "/photos/" +
                        i +
                        "?order=" +
                        orderUUID,
                    )}
                    alt={`Return photo ${i + 1}`}
                    width={280}
                    height={280}
                    unoptimized
                  />
                </a>
              ),
            )}
          </div>
          <p className="muted">
            {["approved", "received"].includes(str(rr.status))
              ? "Contact customer care for the next shipping or exchange steps."
              : "We’ll keep you updated as your request is reviewed."}
          </p>
          {["submitted", "under_review"].includes(str(rr.status)) ? (
            <Form
              error={a.error}
              busy={a.busy}
              message={a.message}
              onSubmit={(e) => {
                e.preventDefault();
                void a.run(async () => {
                  const f = new FormData();
                  photos.forEach((p) => f.append("photos[]", p));
                  await api("returns/" + uuid + "/photos", {
                    method: "POST",
                    body: f,
                    headers: { "X-Order-UUID": orderUUID },
                  });
                  setPhotos([]);
                  r.reload();
                }, "Photos uploaded.");
              }}
            >
              <InputField
                label="Add photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                required
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (
                    files.length > 5 ||
                    files.reduce((s, f) => s + f.size, 0) > 3 * 1024 * 1024
                  ) {
                    e.target.value = "";
                    return;
                  }
                  setPhotos(files);
                }}
              />
              <Button busy={a.busy} disabled={!photos.length}>
                Upload photos
              </Button>
            </Form>
          ) : null}
          <div className="actions">
            <LinkButton
              href={orderUUID ? "/orders/" + orderUUID : "/guest-order"}
              variant="secondary"
            >
              Back to order
            </LinkButton>
            <LinkButton href="/contact" variant="secondary">
              Contact customer care
            </LinkButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}
