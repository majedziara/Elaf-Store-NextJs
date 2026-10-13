"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Heart,
  ShoppingBag,
  UserRound,
  Menu,
  ArrowRight,
  Minus,
  Plus,
  LogOut,
} from "lucide-react";
import { useStore } from "./providers";
import { Logo, Drawer, LinkButton, Photo, Button, Errors } from "./ui";
import { money } from "@/lib/types";
import { useAction } from "@/lib/api";
const navigation = [
  ["Clothing", "/clothing"],
  ["Intimates", "/intimates"],
  ["New arrivals", "/new-arrivals"],
  ["Size & fit", "/size-fit"],
  ["Customer care", "/contact"],
];
export function ShopShell({ children }: { children: React.ReactNode }) {
  const store = useStore(),
    path = usePathname();
  const [panel, setPanel] = useState("");
  const [q, setQ] = useState("");
  const router = useRouter();
  const a = useAction();
  const count =
    store.cart?.status === "open"
      ? store.cart.items.reduce((s, i) => s + i.quantity, 0)
      : 0;
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        Everyday clothing & intimates · US orders in USD
      </div>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="icon-button mobile-only"
            onClick={() => setPanel("menu")}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <Logo />
          <nav className="desktop-nav" aria-label="Main navigation">
            {navigation.map(([n, h]) => (
              <Link
                href={h}
                key={h}
                aria-current={path === h ? "page" : undefined}
              >
                {n}
              </Link>
            ))}
          </nav>
          <div className="header-tools">
            <button
              className="icon-button"
              onClick={() => setPanel("search")}
              aria-label="Search"
            >
              <Search />
            </button>
            <Link
              className="icon-button hide-small"
              href="/account/wishlist"
              aria-label="Wishlist"
            >
              <Heart />
            </Link>
            <button
              className="icon-button bag-icon"
              onClick={() => setPanel("bag")}
              aria-label={`Shopping bag, ${count} items`}
            >
              <ShoppingBag />
              {count > 0 ? <span>{count}</span> : null}
            </button>
            <Link
              className="icon-button"
              href={store.user ? "/account" : "/sign-in"}
              aria-label="My account"
            >
              <UserRound />
            </Link>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <Logo />
            <p className="measure">
              Everyday clothing and intimates, with room to find your own style.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            {navigation.slice(0, 4).map(([n, h]) => (
              <Link key={h} href={h}>
                {n}
              </Link>
            ))}
          </div>
          <div>
            <h3>Customer care</h3>
            {[
              ["Orders & tracking", "/guest-order"],
              ["Shipping", "/shipping"],
              ["Returns & exchanges", "/returns"],
              ["FAQs", "/faq"],
              ["Contact", "/contact"],
            ].map(([n, h]) => (
              <Link key={h} href={h}>
                {n}
              </Link>
            ))}
          </div>
          <div>
            <h3>Our store</h3>
            {[
              ["About", "/about"],
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
              ["My account", "/account"],
            ].map(([n, h]) => (
              <Link key={h} href={h}>
                {n}
              </Link>
            ))}
            {store.settings.support_email ? (
              <a href={"mailto:" + store.settings.support_email}>
                {store.settings.support_email}
              </a>
            ) : null}
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Nella & Vale</span>
          <span>United States · USD</span>
        </div>
      </footer>
      <Drawer
        open={panel === "menu"}
        onOpenChange={(o) => !o && setPanel("")}
        title="Explore Nella & Vale"
      >
        <nav className="drawer-nav">
          {navigation.map(([n, h]) => (
            <Link key={h} href={h} onClick={() => setPanel("")}>
              {n}
              <ArrowRight size={18} />
            </Link>
          ))}
          <Link href="/account/wishlist" onClick={() => setPanel("")}>
            Wishlist
          </Link>
          <Link href="/account" onClick={() => setPanel("")}>
            My account
          </Link>
        </nav>
      </Drawer>
      <Drawer
        open={panel === "search"}
        onOpenChange={(o) => !o && setPanel("")}
        title="Find your next favourite"
      >
        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            setPanel("");
            router.push("/search?q=" + encodeURIComponent(q));
          }}
        >
          <label htmlFor="header-search">Search the collection</label>
          <input
            id="header-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={100}
            placeholder="Clothing, intimates, a favourite style…"
          />
          <Button>Search</Button>
        </form>
      </Drawer>
      <Drawer
        open={panel === "bag"}
        onOpenChange={(o) => !o && setPanel("")}
        title={`Your bag (${count})`}
      >
        <Errors error={a.error} />
        {count ? (
          store.cart?.items.map((i) => (
            <div className="mini-line" key={i.variant_id}>
              <Photo src={i.image_url} alt={i.name} />
              <div>
                <h3>{i.name}</h3>
                <p className="muted">
                  {i.color} / {i.size}
                </p>
                <span>{money(i.unit_price_cents)}</span>
                <div className="quantity">
                  <button
                    aria-label={`Decrease ${i.name} quantity`}
                    disabled={a.busy}
                    onClick={() =>
                      a.run(
                        () => store.setQuantity(i.variant_id, i.quantity - 1),
                        "",
                      )
                    }
                  >
                    <Minus size={14} />
                  </button>
                  <span>{i.quantity}</span>
                  <button
                    aria-label={`Increase ${i.name} quantity`}
                    disabled={a.busy || i.quantity >= Math.min(20, i.available)}
                    onClick={() =>
                      a.run(
                        () => store.setQuantity(i.variant_id, i.quantity + 1),
                        "",
                      )
                    }
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">Your bag is ready for something you love.</p>
        )}
        {count ? (
          <>
            <div className="total-row">
              <span>Subtotal</span>
              <strong>{money(store.cart?.subtotal_cents)}</strong>
            </div>
            <p className="muted">
              Shipping and taxes are calculated at checkout.
            </p>
            <div onClick={() => setPanel("")} className="stack">
              <LinkButton href="/bag" variant="secondary">
                View bag
              </LinkButton>
              <LinkButton href="/checkout">Checkout</LinkButton>
            </div>
          </>
        ) : (
          <div onClick={() => setPanel("")}>
            <LinkButton href="/new-arrivals">Explore the collection</LinkButton>
          </div>
        )}
      </Drawer>
    </>
  );
}
export function AccountNav() {
  const path = usePathname(),
    store = useStore(),
    router = useRouter();
  const a = useAction();
  return (
    <aside className="account-nav">
      <p className="eyebrow">Your account</p>
      <p className="account-name">{store.user?.name || "Welcome"}</p>
      {[
        ["Overview", "/account"],
        ["Orders", "/account/orders"],
        ["Addresses", "/account/addresses"],
        ["Account details", "/account/details"],
        ["Wishlist", "/account/wishlist"],
      ].map(([n, h]) => (
        <Link key={h} href={h} aria-current={path === h ? "page" : undefined}>
          {n}
          <ArrowRight size={16} />
        </Link>
      ))}
      <button
        disabled={a.busy}
        onClick={() =>
          a.run(async () => {
            await store.logout();
            router.push("/sign-in");
            router.refresh();
          }, "")
        }
      >
        <LogOut size={16} /> Sign out
      </button>
      <Errors error={a.error} />
    </aside>
  );
}
