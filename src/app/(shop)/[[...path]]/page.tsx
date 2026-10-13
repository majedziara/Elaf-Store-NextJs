import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { serverGet, serverUser } from "@/lib/server";
import type { Product, PageData, Row } from "@/lib/types";
import { Home, ContentPage, FAQ, Contact, SizeFit } from "@/components/content";
import { CatalogView, ProductView } from "@/components/catalog";
import { AuthView } from "@/components/auth";
import { authTitles } from "@/lib/navigation";
import {
  BagView,
  CheckoutView,
  PaymentView,
  GuestLookup,
} from "@/components/checkout";
import {
  AccountView,
  OrderDetails,
  ReturnCreate,
  ReturnDetails,
} from "@/components/account";
import { Empty } from "@/components/ui";
type Props = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
function query(
  raw: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [
      k,
      Array.isArray(v) ? v[0] || "" : v || "",
    ]),
  );
}
async function content(slug: string) {
  try {
    return (await serverGet<{ data: Row }>("pages/" + slug)).data;
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}
const titles: Record<string, string> = {
  clothing: "Everyday clothing",
  intimates: "Intimates",
  "new-arrivals": "New arrivals",
  search: "Search the collection",
  bag: "Your shopping bag",
  checkout: "Checkout",
  account: "Your account",
  about: "About Nella & Vale",
  privacy: "Privacy policy",
  terms: "Terms of service",
  shipping: "Shipping",
  returns: "Returns & exchanges",
  contact: "Contact",
  faq: "Frequently asked questions",
  "size-fit": "Size & fit",
  "guest-order": "Guest order access",
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const paths = (await params).path || [],
    path = paths.join("/");
  if (paths[0] === "products" && paths.length === 2) {
    try {
      const p = (
        await serverGet<{ data: Product }>(
          "products/" + encodeURIComponent(paths[1]),
        )
      ).data;
      return {
        title: p.seo_title || p.name,
        description:
          p.seo_description || p.description?.slice(0, 155) || undefined,
        alternates: { canonical: "/products/" + p.slug },
        openGraph: {
          title: p.name,
          images: p.images[0]
            ? [{ url: p.images[0].url, alt: p.images[0].alt || p.name }]
            : undefined,
        },
      };
    } catch {
      return { title: "Product" };
    }
  }
  const privatePage =
    (["account", "orders", "checkout", "returns"].includes(paths[0]) &&
      (paths[0] !== "returns" || paths.length > 1)) ||
    Object.hasOwn(authTitles, path) ||
    path === "guest-order";
  return {
    title: titles[path] || authTitles[path] || "Nella & Vale",
    ...(privatePage
      ? { robots: { index: false, follow: false } }
      : { alternates: { canonical: path ? "/" + path : "/" } }),
  };
}
export default async function Page({ params, searchParams }: Props) {
  const paths = (await params).path || [],
    path = paths.join("/"),
    q = query(await searchParams);
  if (!path) {
    const [products, home] = await Promise.all([
      serverGet<PageData<Product>>("products?per_page=8"),
      content("home"),
    ]);
    return <Home products={products.data} home={home} />;
  }
  if (["clothing", "intimates", "new-arrivals", "search"].includes(path)) {
    const filters = new URLSearchParams();
    for (const key of [
      "q",
      "category",
      "collection",
      "color",
      "size",
      "min_cents",
      "max_cents",
      "in_stock",
      "sort",
      "page",
    ])
      if (q[key]) filters.set(key, q[key]);
    if (!filters.has("category") && ["clothing", "intimates"].includes(path))
      filters.set("category", path);
    filters.set("per_page", "24");
    const [data, categories] = await Promise.all([
      serverGet<PageData<Product>>("products?" + filters),
      serverGet<{ data: Row[] }>("categories"),
    ]);
    return (
      <CatalogView
        key={path + "?" + filters}
        title={titles[path]}
        description={
          path === "search"
            ? `Results for “${q.q || ""}”`
            : "Find the colours, shapes, and sizes that fit your everyday."
        }
        data={data}
        categories={categories.data}
        query={Object.fromEntries(filters)}
        path={"/" + path}
      />
    );
  }
  if (paths[0] === "products" && paths.length === 2) {
    let p: Product;
    try {
      p = (
        await serverGet<{ data: Product }>(
          "products/" + encodeURIComponent(paths[1]),
        )
      ).data;
    } catch (e) {
      if ((e as { status: number }).status === 404) notFound();
      throw e;
    }
    const nonce = (await headers()).get("x-nonce") || undefined;
    const json = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: p.description || undefined,
      image: p.images.map((i) => i.url),
      offers: p.variants.length
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: Math.min(...p.variants.map((v) => v.price_cents)) / 100,
            highPrice: Math.max(...p.variants.map((v) => v.price_cents)) / 100,
            offerCount: p.variants.length,
          }
        : undefined,
    }).replace(
      /[<>&\u2028\u2029]/g,
      (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
    );
    return (
      <>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: json }}
        />
        <ProductView product={p} />
      </>
    );
  }
  if (Object.hasOwn(authTitles, path) && path !== "admin-sign-in")
    return <AuthView mode={path} query={q} />;
  if (path === "bag") return <BagView />;
  if (path === "checkout") return <CheckoutView />;
  if (
    paths[0] === "checkout" &&
    paths[1] === "paypal" &&
    ["return", "cancel"].includes(paths[2]) &&
    paths.length === 3
  )
    return <PaymentView orderUUID={q.order || ""} mode={paths[2]} />;
  if (
    paths[0] === "checkout" &&
    ["pending", "confirmed", "failed", "canceled"].includes(paths[1]) &&
    paths.length === 2
  )
    return (
      <PaymentView
        orderUUID={q.order || ""}
        mode={q.returned === "cancel" || paths[1] === "canceled" ? "cancel" : paths[1]}
      />
    );
  if (path === "checkout/digital-currency")
    return (
      <section className="container section">
        <Empty
          title="This payment method is not available"
          href="/checkout"
          linkLabel="Return to checkout"
        >
          Choose an available payment method at checkout.
        </Empty>
      </section>
    );
  if (path === "guest-order") return <GuestLookup token={q.token || ""} />;
  if (paths[0] === "account" && paths.length <= 2) {
    const section = paths[1] || "overview";
    if (
      !["overview", "orders", "addresses", "details", "wishlist"].includes(
        section,
      )
    )
      notFound();
    const user = await serverUser();
    if (!user) redirect("/sign-in?next=" + encodeURIComponent("/" + path));
    return <AccountView section={section} user={user} />;
  }
  if (paths[0] === "orders" && /^[a-f0-9-]{36}$/i.test(paths[1] || "")) {
    if (paths.length === 2) return <OrderDetails uuid={paths[1]} />;
    if (paths.length === 3 && paths[2] === "return")
      return <ReturnCreate uuid={paths[1]} />;
  }
  if (
    paths[0] === "returns" &&
    paths.length === 2 &&
    /^[a-f0-9-]{36}$/i.test(paths[1])
  )
    return <ReturnDetails uuid={paths[1]} orderUUID={q.order || ""} />;
  if (["about", "privacy", "terms", "shipping", "returns"].includes(path))
    return <ContentPage slug={path} page={await content(path)} />;
  if (path === "faq")
    return <FAQ items={(await serverGet<{ data: Row[] }>("faqs")).data} />;
  if (path === "contact") return <Contact />;
  if (path === "size-fit") return <SizeFit />;
  notFound();
}
