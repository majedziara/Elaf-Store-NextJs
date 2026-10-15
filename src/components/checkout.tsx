"use client";
import { paymentPresentation } from "@/lib/payment-status";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LockKeyhole,
  Plus,
  Minus,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";
import { api, ApiError, useAction, useResource } from "@/lib/api";
import {
  type Address,
  type Order,
  type Row,
  money,
  states,
  str,
  paymentURL,
  gatewayNames,
  type PaymentGateway,
  rows,
} from "@/lib/types";
import { useStore } from "./providers";
import {
  Button,
  Form,
  InputField,
  SelectField,
  Check as Checkbox,
  Photo,
  PageHeading,
  Errors,
  Empty,
  LinkButton,
  Notice,
  Busy,
  ResourceState,
  downloadURL,
  Confirm,
  Badge,
} from "./ui";
export const blankAddress = (): Address => ({
  name: "",
  line1: "",
  line2: null,
  city: "",
  state: "",
  postal_code: "",
  country: "US",
  phone: null,
});
export const cleanAddress = (a: Address): Address => ({
  name: a.name,
  line1: a.line1,
  line2: a.line2 || null,
  city: a.city,
  state: a.state,
  postal_code: a.postal_code,
  country: "US",
  phone: a.phone || null,
});
export function AddressFields({
  value,
  onChange,
  prefix = "",
  defaults = false,
}: {
  value: Address;
  onChange: (v: Address) => void;
  prefix?: string;
  defaults?: boolean;
}) {
  const input = (
    key: keyof Address,
    name: string,
    autocomplete: string,
    required = false,
    max = 180,
  ) => (
    <InputField
      label={name}
      name={prefix + key}
      value={String(value[key] || "")}
      required={required}
      maxLength={max}
      autoComplete={autocomplete}
      onChange={(e) => onChange({ ...value, [key]: e.target.value || null })}
    />
  );
  return (
    <>
      <div className="form-grid">
        {input("name", "Full name", "name", true, 120)}
        <InputField label="Country" value="United States" readOnly />
      </div>
      {input("line1", "Street address", "address-line1", true)}
      {input("line2", "Apartment, suite, etc.", "address-line2")}
      <div className="form-grid">
        {input("city", "City", "address-level2", true, 100)}
        <SelectField
          label="State"
          name={prefix + "state"}
          value={value.state}
          required
          autoComplete="address-level1"
          onChange={(e) => onChange({ ...value, state: e.target.value })}
        >
          <option value="">Select a state</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        {input("postal_code", "ZIP code", "postal-code", true, 10)}
        {input("phone", "Phone (optional)", "tel", false, 30)}
      </div>
      {defaults ? (
        <>
          <Checkbox
            checked={!!value.default_shipping}
            onChange={(e) =>
              onChange({ ...value, default_shipping: e.target.checked })
            }
          >
            Default shipping address
          </Checkbox>
          <Checkbox
            checked={!!value.default_billing}
            onChange={(e) =>
              onChange({ ...value, default_billing: e.target.checked })
            }
          >
            Default billing address
          </Checkbox>
        </>
      ) : null}
    </>
  );
}
export function BagView() {
  const s = useStore(),
    a = useAction();
  const cart = s.cart;
  return (
    <section className="container section">
      <PageHeading eyebrow="Your edit" title="Shopping bag" />
      {!cart || !cart.items.length || cart.status !== "open" ? (
        <Empty title="Your bag is waiting" href="/new-arrivals">
          Discover clothing and intimates for your everyday wardrobe.
        </Empty>
      ) : (
        <div className="bag-grid">
          <div>
            <Errors error={a.error} />
            {cart.items.map((i) => (
              <article className="bag-line" key={i.variant_id}>
                <Photo src={i.image_url} alt={i.name} />
                <div>
                  <h3>{i.name}</h3>
                  <p className="muted">
                    {i.color} / Size {i.size}
                  </p>
                  <p>{money(i.unit_price_cents)}</p>
                  <div className="quantity">
                    <button
                      disabled={a.busy}
                      aria-label={`Decrease ${i.name}`}
                      onClick={() =>
                        a.run(
                          () => s.setQuantity(i.variant_id, i.quantity - 1),
                          "",
                        )
                      }
                    >
                      <Minus size={15} />
                    </button>
                    <span>{i.quantity}</span>
                    <button
                      disabled={
                        a.busy || i.quantity >= Math.min(20, i.available)
                      }
                      aria-label={`Increase ${i.name}`}
                      onClick={() =>
                        a.run(
                          () => s.setQuantity(i.variant_id, i.quantity + 1),
                          "",
                        )
                      }
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <button
                    className="text-button"
                    disabled={a.busy}
                    onClick={() =>
                      a.run(() => s.setQuantity(i.variant_id, 0), "")
                    }
                  >
                    Remove
                  </button>
                  {!i.purchasable ? (
                    <Notice tone="error">
                      This selection is no longer available. Update or remove it
                      to continue.
                    </Notice>
                  ) : null}
                </div>
                <strong>{money(i.line_total_cents)}</strong>
              </article>
            ))}
          </div>
          <aside className="summary-card">
            <h2>Your bag summary</h2>
            <div className="total-row">
              <span>Subtotal</span>
              <strong>{money(cart.subtotal_cents)}</strong>
            </div>
            <p className="muted">
              Shipping and tax are calculated after you enter your address.
            </p>
            <div className="stack">
              <LinkButton href="/checkout">Continue to checkout</LinkButton>
              <LinkButton href="/new-arrivals" variant="secondary">
                Continue shopping
              </LinkButton>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
type Totals = {
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
};
export function TotalsView({ value }: { value: Totals }) {
  return (
    <>
      <div className="total-row">
        <span>Subtotal</span>
        <span>{money(value.subtotal_cents)}</span>
      </div>
      {value.discount_cents > 0 ? (
        <div className="total-row">
          <span>Discount</span>
          <span>−{money(value.discount_cents)}</span>
        </div>
      ) : null}
      <div className="total-row">
        <span>Shipping</span>
        <span>{money(value.shipping_cents)}</span>
      </div>
      <div className="total-row">
        <span>Tax</span>
        <span>{money(value.tax_cents)}</span>
      </div>
      <div className="total-row grand">
        <span>Total · USD</span>
        <strong>{money(value.total_cents)}</strong>
      </div>
    </>
  );
}
function PaymentMethods({ methods, selected, onChange }: {
  methods: Row[];
  selected: string;
  onChange: (gateway: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Payment method">
      {methods.map((payment) => (
        <label className="method-option" key={str(payment.slug)}>
          <input
            type="radio"
            name="payment_gateway"
            value={str(payment.slug)}
            checked={selected === payment.slug}
            onChange={() => onChange(str(payment.slug))}
            required
          />
          <span>
            {str(payment.name)}
            {payment.environment === "sandbox" ? " · Sandbox" : ""}
          </span>
        </label>
      ))}
    </div>
  );
}
export function CheckoutView() {
  const store = useStore(),
    router = useRouter(),
    a = useAction();
  const [email, setEmail] = useState(""),
    [shipping, setShipping] = useState<Address>(blankAddress),
    [billing, setBilling] = useState<Address>(blankAddress),
    [same, setSame] = useState(true),
    [method, setMethod] = useState(""),
    [gateway, setGateway] = useState(""),
    [coupon, setCoupon] = useState(""),
    [terms, setTerms] = useState(false),
    [quote, setQuote] = useState<Totals | null>(null),
    [quoted, setQuoted] = useState("");
  const key = useRef("");
  const frozen = useRef<Record<string, unknown> | null>(null);
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    if (store.user?.email) setEmail(store.user.email);
  }, [store.user?.email]);
  const methods = useResource<{ data: Row[] }>(
    shipping.state ? "shipping-methods?state=" + shipping.state : null,
  ),
    payments = useResource<{ data: Row[] }>("payment-methods");
  const selectedGateway = payments.data?.data.some((payment) => payment.slug === gateway)
    ? gateway
    : str(payments.data?.data[0]?.slug);
  const addresses = useResource<{ data: Address[] }>(
    store.user ? "account/addresses" : null,
  );
  const payload = {
    email,
    shipping_address: cleanAddress(shipping),
    billing_address: cleanAddress(same ? shipping : billing),
    shipping_method_id: Number(method),
    coupon_code: coupon || null,
  };
  const fingerprint = JSON.stringify(payload);
  const currentQuote = quote && quoted === fingerprint;
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const intent =
      (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ||
      "quote";
    if (intent === "pay" && (!currentQuote || !selectedGateway)) return;
    await a.run(async () => {
      if (intent === "quote") {
        const result = await api<{ data: Totals }>("checkout/quote", {
          method: "POST",
          body: payload,
        });
        setQuote(result.data);
        setQuoted(fingerprint);
        return;
      }
      if (!store.cart) return;
      if (!key.current) {
        const name = "nv-checkout-key-" + store.cart.id;
        key.current = sessionStorage.getItem(name) || crypto.randomUUID();
        sessionStorage.setItem(name, key.current);
      }
      frozen.current = frozen.current || payload;
      let order: Order;
      try {
        order = (
          await api<{ data: Order }>("checkout", {
            method: "POST",
            body: frozen.current,
            headers: { "Idempotency-Key": key.current },
          })
        ).data;
      } catch (error) {
        const e = error as ApiError;
        setUncertain(e.status === 0 || e.status >= 500 || e.status === 409);
        if (e.status > 0 && e.status < 500 && e.status !== 409)
          frozen.current = null;
        throw error;
      }
      router.push("/checkout/pending?order=" + order.uuid + "&gateway=" + encodeURIComponent(selectedGateway));
      await store.refreshCart();
      router.refresh();
    }, "");
  };
  if (!store.cart || store.cart.status !== "open" || !store.cart.items.length)
    return (
      <section className="container section">
        <Empty title="Start with something you love" href="/new-arrivals">
          Your bag is empty or has already been checked out. Visit your orders
          before starting another purchase.
        </Empty>
        <Link href="/account/orders">View your orders</Link>
      </section>
    );
  return (
    <section className="container section">
      <PageHeading
        eyebrow="The final details"
        title="Checkout"
        action={<Link href="/bag">← Return to bag</Link>}
      />
      <div className="checkout-grid">
        <Form onSubmit={submit} error={a.error} busy={a.busy}>
          {uncertain ? (
            <Notice tone="error">
              The result of the last checkout is uncertain. Check your account
              or request a guest order link before starting another order. If
              you do not have the reference, contact customer care with your
              checkout email. Retrying here will use the original details and
              the same purchase key.
            </Notice>
          ) : null}
          <fieldset disabled={a.busy || uncertain} className="stack">
            <section>
              <h2>Contact information</h2>
              <InputField
                label="Email address"
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                readOnly={!!store.user}
                onChange={(e) => setEmail(e.target.value)}
              />
              {!store.user ? (
                <p className="muted">
                  Already have an account?{" "}
                  <Link href="/sign-in?next=/checkout">Sign in</Link>
                </p>
              ) : null}
            </section>
            <section className="checkout-section">
              <h2>Shipping address</h2>
              {addresses.data?.data.length ? (
                <SelectField
                  label="Use a saved address"
                  value=""
                  onChange={(e) => {
                    const saved = addresses.data?.data.find(
                      (x) => String(x.id) === e.target.value,
                    );
                    if (saved) {
                      const {
                        id,
                        default_shipping,
                        default_billing,
                        ...address
                      } = saved;
                      setShipping(address);
                      setMethod("");
                    }
                  }}
                >
                  <option value="">Enter address or choose one</option>
                  {addresses.data.data.map((ad) => (
                    <option key={ad.id} value={ad.id}>
                      {ad.name} · {ad.line1}
                    </option>
                  ))}
                </SelectField>
              ) : null}
              <AddressFields
                value={shipping}
                onChange={(next) => {
                  if (next.state !== shipping.state) setMethod("");
                  setShipping(next);
                }}
                prefix="shipping_address."
              />
            </section>
            <section className="checkout-section">
              <h2>Shipping method</h2>
              <ResourceState {...methods} />
              {methods.data?.data.map((m) => (
                <label className="method-option" key={str(m.id)}>
                  <input
                    type="radio"
                    name="shipping_method_id"
                    value={str(m.id)}
                    checked={method === str(m.id)}
                    required
                    onChange={() => setMethod(str(m.id))}
                  />
                  <span>{str(m.name)}</span>
                  <strong>{money(m.price_cents)}</strong>
                </label>
              ))}
              {shipping.state && methods.data && !methods.data.data.length ? (
                <Notice>
                  No shipping methods are available for this state.
                </Notice>
              ) : null}
            </section>
            <section className="checkout-section">
              <h2>Billing address</h2>
              <Checkbox
                checked={same}
                onChange={(e) => setSame(e.target.checked)}
              >
                Same as shipping address
              </Checkbox>
              {!same ? (
                <AddressFields
                  value={billing}
                  onChange={setBilling}
                  prefix="billing_address."
                />
              ) : null}
            </section>
            <section className="checkout-section">
              <h2>Payment</h2>
              <ResourceState {...payments} />
              <PaymentMethods
                methods={payments.data?.data || []}
                selected={selectedGateway}
                onChange={setGateway}
              />
              {selectedGateway ? (
                <Notice>
                  Continue to {gatewayNames[selectedGateway as PaymentGateway]} to
                  complete your payment securely.
                  {selectedGateway === "triple-a"
                    ? " The payment page shows the available currencies, network and exact amount. Wait for store confirmation before closing checkout."
                    : ""}
                </Notice>
              ) : payments.data ? (
                <Notice tone="error">Payments are currently unavailable.</Notice>
              ) : null}
              <InputField
                label="Discount code (optional)"
                name="coupon_code"
                value={coupon}
                maxLength={60}
                onChange={(e) => setCoupon(e.target.value)}
              />
              <Checkbox
                checked={terms}
                required
                onChange={(e) => setTerms(e.target.checked)}
              >
                I have reviewed the{" "}
                <Link href="/terms" target="_blank">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank">
                  Privacy Policy
                </Link>
                .
              </Checkbox>
            </section>
          </fieldset>
          <div className="actions">
            {uncertain ? (
              <Button
                type="button"
                busy={a.busy}
                onClick={() =>
                  a.run(async () => {
                    const result = await api<{ data: Order }>("checkout", {
                      method: "POST",
                      body: frozen.current,
                      headers: { "Idempotency-Key": key.current },
                    });
                    router.push("/checkout/pending?order=" + result.data.uuid);
                    await store.refreshCart();
                    router.refresh();
                  }, "")
                }
              >
                Check the original checkout again
              </Button>
            ) : (
              <>
                <Button
                  name="intent"
                  value="quote"
                  variant="secondary"
                  busy={a.busy}
                  disabled={!method || !terms}
                >
                  Review total
                </Button>
                <Button
                  name="intent"
                  value="pay"
                  busy={a.busy}
                  disabled={
                    !currentQuote ||
                    !terms ||
                    !selectedGateway
                  }
                >
                  Place order & continue
                </Button>
              </>
            )}
          </div>
          <p className="secure-note">
            <LockKeyhole size={16} /> Payment is confirmed by the store after
            verification with the payment provider.
          </p>
        </Form>
        <aside className="summary-card">
          <h2>Order summary</h2>
          {store.cart.items.map((i) => (
            <div className="mini-line" key={i.variant_id}>
              <Photo src={i.image_url} alt={i.name} />
              <div>
                <h3>{i.name}</h3>
                <p className="muted">
                  {i.color} / {i.size} / Qty {i.quantity}
                </p>
                <span>{money(i.line_total_cents)}</span>
              </div>
            </div>
          ))}
          {currentQuote && quote ? (
            <TotalsView value={quote} />
          ) : (
            <>
              <div className="total-row">
                <span>Subtotal</span>
                <strong>{money(store.cart.subtotal_cents)}</strong>
              </div>
              <p className="muted">
                Enter your address and review the total to calculate shipping,
                discounts, and tax.
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
export function PaymentView({
  orderUUID,
  mode,
  initialGateway = "",
}: {
  orderUUID: string;
  mode: string;
  initialGateway?: string;
}) {
  const r = useResource<{ data: Order }>(
    orderUUID ? "orders/" + orderUUID : null,
  ),
    a = useAction(),
    router = useRouter();
  const [attempt, setAttempt] = useState<Row | null>(null),
    [approved, setApproved] = useState(""),
    [gateway, setGateway] = useState(initialGateway);
  const methods = useResource<{ data: Row[] }>("payment-methods");
  const persistedGateway = str(
    r.data?.data.payments?.at(-1)?.gateway || attempt?.gateway,
  );
  const selectedGateway = persistedGateway || (
    methods.data?.data.some((payment) => payment.slug === gateway)
      ? gateway
      : str(methods.data?.data[0]?.slug)
  );
  const gatewayName = gatewayNames[selectedGateway as PaymentGateway] || "payment provider";
  const automatic = useRef(false);
  useEffect(() => {
    if (!orderUUID) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") r.reload();
    }, 15000);
    return () => clearInterval(t);
  }, [orderUUID, r.reload]);
  useEffect(() => {
    if (mode !== "return" || !r.data || automatic.current) return;
    automatic.current = true;
    void a.run(async () => {
      await api("orders/" + orderUUID + "/payments/capture", {
        method: "POST",
      });
      r.reload();
    }, "");
  }, [mode, r.data, orderUUID]);
  const start = () =>
    a.run(async () => {
      const j = await api<{ data: Row }>(
        "orders/" + orderUUID + "/payments/" + selectedGateway,
        { method: "POST" },
      );
      setAttempt(j.data);
      const u = paymentURL(j.data.gateway, j.data.approval_url);
      if (u) {
        setApproved(u);
        window.location.assign(u);
      }
      r.reload();
    }, "");
  const order = r.data?.data,
    presentation = paymentPresentation(order?.payment_status, mode === "cancel"),
    paid = presentation.confirmed;
  return (
    <section className="container section">
      <div className="status-view">
        <div className="status-symbol">
          {paid ? (
            <Check size={26} />
          ) : mode === "cancel" ? (
            <AlertCircle size={26} />
          ) : (
            <Clock size={26} />
          )}
        </div>
        <h1>
          {presentation.title}
        </h1>
        <ResourceState {...r} />
        {!orderUUID ? (
          <Notice tone="error">
            Open this page from your order or secure guest access link.
          </Notice>
        ) : null}
        {order ? (
          <>
            <p className="muted">Order {order.reference}</p>
            <div className="actions">
              <Badge value={order.payment_status} />
              <Badge value={order.fulfillment_status} />
            </div>
            <p className="muted">
              {presentation.message}
            </p>
            <Errors error={a.error} />
            {attempt ? (
              <p className="muted">Payment status: {str(attempt.status)}</p>
            ) : null}
            {!paid &&
              !persistedGateway &&
              !["expired", "canceled", "reversed", "refunded", "failed"].includes(order.payment_status) ? (
              <div className="stack" style={{ textAlign: "left" }}>
                <ResourceState {...methods} />
                <PaymentMethods
                  methods={methods.data?.data || []}
                  selected={selectedGateway}
                  onChange={setGateway}
                />
                {methods.data && !methods.data.data.length ? (
                  <Notice>Payments are currently unavailable.</Notice>
                ) : null}
              </div>
            ) : null}
            <div className="actions">
              {!paid &&
                !["expired", "canceled", "reversed", "refunded", "failed"].includes(
                  order.payment_status,
                ) ? (
                <>
                  <Button busy={a.busy} disabled={!selectedGateway} onClick={start}>
                    Continue to {gatewayName}
                  </Button>
                  {persistedGateway ? (
                    <Button
                      variant="secondary"
                      busy={a.busy}
                      onClick={() =>
                        a.run(async () => {
                          await api(
                            "orders/" + orderUUID + "/payments/capture",
                            { method: "POST" },
                          );
                          r.reload();
                        }, "")
                      }
                    >
                      Check payment
                    </Button>
                  ) : null}
                </>
              ) : null}
              <Button variant="secondary" onClick={r.reload}>
                Refresh status
              </Button>
              <LinkButton href={"/orders/" + order.uuid} variant="secondary">
                View order
              </LinkButton>
              {order.receipt_available ? (
                <a
                  className="button secondary"
                  href={downloadURL("orders/" + order.uuid + "/receipt")}
                >
                  Download receipt
                </a>
              ) : null}
            </div>
            {approved ? (
              <a href={approved} rel="noreferrer">
                Open {gatewayName} again
              </a>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
export function GuestLookup({ token: initialToken }: { token: string }) {
  const [token] = useState(initialToken),
    a = useAction(),
    router = useRouter();
  useEffect(() => {
    if (initialToken) history.replaceState(null, "", "/guest-order");
  }, [initialToken]);
  return (
    <section className="container section content-page">
      <PageHeading eyebrow="Customer care" title="Find your order">
        Access your order securely with the reference and email used at
        checkout.
      </PageHeading>
      <Form
        error={a.error}
        busy={a.busy}
        message={a.message}
        onSubmit={(e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.currentTarget));
          void a.run(
            async () => {
              if (token) {
                const j = await api<{ data: { order_uuid: string } }>(
                  "guest-orders/consume",
                  { method: "POST", body: { token } },
                );
                router.replace("/orders/" + j.data.order_uuid);
              } else
                await api("guest-orders/access-link", {
                  method: "POST",
                  body: d,
                });
            },
            token
              ? ""
              : "If these details match an order, an access link will be sent to your email.",
          );
        }}
      >
        {token ? (
          <Notice>
            Confirm this link to open your order. This access link can be used
            once.
          </Notice>
        ) : (
          <>
            <InputField
              label="Order reference"
              name="reference"
              required
              maxLength={80}
              placeholder="NV-…"
            />
            <InputField
              label="Checkout email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </>
        )}
        <Button busy={a.busy}>
          {token ? "Open my order" : "Send secure access link"}
        </Button>
      </Form>
    </section>
  );
}
