"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useAction, useResource } from "@/lib/api";
import { type Row, type PageData, money, rows, str } from "@/lib/types";
import {
  PageHeading,
  Button,
  Form,
  InputField,
  TextAreaField,
  SelectField,
  Check,
  Photo,
  Errors,
  Notice,
  Confirm,
  ResourceState,
  Pagination,
  LinkButton,
  downloadURL,
  Badge,
} from "../ui";
export function AdminProducts() {
  const [page, setPage] = useState(1),
    [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [stock, setStock] = useState("");
  const r = useResource<PageData<Row>>(
    "admin/products?" +
      new URLSearchParams({
        page: String(page),
        q: search,
        ...(status ? { status } : {}),
        ...(stock ? { stock } : {}),
      }),
  );
  return (
    <>
      <PageHeading
        eyebrow="Store & catalog"
        title="Products & inventory"
        action={<LinkButton href="/admin/products/new">Add product</LinkButton>}
      />
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q);
          setPage(1);
        }}
      >
        <InputField
          label="Search name or SKU"
          value={q}
          maxLength={100}
          onChange={(e) => setQ(e.target.value)}
        />
        <SelectField
          label="Publication"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All</option>
          {["draft", "published", "archived"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </SelectField>
        <SelectField
          label="Inventory"
          value={stock}
          onChange={(e) => {
            setStock(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
          <option value="available">Available</option>
        </SelectField>
        <Button variant="secondary">Search</Button>
        <a
          className="button secondary"
          href={downloadURL("admin/exports/products")}
        >
          Export CSV
        </a>
      </form>
      <ResourceState {...r} />
      {r.data ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Variants</th>
                  <th>Available</th>
                  <th>Publication</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {r.data.data.map((p) => (
                  <tr key={str(p.id)}>
                    <td className="wrap">
                      <strong>{str(p.name)}</strong>
                      <p className="muted">{str(p.slug)}</p>
                    </td>
                    <td>{str((p.category as Row | null)?.name) || "—"}</td>
                    <td>{rows(p.variants).length}</td>
                    <td>
                      {rows(p.variants)
                        .filter((v) => v.is_active)
                        .reduce(
                          (s, v) =>
                            s +
                            Math.max(0, Number(v.stock) - Number(v.reserved)),
                          0,
                        )}
                    </td>
                    <td>
                      <Badge value={p.status} />
                    </td>
                    <td>
                      <Link href={"/admin/products/" + str(p.id)}>Edit ↗</Link>
                    </td>
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
const newVariant = (): Row => ({
  sku: "",
  color: "",
  size: "",
  price_cents: 0,
  compare_at_cents: null,
  stock: 0,
  is_active: true,
});
const newProduct = (): Row => ({
  name: "",
  slug: "",
  description: "",
  materials: "",
  care: "",
  category_id: null,
  size_guide_id: null,
  status: "draft",
  returnable: false,
  weight_grams: 0,
  seo_title: "",
  seo_description: "",
  collection_ids: [],
  variants: [newVariant()],
});
export function ProductEditor({ id }: { id: string }) {
  const fresh = id === "new",
    router = useRouter(),
    a = useAction(),
    r = useResource<{ data: Row }>(fresh ? null : "admin/products/" + id);
  const categories = useResource<PageData<Row>>(
      "admin/resources/categories?per_page=100",
    ),
    collections = useResource<PageData<Row>>(
      "admin/resources/collections?per_page=100",
    ),
    guides = useResource<PageData<Row>>(
      "admin/resources/size-guides?per_page=100",
    );
  const [p, setP] = useState<Row>(newProduct),
    [loaded, setLoaded] = useState(fresh),
    [version, setVersion] = useState(0);
  useEffect(() => {
    if (!r.data) return;
    const raw = r.data.data;
    setP({
      ...raw,
      collection_ids: rows(raw.collections).map((c) => Number(c.id)),
      variants: rows(raw.variants),
    });
    setLoaded(true);
  }, [r.data]);
  const set = (k: string, v: unknown) => setP((s) => ({ ...s, [k]: v }));
  const variants = rows(p.variants),
    ids = Array.isArray(p.collection_ids) ? (p.collection_ids as number[]) : [];
  const setVariant = (index: number, key: string, value: unknown) =>
    set(
      "variants",
      variants.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    );
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const body = {
      name: p.name,
      slug: p.slug,
      description: p.description || null,
      materials: p.materials || null,
      care: p.care || null,
      category_id: p.category_id || null,
      size_guide_id: p.size_guide_id || null,
      status: p.status,
      returnable: !!p.returnable,
      weight_grams: Number(p.weight_grams || 0),
      seo_title: p.seo_title || null,
      seo_description: p.seo_description || null,
      collection_ids: ids,
      variants: variants.map((v) => ({
        ...(v.id ? { id: Number(v.id) } : {}),
        sku: v.sku,
        color: v.color,
        size: v.size,
        price_cents: Number(v.price_cents),
        compare_at_cents: v.compare_at_cents
          ? Number(v.compare_at_cents)
          : null,
        stock: Number(v.stock),
        is_active: !!v.is_active,
      })),
    };
    void a.run(async () => {
      const saved = await api<{ data: Row }>(
        "admin/products" + (fresh ? "" : "/" + id),
        { method: fresh ? "POST" : "PUT", body },
      );
      if (fresh) {
        router.replace("/admin/products/" + str(saved.data.id));
        router.refresh();
      } else r.reload();
    }, "Product saved.");
  };
  return (
    <>
      <PageHeading
        eyebrow="Catalog editor"
        title={fresh ? "Add product" : str(p.name) || "Edit product"}
        action={<Link href="/admin/products">← All products</Link>}
      />
      <ResourceState {...r} />
      {loaded ? (
        <div className="admin-form stack">
          <Form
            error={a.error}
            busy={a.busy}
            message={a.message}
            onSubmit={submit}
          >
            <div className="panel stack">
              <h2>Product details</h2>
              <div className="form-grid">
                <InputField
                  label="Product name"
                  name="name"
                  required
                  maxLength={160}
                  value={str(p.name)}
                  onChange={(e) => set("name", e.target.value)}
                />
                <InputField
                  label="URL slug"
                  name="slug"
                  required
                  maxLength={160}
                  pattern="[A-Za-z0-9_-]+"
                  value={str(p.slug)}
                  onChange={(e) => set("slug", e.target.value)}
                />
              </div>
              <TextAreaField
                label="Description"
                name="description"
                maxLength={30000}
                value={str(p.description)}
                onChange={(e) => set("description", e.target.value)}
              />
              <div className="form-grid">
                <TextAreaField
                  label="Materials"
                  name="materials"
                  maxLength={5000}
                  value={str(p.materials)}
                  onChange={(e) => set("materials", e.target.value)}
                />
                <TextAreaField
                  label="Care instructions"
                  name="care"
                  maxLength={5000}
                  value={str(p.care)}
                  onChange={(e) => set("care", e.target.value)}
                />
                <SelectField
                  label="Category"
                  value={str(p.category_id)}
                  onChange={(e) =>
                    set(
                      "category_id",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  <option value="">None</option>
                  {categories.data?.data.map((c) => (
                    <option key={str(c.id)} value={str(c.id)}>
                      {str(c.name)}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Size guide"
                  value={str(p.size_guide_id)}
                  onChange={(e) =>
                    set(
                      "size_guide_id",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  <option value="">None</option>
                  {guides.data?.data.map((c) => (
                    <option key={str(c.id)} value={str(c.id)}>
                      {str(c.name)}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Publication"
                  value={str(p.status)}
                  onChange={(e) => set("status", e.target.value)}
                >
                  {["draft", "published", "archived"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </SelectField>
                <InputField
                  label="Weight (grams)"
                  type="number"
                  min={0}
                  max={100000}
                  value={Number(p.weight_grams || 0)}
                  onChange={(e) => set("weight_grams", Number(e.target.value))}
                />
              </div>
              <Check
                checked={!!p.returnable}
                onChange={(e) => set("returnable", e.target.checked)}
              >
                Eligible for returns under the store policy
              </Check>
              <fieldset>
                <legend>Collections</legend>
                <div className="choices">
                  {collections.data?.data.map((c) => (
                    <Check
                      key={str(c.id)}
                      checked={ids.includes(Number(c.id))}
                      onChange={(e) =>
                        set(
                          "collection_ids",
                          e.target.checked
                            ? [...ids, Number(c.id)]
                            : ids.filter((i) => i !== Number(c.id)),
                        )
                      }
                    >
                      {str(c.name)}
                    </Check>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="panel stack">
              <h2>Colours, sizes & inventory</h2>
              <p className="muted">
                Keep the identity of sold variants unchanged. Deactivate a
                selection to stop selling it. Stock is the total physical
                quantity; reserved units cannot be removed. Save product changes
                before uploading images or applying inventory adjustments.
              </p>
              {variants.map((v, i) => (
                <div className="variant-card" key={str(v.id) || i}>
                  <div className="spread">
                    <h3>Selection {i + 1}</h3>
                    {v.id ? (
                      <Badge
                        value={
                          Number(v.stock) -
                          Number(v.reserved || 0) +
                          " available"
                        }
                      />
                    ) : null}
                  </div>
                  <div className="form-grid">
                    <InputField
                      label="SKU"
                      required
                      maxLength={80}
                      value={str(v.sku)}
                      onChange={(e) => setVariant(i, "sku", e.target.value)}
                    />
                    <InputField
                      label="Colour"
                      required
                      maxLength={80}
                      value={str(v.color)}
                      onChange={(e) => setVariant(i, "color", e.target.value)}
                    />
                    <InputField
                      label="Size"
                      required
                      maxLength={30}
                      value={str(v.size)}
                      onChange={(e) => setVariant(i, "size", e.target.value)}
                    />
                    <InputField
                      label="Price ($)"
                      required
                      type="number"
                      min=".01"
                      step=".01"
                      value={Number(v.price_cents) / 100 || ""}
                      onChange={(e) =>
                        setVariant(
                          i,
                          "price_cents",
                          Math.round(Number(e.target.value) * 100),
                        )
                      }
                    />
                    <InputField
                      label="Compare-at price ($, optional)"
                      type="number"
                      min=".01"
                      step=".01"
                      value={
                        v.compare_at_cents
                          ? Number(v.compare_at_cents) / 100
                          : ""
                      }
                      onChange={(e) =>
                        setVariant(
                          i,
                          "compare_at_cents",
                          e.target.value
                            ? Math.round(Number(e.target.value) * 100)
                            : null,
                        )
                      }
                    />
                    <InputField
                      label="Physical stock"
                      required
                      type="number"
                      min={Number(v.reserved || 0)}
                      max={1000000}
                      value={Number(v.stock)}
                      onChange={(e) =>
                        setVariant(i, "stock", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="actions">
                    <Check
                      checked={!!v.is_active}
                      onChange={(e) =>
                        setVariant(i, "is_active", e.target.checked)
                      }
                    >
                      Active selection
                    </Check>
                    {!v.id && variants.length > 1 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          set(
                            "variants",
                            variants.filter((_, n) => n !== i),
                          )
                        }
                      >
                        Remove unsaved selection
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                disabled={variants.length >= 100}
                onClick={() => set("variants", [...variants, newVariant()])}
              >
                Add colour or size
              </Button>
            </div>
            <div className="panel stack">
              <h2>Search appearance</h2>
              <InputField
                label="SEO title"
                maxLength={160}
                value={str(p.seo_title)}
                onChange={(e) => set("seo_title", e.target.value)}
              />
              <TextAreaField
                label="SEO description"
                maxLength={300}
                value={str(p.seo_description)}
                onChange={(e) => set("seo_description", e.target.value)}
              />
            </div>
            <div className="form-footer actions">
              <Button busy={a.busy}>Save product</Button>
              {!fresh ? (
                <LinkButton
                  href={"/products/" + str(p.slug)}
                  variant="secondary"
                >
                  Preview published product
                </LinkButton>
              ) : null}
            </div>
          </Form>
          {!fresh ? (
            <>
              <ProductImages
                id={id}
                images={rows(p.images)}
                reload={r.reload}
              />
              <InventoryAdjustments variants={variants} reload={r.reload} />
              <Confirm
                title="Archive this product?"
                label="Archive product"
                busy={a.busy}
                onConfirm={() =>
                  a.run(async () => {
                    await api("admin/products/" + id, { method: "DELETE" });
                    r.reload();
                  }, "Product archived.")
                }
              >
                The product will stop appearing in the storefront.
              </Confirm>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
function ProductImages({
  id,
  images,
  reload,
}: {
  id: string;
  images: Row[];
  reload: () => void;
}) {
  const a = useAction(),
    [file, setFile] = useState<File | null>(null);
  return (
    <div className="panel stack">
      <h2>Product photography</h2>
      <Errors error={a.error} />
      <div className="image-list">
        {images.map((im) => (
          <ImageEditor key={str(im.id)} id={id} image={im} reload={reload} />
        ))}
      </div>
      <Form
        error={a.error}
        busy={a.busy}
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          void a.run(async () => {
            if (!file || file.size > 3 * 1024 * 1024)
              throw new Error("Choose an image under 3 MB.");
            d.set("image", file);
            await api("admin/products/" + id + "/images", {
              method: "POST",
              body: d,
            });
            setFile(null);
            reload();
          }, "");
        }}
      >
        <InputField
          label="Image"
          name="image"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <InputField label="Image description" name="alt" maxLength={180} />
        <InputField
          label="Sort order"
          name="sort_order"
          type="number"
          min={0}
          max={1000}
          defaultValue={0}
        />
        <Button busy={a.busy}>Upload image</Button>
      </Form>
    </div>
  );
}
function ImageEditor({
  id,
  image,
  reload,
}: {
  id: string;
  image: Row;
  reload: () => void;
}) {
  const a = useAction();
  return (
    <div>
      <Photo src={str(image.path)} alt={str(image.alt)} />
      <Form
        error={a.error}
        busy={a.busy}
        onSubmit={(e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.currentTarget));
          void a.run(async () => {
            await api("admin/products/" + id + "/images/" + str(image.id), {
              method: "PUT",
              body: { alt: d.alt, sort_order: Number(d.sort_order) },
            });
            reload();
          }, "");
        }}
      >
        <InputField
          label="Description"
          name="alt"
          maxLength={180}
          defaultValue={str(image.alt)}
        />
        <InputField
          label="Position"
          name="sort_order"
          type="number"
          min={0}
          max={1000}
          required
          defaultValue={Number(image.sort_order)}
        />
        <Button busy={a.busy} variant="secondary">
          Save image details
        </Button>
      </Form>
      <Confirm
        title="Remove this image?"
        label="Remove image"
        busy={a.busy}
        onConfirm={() =>
          a.run(async () => {
            await api("admin/products/" + id + "/images/" + str(image.id), {
              method: "DELETE",
            });
            reload();
          }, "")
        }
      >
        The image will be removed from the product.
      </Confirm>
    </div>
  );
}
function InventoryAdjustments({
  variants,
  reload,
}: {
  variants: Row[];
  reload: () => void;
}) {
  return (
    <div className="panel stack">
      <h2>Inventory adjustments</h2>
      <p className="muted">
        Use a positive quantity to add stock or a negative quantity to remove
        it. Each adjustment requires a reason.
      </p>
      {variants
        .filter((v) => v.id)
        .map((v) => (
          <StockForm key={str(v.id)} variant={v} reload={reload} />
        ))}
    </div>
  );
}
function StockForm({ variant, reload }: { variant: Row; reload: () => void }) {
  const a = useAction(),
    key = useRef("");
  return (
    <Form
      error={a.error}
      busy={a.busy}
      message={a.message}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget,
          d = Object.fromEntries(new FormData(form));
        if (!key.current) key.current = crypto.randomUUID();
        void a.run(async () => {
          await api("admin/variants/" + str(variant.id) + "/stock", {
            method: "POST",
            body: {
              request_key: key.current,
              delta: Number(d.delta),
              reason: d.reason,
            },
          });
          key.current = "";
          form.reset();
          reload();
        }, "Inventory adjusted.");
      }}
    >
      <strong>
        {str(variant.sku)} ·{" "}
        {Number(variant.stock) - Number(variant.reserved || 0)} available
      </strong>
      <div className="form-grid">
        <InputField
          label="Adjustment (+/− units)"
          name="delta"
          type="number"
          required
          min={-1000000}
          max={1000000}
        />
        <InputField label="Reason" name="reason" required maxLength={180} />
      </div>
      <Button busy={a.busy} variant="secondary">
        Apply adjustment
      </Button>
    </Form>
  );
}
