"use client";
import Link from "next/link";
import { useState } from "react";
import { api, useAction, useResource } from "@/lib/api";
import {
  type Row,
  type Product,
  type PageData,
  rows,
  str,
  safeHttps,
} from "@/lib/types";
import { useStore } from "./providers";
import { ProductGrid } from "./catalog";
import {
  PageHeading,
  Reveal,
  Photo,
  LinkButton,
  Form,
  InputField,
  TextAreaField,
  Button,
  Empty,
  ResourceState,
} from "./ui";
export function Blocks({ blocks }: { blocks: Row[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <div className="content-block" key={i}>
          {b.type === "heading" ? (
            <h2>{str(b.text)}</h2>
          ) : b.type === "paragraph" ? (
            <p className="prose">{str(b.text)}</p>
          ) : b.type === "image" ? (
            <Photo src={str(b.image_path)} alt={str(b.alt)} />
          ) : b.type === "link" && safeHttps(b.url) ? (
            <a href={safeHttps(b.url)!} rel="noopener noreferrer">
              {str(b.text) || "Learn more"} ↗
            </a>
          ) : b.type === "products" ? (
            <SelectedProducts
              ids={
                Array.isArray(b.product_ids) ? b.product_ids.map(Number) : []
              }
            />
          ) : null}
        </div>
      ))}
    </>
  );
}
function SelectedProducts({ ids }: { ids: number[] }) {
  const query = new URLSearchParams({ per_page: "48" });
  ids.slice(0, 30).forEach((id, i) => query.set(`ids[${i}]`, String(id)));
  const r = useResource<PageData<Product>>(
    ids.length ? "products?" + query : null,
  );
  return (
    <>
      <ResourceState {...r} />
      {r.data ? (
        <ProductGrid
          products={ids
            .map((id) => r.data!.data.find((p) => p.id === id))
            .filter((p): p is Product => !!p)}
        />
      ) : null}
    </>
  );
}
export function ContentPage({
  slug,
  page,
}: {
  slug: string;
  page: Row | null;
}) {
  const store = useStore();
  const names: Record<string, string> = {
    about: "About Nella & Vale",
    privacy: "Privacy policy",
    terms: "Terms of service",
    shipping: "Shipping",
    returns: "Returns & exchanges",
  };
  const fallback =
    slug === "shipping"
      ? store.settings.shipping_policy
      : slug === "returns"
        ? store.settings.return_policy
        : null;
  return (
    <section className="container section content-page">
      <PageHeading
        eyebrow="Nella & Vale"
        title={str(page?.title) || names[slug] || "Customer care"}
      />
      {page ? (
        <Blocks blocks={rows(page.blocks)} />
      ) : fallback ? (
        <p className="prose">{fallback}</p>
      ) : slug === "about" ? (
        <div className="stack">
          <Photo
            src="/images/editorial-hero.png"
            alt="Nella & Vale editorial"
          />
          <h2>A wardrobe for your everyday</h2>
          <p>
            Nella & Vale is an online store for women’s clothing and intimates,
            with a collection for US customers and prices in USD.
          </p>
          <p>
            Explore the available pieces, choose a colour and size, and save
            your favourites for later.
          </p>
          <LinkButton href="/new-arrivals">Explore the collection</LinkButton>
        </div>
      ) : (
        <Empty
          title="Please contact us for this information"
          href="/contact"
          linkLabel="Contact customer care"
        >
          This policy has not yet been published. Review the store policies
          before making a purchase.
        </Empty>
      )}
    </section>
  );
}
export function FAQ({ items }: { items: Row[] }) {
  const [q, setQ] = useState("");
  const filtered = items.filter((i) =>
    (str(i.question) + " " + str(i.answer))
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <section className="container section content-page">
      <PageHeading eyebrow="Customer care" title="Questions, answered" />
      <InputField
        label="Find an answer"
        value={q}
        maxLength={100}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="stack" style={{ marginTop: 28 }}>
        {filtered.length ? (
          filtered.map((f) => (
            <details key={str(f.id)}>
              <summary>{str(f.question)}</summary>
              <p className="prose">{str(f.answer)}</p>
            </details>
          ))
        ) : (
          <Empty
            title="Let’s help you find an answer"
            href="/contact"
            linkLabel="Ask customer care"
          />
        )}
      </div>
    </section>
  );
}
export function Contact() {
  const a = useAction(),
    store = useStore();
  return (
    <section className="container section">
      <PageHeading eyebrow="Customer care" title="We’re here to help">
        Questions about a piece, a size, or an order? Send us a note.
      </PageHeading>
      <div className="contact-grid">
        <div className="stack">
          <Photo
            src="/images/editorial-detail.png"
            alt="A thoughtful fabric detail"
          />
          {store.settings.support_email ? (
            <a href={"mailto:" + store.settings.support_email}>
              {store.settings.support_email}
            </a>
          ) : null}
          <Link href="/guest-order">Look up a guest order ↗</Link>
          <Link href="/faq">Browse frequently asked questions ↗</Link>
        </div>
        <Form
          error={a.error}
          message={a.message}
          busy={a.busy}
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const body = Object.fromEntries(new FormData(form));
            void a.run(async () => {
              await api("contact", { method: "POST", body });
              form.reset();
            }, "Your message has been received.");
          }}
        >
          <div className="form-grid">
            <InputField
              label="Your name"
              name="name"
              required
              maxLength={120}
              autoComplete="name"
            />
            <InputField
              label="Email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
          </div>
          <InputField label="Subject" name="subject" required maxLength={180} />
          <InputField
            label="Order reference (optional)"
            name="order_reference"
            maxLength={80}
            placeholder="NV-…"
          />
          <TextAreaField
            label="How can we help?"
            name="message"
            required
            minLength={10}
            maxLength={5000}
          />
          <Button busy={a.busy}>Send message</Button>
        </Form>
      </div>
    </section>
  );
}
export function SizeFit() {
  return (
    <section className="container section content-page">
      <PageHeading eyebrow="Find your fit" title="Size & fit">
        Use the guide on each product page for that piece’s measurements.
      </PageHeading>
      <div className="stack">
        <Photo src="/images/editorial-detail.png" alt="Fabric and fit detail" />
        <h2>A little room to find your size</h2>
        <p>
          Use a flexible measuring tape, keep it level, and avoid pulling it
          tight. Compare your measurements with the guide for the exact product
          you are considering.
        </p>
        <details open>
          <summary>Bust</summary>
          <p>
            Measure around the fullest part of your bust, keeping the tape level
            across your back.
          </p>
        </details>
        <details>
          <summary>Waist</summary>
          <p>Measure around your natural waist while standing comfortably.</p>
        </details>
        <details>
          <summary>Hips</summary>
          <p>
            Measure around the fullest part of your hips, keeping your feet
            together.
          </p>
        </details>
        <p className="muted">
          Sizing can vary between styles. If a product does not have a size
          guide, contact customer care before choosing.
        </p>
        <div className="actions">
          <LinkButton href="/new-arrivals">Browse pieces</LinkButton>
          <LinkButton href="/contact" variant="secondary">
            Ask about sizing
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
