export type Row = Record<string, unknown>;
export type PageData<T> = {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number };
  current_page?: number;
  last_page?: number;
  total?: number;
};
export interface User {
  id: number;
  name: string;
  email: string;
  pending_email: string | null;
  email_verified: boolean;
  marketing_opt_in: boolean;
  permissions: string[];
}
export interface Variant {
  id: number;
  sku: string;
  color: string;
  size: string;
  price_cents: number;
  compare_at_cents: number | null;
  available: number;
  stock?: number;
  reserved?: number;
  is_active?: boolean;
}
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  materials: string | null;
  care: string | null;
  returnable: boolean;
  category?: { id: number; name: string; slug: string };
  collections: { id: number; name: string; slug: string }[];
  size_guide?: Row | null;
  images: {
    id: number;
    url: string;
    path?: string;
    alt: string | null;
    sort_order: number;
  }[];
  variants: Variant[];
  currency: string;
  status?: string;
  weight_grams?: number;
  category_id?: number | null;
  size_guide_id?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
}
export interface Address {
  id?: number;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: "US";
  phone: string | null;
  default_shipping?: boolean;
  default_billing?: boolean;
}
export interface CartLine {
  variant_id: number;
  product_id: number;
  name: string;
  color: string;
  size: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  available: number;
  purchasable: boolean;
  image_url: string | null;
}
export interface Cart {
  id: number;
  status: string;
  items: CartLine[];
  subtotal_cents: number;
  currency: string;
}
export interface OrderItem {
  id: number;
  product_name: string;
  sku: string;
  color: string;
  size: string;
  quantity: number;
  unit_price_cents: number;
  line_discount_cents: number;
  returnable: boolean;
  image_url?: string | null;
  product_variant_id?: number;
}
export interface Order {
  uuid: string;
  reference: string;
  email: string;
  created_at: string;
  payment_status: string;
  fulfillment_status: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  refunded_cents: number;
  shipping_method: string;
  shipping_address: Address;
  billing_address: Address;
  reservation_expires_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  receipt_available?: boolean;
  items: OrderItem[];
  shipments: Row[];
  refunds: Row[];
  payments: Row[];
  events: Row[];
  returns?: Row[];
  stock_status?: string;
}
export interface Settings {
  brand_name?: string;
  support_email?: string | null;
  logo_path?: string | null;
  checkout_enabled?: boolean;
  shipping_policy?: string | null;
  return_policy?: string | null;
  returns_enabled?: boolean;
  exchanges_enabled?: boolean;
  return_days?: number;
}
export const states =
  "AL,AK,AZ,AR,CA,CO,CT,DE,DC,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY".split(
    ",",
  );
export const money = (n: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n || 0) / 100,
  );
export const date = (s: unknown) =>
  s
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(String(s)))
    : "—";
export const str = (v: unknown) =>
  v === undefined || v === null ? "" : String(v);
export const rows = (v: unknown): Row[] =>
  Array.isArray(v) ? (v as Row[]) : [];
export const label = (v: unknown) =>
  str(v).replaceAll("_", " ").replaceAll("-", " ");
export function mediaURL(value: string | null | undefined): string {
  if (!value) return "/images/product-placeholder.svg";
  if (value.startsWith("/images/")) return value;
  try {
    const base = new URL(
      process.env.NEXT_PUBLIC_MEDIA_URL || "http://127.0.0.1:8000",
    );
    const url = new URL(
      value.startsWith("http")
        ? value
        : "/storage/" + value.replace(/^\/+/, ""),
      base,
    );
    if (
      url.origin === base.origin &&
      url.pathname.startsWith("/storage/") &&
      !url.username &&
      !url.password
    )
      return url.href;
  } catch {}
  return "/images/product-placeholder.svg";
}
export function safeHttps(value: unknown): string | null {
  try {
    const u = new URL(str(value));
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function paypalURL(value: unknown): string | null {
  const url = safeHttps(value);
  if (!url) return null;
  const u = new URL(url);
  return ["www.paypal.com", "www.sandbox.paypal.com"].includes(u.hostname)
    ? url
    : null;
}
