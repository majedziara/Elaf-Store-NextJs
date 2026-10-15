import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
function load(file, overrides = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(path.join(root, file), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const localRequire = name => Object.hasOwn(overrides, name) ? overrides[name] : name === "server-only" ? {} : name === "./seo" ? seo : name === "next/headers" ? { cookies: async () => ({ getAll: () => [{name:"nv_session",value:"PRIVATE_SESSION"}] }) } : require(name);
  new Function("require", "module", "exports", code)(localRequire, module, module.exports);
  return module.exports;
}
const seo = load("src/lib/seo.ts");
const analytics = load("src/lib/analytics.ts");
const server = load("src/lib/server.ts");
test("canonicals use the supplied production storefront rather than localhost", () => {
  assert.equal(seo.siteUrl, "https://elaf-store.vercel.app");
  assert.equal(seo.absoluteUrl("/products/example"), "https://elaf-store.vercel.app/products/example");
  const metadata = seo.pageMetadata("/clothing?page=2", "Clothing", "Description");
  assert.equal(metadata.alternates.canonical, "https://elaf-store.vercel.app/clothing?page=2");
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
  assert.equal(metadata.twitter.card, "summary_large_image");
});
for (const pathname of ["/bag", "/checkout/pending", "/account", "/account/orders", "/orders/private-reference", "/admin/gateways", "/api/paypal/return", "/guest-order", "/reset-password", "/returns/private-reference"]) {
  test(`${pathname} cannot be indexed or tracked by analytics`, () => {
    assert.equal(seo.privatePath(pathname), true);
    assert.deepEqual(seo.pageMetadata(pathname, "Private", "", false).robots, {index:false,follow:false});
    assert.equal(analytics.analyticsPath(pathname), null);
    assert.equal(analytics.analyticsLocation("https://elaf-store.vercel.app"+pathname+"?token=PRIVATE"), null);
  });
}
test("public return policies remain crawlable while internal search is not tracked", () => {
  assert.equal(seo.privatePath("/returns"), false);
  assert.equal(analytics.analyticsPath("/returns"), "/returns");
  assert.equal(analytics.analyticsPath("/search"), null);
});
test("analytics discards sensitive query strings and hashes", () => {
  assert.equal(analytics.analyticsLocation("https://elaf-store.vercel.app/clothing?email=buyer@example.com&token=PRIVATE#secret"), "https://elaf-store.vercel.app/clothing");
  assert.equal(analytics.measurementId, "G-KXMX3VBRZ7");
});
test("product markup uses real prices, SKUs, availability and images without fabricated reviews", () => {
  const product = {slug:"test-item", name:"Test Item", description:"Cotton", currency:"USD", images:[{url:"https://media.example.com/storage/item.jpg",alt:"Cotton item"}], variants:[{sku:"SKU-S",price_cents:1850,available:2},{sku:"SKU-L",price_cents:2200,available:0}]};
  const schema = seo.productSchema(product);
  assert.equal(schema.offers[0].price, "18.50");
  assert.equal(schema.offers[0].availability, "https://schema.org/InStock");
  assert.equal(schema.offers[1].availability, "https://schema.org/OutOfStock");
  assert.equal(schema.offers[1].sku,"SKU-L");
  assert.equal(schema.aggregateRating, undefined);
  assert.equal(schema.review, undefined);
  assert.equal(seo.productSchema({...product,images:[]}).image, undefined);
  assert.deepEqual(seo.productMetadata(product).openGraph.images, [{url:product.images[0].url,alt:"Cotton item"}]);
});
test("JSON-LD cannot break out of its script element", () => {
  const input={name:"</script><script>alert(1)</script> & \u2028"};
  const value=seo.jsonLd(input);
  assert.equal(value.includes("<"),false);
  assert.deepEqual(JSON.parse(value),input);
});
test("only public editorial data is cached; availability and private data stay fresh", async () => {
  const original=globalThis.fetch;const requests=[];
  globalThis.fetch=async(url,options)=>{requests.push({url,options});return Response.json({data:{}})};
  try {
    await server.serverGet("settings");
    await server.serverGet("products/test-item");
    await server.serverGet("payment-methods");
    await server.serverGet("auth/me",true);
    assert.equal(requests[0].options.cache,"force-cache");
    assert.equal(requests[0].options.next.revalidate,60);
    assert.equal(requests[0].options.headers.get("Cookie"),null);
    for(const request of requests.slice(1)) assert.equal(request.options.cache,"no-store");
    assert.equal(requests[3].options.headers.get("Cookie"),"nv_session=PRIVATE_SESSION");
  } finally {globalThis.fetch=original;}
});

test("sitemap lists only real public content and published products", async () => {
  const sitemap = load("src/app/sitemap.ts", {
    "@/lib/seo": seo,
    "@/lib/server": { serverGet: async path => {
      if (path === "settings") return {data:{shipping_policy:"Published shipping policy"}};
      if (path === "faqs") return {data:[{question:"A published question"}]};
      if (path === "pages/terms") return {data:{title:"Published terms"}};
      if (path.startsWith("pages/")) throw Object.assign(new Error("Not found"),{status:404});
      return {data:[{slug:"published-item"}],meta:{last_page:1}};
    } },
  }).default;
  const entries = await sitemap();
  const urls = entries.map(entry => entry.url);
  assert.ok(urls.includes("https://elaf-store.vercel.app/products/published-item"));
  assert.ok(urls.includes("https://elaf-store.vercel.app/shipping"));
  assert.ok(urls.includes("https://elaf-store.vercel.app/terms"));
  assert.ok(urls.includes("https://elaf-store.vercel.app/faq"));
  assert.equal(urls.includes("https://elaf-store.vercel.app/privacy"),false);
  assert.ok(entries.every(entry => !entry.lastModified && !seo.privatePath(new URL(entry.url).pathname)));
});
test("a catalog outage cannot publish a successful sitemap that drops product URLs", async () => {
  const sitemap = load("src/app/sitemap.ts", {
    "@/lib/seo": seo,
    "@/lib/server": { serverGet: async path => {
      if (path === "settings") return {data:{}};
      if (path === "faqs") return {data:[]};
      if (path.startsWith("pages/")) throw Object.assign(new Error("Not found"),{status:404});
      throw new Error("Catalog temporarily unavailable");
    } },
  }).default;
  await assert.rejects(sitemap(),/Catalog temporarily unavailable/);
});

test("analytics preserves acquisition sources while stripping referrer paths and secrets", () => {
  assert.equal(analytics.analyticsReferrer("https://www.google.com/search?q=PRIVATE#secret"), "https://www.google.com/");
  assert.equal(analytics.analyticsReferrer("https://referral.example/private/token?email=PRIVATE"), "https://referral.example/");
  for (const value of ["", "not a URL", "javascript:alert(1)", "file:///private/token"]) {
    assert.equal(analytics.analyticsReferrer(value), "");
  }
});

function metadataGenerator(serverGet = async () => ({data:{}})) {
  return load("src/app/(shop)/[[...path]]/page.tsx", {
    "@/lib/seo": seo,
    "@/lib/server": { serverGet },
    "@/lib/navigation": {authTitles:{}},
    ...Object.fromEntries(["home","content","catalog","shop-views","ui"].map(name => ["@/components/"+name,{}])),
  }).generateMetadata;
}
test("catalog pagination remains indexable with its automatically inherited category", async () => {
  const generateMetadata = metadataGenerator();
  for (const category of ["clothing","intimates"]) {
    const metadata = await generateMetadata({params:Promise.resolve({path:[category]}),searchParams:Promise.resolve({category,per_page:"24",page:"2"})});
    assert.equal(metadata.robots.index,true);
    assert.equal(metadata.alternates.canonical,`https://elaf-store.vercel.app/${category}?page=2`);
  }
});
test("additional catalog filters remain excluded from indexing", async () => {
  const generateMetadata = metadataGenerator();
  for (const filters of [{category:"intimates"},{category:"clothing",color:"Ivory"},{size:"L"}]) {
    const metadata = await generateMetadata({params:Promise.resolve({path:["clothing"]}),searchParams:Promise.resolve(filters)});
    assert.equal(metadata.robots.index,false);
    assert.equal(metadata.alternates,undefined);
  }
});
test("published pages use the administrator's SEO title before the visible page heading", async () => {
  const generateMetadata = metadataGenerator(async () => ({data:{title:"Our story",seo_title:"Editorial search title",seo_description:"A search description"}}));
  const metadata = await generateMetadata({params:Promise.resolve({path:["about"]}),searchParams:Promise.resolve({})});
  assert.equal(metadata.title,"Editorial search title");
  assert.equal(metadata.description,"A search description");
});
test("analytics supports every product slug format accepted by the storefront", () => {
  assert.equal(analytics.analyticsPath("/products/soft_rib-bralette"),"/products/soft_rib-bralette");
});
