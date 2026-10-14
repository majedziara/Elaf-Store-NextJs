"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import type { Product, PageData, Row } from "@/lib/types";
import { money, rows, str } from "@/lib/types";
import { api, useAction } from "@/lib/api";
import { useStore } from "./providers";
import {
  Photo,
  PageHeading,
  Reveal,
  Button,
  Errors,
  Drawer,
  SelectField,
  InputField,
  Pagination,
  Empty,
} from "./ui";
export function ProductCard({ product }: { product: Product }) {
  const store = useStore(),
    router = useRouter(),
    a = useAction();
  const first = product.variants[0],
    other = product.images[1];
  return (
    <article className="product-card">
      <Link
        href={"/products/" + product.slug}
        className="product-media"
        aria-label={product.name}
      >
        <Photo
          src={product.images[0]?.url}
          alt={product.images[0]?.alt || product.name}
        />
        {other ? (
          <div className="secondary-photo">
            <Photo src={other.url} alt={other.alt || product.name} />
          </div>
        ) : null}
      </Link>
      <button
        className="wishlist-button"
        aria-label={`Save ${product.name} to wishlist`}
        disabled={a.busy}
        onClick={() => {
          if (!store.user) {
            router.push(
              "/sign-in?next=" +
                encodeURIComponent("/products/" + product.slug),
            );
            return;
          }
          void a.run(async () => {
            await api("account/wishlist/" + product.id, { method: "PUT" });
            store.toast("Saved to your wishlist.");
          }, "");
        }}
      >
        <Heart size={18} />
      </button>
      <div className="product-copy">
        <p className="eyebrow">{product.category?.name || "Collection"}</p>
        <h3>
          <Link href={"/products/" + product.slug}>{product.name}</Link>
        </h3>
        <div className="product-meta">
          <span>
            {first
              ? money(Math.min(...product.variants.map((v) => v.price_cents)))
              : "Unavailable"}
          </span>
          <span className="muted">
            {new Set(product.variants.map((v) => v.color)).size}{" "}
            {new Set(product.variants.map((v) => v.color)).size === 1
              ? "colour"
              : "colours"}
          </span>
        </div>
        <Errors error={a.error} />
      </div>
    </article>
  );
}
export function ProductGrid({ products }: { products: Product[] }) {
  return products.length ? (
    <div className="product-grid">
      {products.map((p, index) => (
        <Reveal key={p.id} delay={(index % 4) * 0.075}>
          <ProductCard product={p} />
        </Reveal>
      ))}
    </div>
  ) : (
    <Empty title="Nothing here just yet">
      Try another search or explore a different collection.
    </Empty>
  );
}
export function CatalogView({
  title,
  description,
  data,
  categories,
  query,
  path,
}: {
  title: string;
  description: string;
  data: PageData<Product>;
  categories: Row[];
  query: Record<string, string>;
  path: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(query);
  const update = (patch: Record<string, string>) => {
    const q = new URLSearchParams({ ...query, ...patch });
    for (const [k, v] of q) if (!v) q.delete(k);
    router.push(path + "?" + q);
  };
  const controls = (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        update({ ...filters, page: "1" });
        setOpen(false);
      }}
    >
      <InputField
        label="Search"
        name="q"
        value={filters.q || ""}
        maxLength={100}
        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
      />
      <SelectField
        label="Category"
        value={filters.category || ""}
        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={str(c.id)} value={str(c.slug)}>
            {str(c.name)}
          </option>
        ))}
      </SelectField>
      <InputField
        label="Colour"
        value={filters.color || ""}
        maxLength={80}
        onChange={(e) => setFilters({ ...filters, color: e.target.value })}
      />
      <InputField
        label="Size"
        value={filters.size || ""}
        maxLength={30}
        onChange={(e) => setFilters({ ...filters, size: e.target.value })}
      />
      <div className="form-grid">
        <InputField
          label="Minimum price ($)"
          type="number"
          min="0"
          step=".01"
          value={filters.min_cents ? Number(filters.min_cents) / 100 : ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              min_cents: e.target.value
                ? String(Math.round(Number(e.target.value) * 100))
                : "",
            })
          }
        />
        <InputField
          label="Maximum price ($)"
          type="number"
          min="0"
          step=".01"
          value={filters.max_cents ? Number(filters.max_cents) / 100 : ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              max_cents: e.target.value
                ? String(Math.round(Number(e.target.value) * 100))
                : "",
            })
          }
        />
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={filters.in_stock === "1"}
          onChange={(e) =>
            setFilters({ ...filters, in_stock: e.target.checked ? "1" : "" })
          }
        />
        In stock only
      </label>
      <Button>Apply filters</Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setFilters({});
          router.push(path);
          setOpen(false);
        }}
      >
        Clear filters
      </Button>
    </form>
  );
  return (
    <section className="container section">
      <PageHeading eyebrow="The collection" title={title}>
        {description}
      </PageHeading>
      <div className="catalog-toolbar">
        <span className="muted">
          {data.meta?.total || data.total || data.data.length} pieces
        </span>
        <div className="actions">
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <SlidersHorizontal size={16} /> Filters
          </Button>
          <label className="sr-only" htmlFor="sort">
            Sort products
          </label>
          <select
            id="sort"
            value={query.sort || "newest"}
            onChange={(e) => update({ sort: e.target.value, page: "1" })}
          >
            <option value="newest">Newest arrivals</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
      </div>
      <ProductGrid products={data.data} />
      <Pagination
        data={data}
        onPage={(page) => update({ page: String(page) })}
      />
      <Drawer open={open} onOpenChange={setOpen} title="Find your fit">
        {controls}
      </Drawer>
    </section>
  );
}
export function ProductView({ product }: { product: Product }) {
  const [image, setImage] = useState(0),
    [color, setColor] = useState(product.variants[0]?.color || ""),
    [size, setSize] = useState(""),
    [qty, setQty] = useState(1),
    [guide, setGuide] = useState(false);
  const store = useStore(),
    a = useAction();
  const colors = [...new Set(product.variants.map((v) => v.color))],
    variants = product.variants.filter((v) => v.color === color),
    variant = variants.find((v) => v.size === size),
    price = variant?.price_cents || variants[0]?.price_cents;
  return (
    <section className="container section">
      <nav className="breadcrumbs">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link
          href={
            product.category?.slug === "intimates" ? "/intimates" : "/clothing"
          }
        >
          {product.category?.name || "Collection"}
        </Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <div className="product-detail">
        <div>
          <Photo
            src={product.images[image]?.url}
            alt={product.images[image]?.alt || product.name}
            priority
            className="main-product-photo"
          />
          <div className="thumbnails">
            {product.images.map((im, i) => (
              <button
                key={im.id}
                aria-label={`View image ${i + 1}`}
                aria-pressed={image === i}
                onClick={() => setImage(i)}
              >
                <Photo src={im.url} alt={im.alt || product.name} />
              </button>
            ))}
          </div>
        </div>
        <div className="product-info">
          <p className="eyebrow">{product.category?.name || "Nella & Vale"}</p>
          <h1>{product.name}</h1>
          <div className="price">
            {price ? money(price) : "Currently unavailable"}
            {variant?.compare_at_cents ? (
              <del>{money(variant.compare_at_cents)}</del>
            ) : null}
          </div>
          <p className="prose">{product.description}</p>
          <fieldset>
            <legend>Colour: {color}</legend>
            <div className="choices">
              {colors.map((c) => (
                <button
                  key={c}
                  className={color === c ? "selected" : ""}
                  onClick={() => {
                    setColor(c);
                    setSize("");
                  }}
                  aria-pressed={color === c}
                >
                  {c}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <div className="spread">
              <legend>Choose your size</legend>
              {product.size_guide ? (
                <button className="text-button" onClick={() => setGuide(true)}>
                  Size guide ↗
                </button>
              ) : (
                <Link href="/size-fit">Size & fit ↗</Link>
              )}
            </div>
            <div className="choices">
              {variants.map((v) => (
                <button
                  key={v.id}
                  className={size === v.size ? "selected" : ""}
                  disabled={!v.available}
                  onClick={() => setSize(v.size)}
                  aria-pressed={size === v.size}
                >
                  {v.size}
                  {!v.available ? (
                    <span className="sr-only"> — out of stock</span>
                  ) : null}
                </button>
              ))}
            </div>
          </fieldset>
          <InputField
            label="Quantity"
            type="number"
            min={1}
            max={Math.min(20, variant?.available || 1)}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
          <Errors error={a.error} />
          <Button
            busy={a.busy}
            disabled={
              !variant ||
              !variant.available ||
              qty < 1 ||
              qty > Math.min(20, variant.available)
            }
            onClick={() =>
              variant && a.run(() => store.addItem(variant.id, qty), "")
            }
          >
            {variant ? "Add to bag" : "Choose a size"}
          </Button>
          <p className="muted">
            {variant
              ? `${variant.available} available in this size`
              : "Select a colour and size to check availability."}
          </p>
          {[
            ["Materials", product.materials],
            ["Care", product.care],
          ].map(([n, t]) =>
            t ? (
              <details key={n}>
                <summary>{n}</summary>
                <p className="prose">{t}</p>
              </details>
            ) : null,
          )}
          <details>
            <summary>Shipping & returns</summary>
            <p>Shipping and taxes are calculated at checkout.</p>
            <p>
              {product.returnable
                ? "Return eligibility is subject to the store policy."
                : "This item is not eligible for returns."}
            </p>
            <Link href="/returns">
              Read the return policy <ArrowUpRight size={14} />
            </Link>
          </details>
        </div>
      </div>
      <Drawer open={guide} onOpenChange={setGuide} title="Size guide">
        <SizeGuide content={product.size_guide || {}} />
      </Drawer>
    </section>
  );
}
export function SizeGuide({ content }: { content: Row }) {
  const columns = Array.isArray(content.columns)
      ? content.columns.map(str)
      : [],
    data = Array.isArray(content.rows) ? (content.rows as unknown[][]) : [];
  return (
    <>
      <p className="muted">{str(content.note)}</p>
      {content.unit ? <p>Measurements in {str(content.unit)}</p> : null}
      {columns.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  {(Array.isArray(r) ? r : []).map((v, j) => (
                    <td key={j}>{str(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Contact us for sizing guidance for this product.</p>
      )}
    </>
  );
}
