import { Suspense } from "react";
import Link from "next/link";
import { type Product, type Row, rows } from "@/lib/types";
import { ProductGrid } from "./catalog";
import { Blocks } from "./content";
import { HomeHero, BrandRibbon } from "./home-motion";
import { Reveal, Photo, LinkButton, Busy } from "./ui";

export function Home({
  products,
  home,
}: {
  products: Promise<Product[]>;
  home: Promise<Row | null>;
}) {
  return (
    <>
      <HomeHero />
      <BrandRibbon />
      <div className="container">
        <div className="values">
          <Reveal delay={0}>
            <h3>Your colour, your size</h3>
            <p>
              Choose a specific selection and see its availability before adding
              it to your bag.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h3>A clear checkout</h3>
            <p>
              Review shipping, discounts, and tax before continuing to payment.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <h3>Keep your favourites close</h3>
            <p>
              Save the pieces you love and come back to them in your wishlist.
            </p>
          </Reveal>
        </div>
        <section className="section" id="latest-edit">
          <Reveal className="section-title">
            <div>
              <p className="eyebrow">The latest edit</p>
              <h2>New arrivals</h2>
            </div>
            <Link href="/new-arrivals">Explore the collection ↗</Link>
          </Reveal>
          <Suspense fallback={<Busy />}>
            <HomeProducts products={products} />
          </Suspense>
        </section>
        <section className="editorial-band">
          <Reveal className="editorial-visual">
            <Photo
              src="/images/editorial-hero.png"
              alt="Everyday clothing editorial"
            />
          </Reveal>
          <Reveal className="editorial-copy" delay={0.12}>
            <p className="eyebrow">Chapter one</p>
            <h2>Everyday clothing</h2>
            <p className="muted">
              Make space for the styles you reach for, day after day. Explore
              the clothing collection at your own pace.
            </p>
            <LinkButton href="/clothing">Shop clothing</LinkButton>
          </Reveal>
        </section>
        <section className="editorial-band reverse">
          <Reveal className="editorial-copy" delay={0.12}>
            <p className="eyebrow">Chapter two</p>
            <h2>Intimates, your way</h2>
            <p className="muted">
              A personal part of your wardrobe. Explore available colours,
              compare sizes, and choose your fit.
            </p>
            <LinkButton href="/intimates">Shop intimates</LinkButton>
          </Reveal>
          <Reveal className="editorial-visual">
            <Photo
              src="/images/editorial-detail.png"
              alt="Fabric detail for the intimates collection"
            />
          </Reveal>
        </section>
        <Suspense fallback={null}>
          <HomeContent home={home} />
        </Suspense>
      </div>
    </>
  );
}
async function HomeProducts({ products }: { products: Promise<Product[]> }) {
  return <ProductGrid products={(await products).slice(0, 8)} />;
}
async function HomeContent({ home }: { home: Promise<Row | null> }) {
  const content = await home;
  return content ? (
    <section className="section">
      <Blocks blocks={rows(content.blocks)} />
    </section>
  ) : null;
}
