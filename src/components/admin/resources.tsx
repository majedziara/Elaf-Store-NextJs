"use client";
import { IdInput } from "./id-input";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useAction, useResource } from "@/lib/api";
import { type Row, type PageData, rows, str, states, money } from "@/lib/types";
import {
  PageHeading,
  Form,
  InputField,
  SelectField,
  TextAreaField,
  Check,
  Button,
  Errors,
  ResourceState,
  Pagination,
  Confirm,
  LinkButton,
  Badge,
  Notice,
} from "../ui";
type FieldSpec = {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "money"
    | "check"
    | "select"
    | "ids"
    | "states"
    | "date";
  required?: boolean;
  max?: number;
  min?: number;
  options?: string[];
  hint?: string;
  nullable?: boolean;
};
type Definition = {
  title: string;
  permission: string;
  fields: FieldSpec[];
  defaults: Row;
  columns: string[];
};
const basic: FieldSpec[] = [
  { key: "name", label: "Name", required: true, max: 160 },
  {
    key: "slug",
    label: "URL slug",
    required: true,
    max: 160,
    hint: "Unique letters, numbers, dashes, or underscores.",
  },
  {
    key: "description",
    label: "Description",
    type: "textarea",
    max: 10000,
    nullable: true,
  },
  {
    key: "sort_order",
    label: "Sort order",
    type: "number",
    min: 0,
    max: 10000,
  },
  { key: "is_active", label: "Active", type: "check" },
];
export const definitions: Record<string, Definition> = {
  categories: {
    title: "Categories",
    permission: "catalog.manage",
    columns: ["name", "slug", "is_active"],
    fields: [
      ...basic,
      {
        key: "parent_id",
        label: "Parent category ID (optional)",
        type: "number",
        min: 1,
        nullable: true,
        hint: "Use the number shown in the category list. Leave empty for a top-level category.",
      },
    ],
    defaults: {
      name: "",
      slug: "",
      description: null,
      sort_order: 0,
      is_active: true,
      parent_id: null,
    },
  },
  collections: {
    title: "Collections",
    permission: "catalog.manage",
    columns: ["name", "slug", "is_active"],
    fields: basic,
    defaults: {
      name: "",
      slug: "",
      description: null,
      sort_order: 0,
      is_active: true,
    },
  },
  "size-guides": {
    title: "Size guides",
    permission: "catalog.manage",
    columns: ["name"],
    fields: [{ key: "name", label: "Name", required: true, max: 120 }],
    defaults: {
      name: "",
      content: {
        unit: "in",
        columns: ["Size", "Bust", "Waist"],
        rows: [],
        note: "",
      },
    },
  },
  "shipping-methods": {
    title: "Shipping methods",
    permission: "settings.manage",
    columns: ["name", "price_cents", "is_active"],
    fields: [
      { key: "name", label: "Name", required: true, max: 120 },
      {
        key: "states",
        label: "Available states",
        type: "states",
        nullable: true,
        hint: "Leave all unchecked to allow every supported US state.",
      },
      {
        key: "price_cents",
        label: "Shipping price ($)",
        type: "money",
        required: true,
        min: 0,
        max: 1000000,
      },
      {
        key: "free_above_cents",
        label: "Free shipping from ($, optional)",
        type: "money",
        nullable: true,
        min: 0,
        max: 100000000,
      },
      { key: "is_active", label: "Active", type: "check" },
    ],
    defaults: {
      name: "",
      states: [],
      price_cents: 0,
      free_above_cents: null,
      is_active: false,
    },
  },
  "tax-rates": {
    title: "Manual tax rules",
    permission: "settings.manage",
    columns: ["state", "postal_code", "basis_points", "tax_shipping"],
    fields: [
      {
        key: "state",
        label: "State",
        type: "select",
        required: true,
        options: states,
      },
      {
        key: "postal_code",
        label: "ZIP code (optional)",
        max: 10,
        nullable: true,
        hint: "Leave empty for a state fallback. ZIP5 or ZIP+4.",
      },
      {
        key: "basis_points",
        label: "Rate (%)",
        type: "number",
        required: true,
        min: 0,
        max: 10000,
        hint: "The input uses percent; 8 means 8%. Set only a rate verified for your business.",
      },
      { key: "tax_shipping", label: "Apply tax to shipping", type: "check" },
    ],
    defaults: {
      state: "",
      postal_code: null,
      basis_points: 0,
      tax_shipping: false,
    },
  },
  coupons: {
    title: "Discount codes",
    permission: "discounts.manage",
    columns: ["code", "type", "value", "is_active"],
    fields: [
      {
        key: "code",
        label: "Code",
        required: true,
        max: 60,
        hint: "3–60 letters, digits, dashes, or underscores.",
      },
      {
        key: "type",
        label: "Discount type",
        type: "select",
        required: true,
        options: ["percentage", "fixed"],
      },
      {
        key: "value",
        label: "Discount value",
        type: "number",
        required: true,
        min: 1,
        max: 100000000,
        hint: "Percentage: enter 10 for 10%. Fixed: enter the amount in dollars.",
      },
      {
        key: "minimum_cents",
        label: "Minimum subtotal ($)",
        type: "money",
        min: 0,
        max: 100000000,
      },
      {
        key: "maximum_discount_cents",
        label: "Maximum discount ($, optional)",
        type: "money",
        nullable: true,
        min: 1,
        max: 100000000,
      },
      {
        key: "usage_limit",
        label: "Total use limit (optional)",
        type: "number",
        nullable: true,
        min: 1,
        max: 1000000,
      },
      {
        key: "starts_at",
        label: "Starts at (your local time)",
        type: "date",
        nullable: true,
      },
      {
        key: "ends_at",
        label: "Ends at (your local time)",
        type: "date",
        nullable: true,
      },
      {
        key: "product_ids",
        label: "Eligible product IDs",
        type: "ids",
        hint: "Comma-separated product numbers. Empty means all products.",
      },
      {
        key: "excluded_product_ids",
        label: "Excluded product IDs",
        type: "ids",
        hint: "Comma-separated product numbers.",
      },
      { key: "is_active", label: "Active", type: "check" },
    ],
    defaults: {
      code: "",
      type: "percentage",
      value: 1000,
      minimum_cents: 0,
      maximum_discount_cents: null,
      usage_limit: null,
      starts_at: null,
      ends_at: null,
      product_ids: [],
      excluded_product_ids: [],
      is_active: false,
    },
  },
  pages: {
    title: "Content pages",
    permission: "content.manage",
    columns: ["title", "slug", "status"],
    fields: [
      { key: "title", label: "Page title", required: true, max: 180 },
      {
        key: "slug",
        label: "URL slug",
        required: true,
        max: 160,
        hint: "Use home, about, privacy, terms, shipping, or returns for those store pages.",
      },
      {
        key: "status",
        label: "Publication",
        type: "select",
        required: true,
        options: ["draft", "published"],
      },
      { key: "seo_title", label: "SEO title", max: 160, nullable: true },
      {
        key: "seo_description",
        label: "SEO description",
        type: "textarea",
        max: 300,
        nullable: true,
      },
    ],
    defaults: {
      title: "",
      slug: "",
      status: "draft",
      blocks: [],
      seo_title: null,
      seo_description: null,
    },
  },
  faqs: {
    title: "Frequently asked questions",
    permission: "content.manage",
    columns: ["category", "question", "is_active"],
    fields: [
      { key: "category", label: "Topic", required: true, max: 100 },
      { key: "question", label: "Question", required: true, max: 300 },
      {
        key: "answer",
        label: "Answer",
        type: "textarea",
        required: true,
        max: 10000,
      },
      {
        key: "sort_order",
        label: "Sort order",
        type: "number",
        min: 0,
        max: 10000,
      },
      { key: "is_active", label: "Active", type: "check" },
    ],
    defaults: {
      category: "",
      question: "",
      answer: "",
      sort_order: 0,
      is_active: true,
    },
  },
};
export function ResourceLinks({ permissions }: { permissions: string[] }) {
  return (
    <nav className="resource-links" aria-label="Manage resources">
      {Object.entries(definitions)
        .filter(([, d]) => permissions.includes(d.permission))
        .map(([r, d]) => (
          <Link href={"/admin/resources/" + r} key={r}>
            {d.title}
          </Link>
        ))}
    </nav>
  );
}
export function ResourceList({
  resource,
  permissions,
}: {
  resource: string;
  permissions: string[];
}) {
  const def = definitions[resource],
    [page, setPage] = useState(1),
    r = useResource<PageData<Row>>(`admin/resources/${resource}?page=${page}`),
    a = useAction();
  return (
    <>
      <PageHeading
        eyebrow="Store administration"
        title={def.title}
        action={
          <LinkButton href={`/admin/resources/${resource}/new`}>
            Add {def.title.toLowerCase()}
          </LinkButton>
        }
      />
      <ResourceLinks permissions={permissions} />
      {resource === "tax-rates" ? (
        <Notice>
          Manual rules require verified business rates. This is not an automated
          US tax service.
        </Notice>
      ) : null}
      <Errors error={a.error} />
      <ResourceState {...r} />
      {r.data ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  {def.columns.map((c) => (
                    <th key={c}>
                      {c.replaceAll("_", " ").replace(" cents", " ($)")}
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {r.data.data.map((row) => (
                  <tr key={str(row.id)}>
                    <td>{str(row.id)}</td>
                    {def.columns.map((c) => (
                      <td
                        key={c}
                        className={
                          ["name", "question", "title"].includes(c)
                            ? "wrap"
                            : ""
                        }
                      >
                        {typeof row[c] === "boolean" ? (
                          <Badge value={row[c] ? "active" : "inactive"} />
                        ) : c.endsWith("_cents") ? (
                          money(row[c])
                        ) : c === "basis_points" ? (
                          Number(row[c]) / 100 + "%"
                        ) : (
                          str(row[c]) || "—"
                        )}
                      </td>
                    ))}
                    <td>
                      <div className="actions">
                        <Link href={`/admin/resources/${resource}/${row.id}`}>
                          Edit ↗
                        </Link>
                        <Confirm
                          title="Delete this record?"
                          label="Delete"
                          busy={a.busy}
                          onConfirm={() =>
                            a.run(async () => {
                              await api(
                                `admin/resources/${resource}/${row.id}`,
                                { method: "DELETE" },
                              );
                              r.reload();
                            }, "")
                          }
                        >
                          This deletes the record. Used discount codes should be
                          deactivated instead.
                        </Confirm>
                      </div>
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
function localDate(value: unknown) {
  if (!value) return "";
  const d = new Date(str(value));
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function ResourceEditor({
  resource,
  id,
}: {
  resource: string;
  id: string;
}) {
  const def = definitions[resource],
    fresh = id === "new",
    r = useResource<{ data: Row }>(
      fresh ? null : `admin/resources/${resource}/${id}`,
    ),
    a = useAction(),
    router = useRouter();
  const [value, setValue] = useState<Row>(def.defaults),
    [loaded, setLoaded] = useState(fresh);
  useEffect(() => {
    if (r.data) {
      setValue(r.data.data);
      setLoaded(true);
    }
  }, [r.data]);
  const set = (key: string, v: unknown) =>
    setValue((s) => ({ ...s, [key]: v }));
  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const body: Row = {};
    for (const f of def.fields)
      body[f.key] =
        value[f.key] ?? (f.nullable ? null : f.type === "check" ? false : "");
    if (resource === "pages") body.blocks = value.blocks || [];
    if (resource === "size-guides") body.content = value.content || {};
    void a.run(async () => {
      const result = await api<{ data: Row }>(
        `admin/resources/${resource}` + (fresh ? "" : "/" + id),
        { method: fresh ? "POST" : "PUT", body },
      );
      if (fresh) {
        router.replace(`/admin/resources/${resource}/${result.data.id}`);
        router.refresh();
      } else r.reload();
    }, "Saved.");
  };
  return (
    <>
      <PageHeading
        eyebrow={def.title}
        title={fresh ? "Create a new record" : "Edit record"}
        action={
          <Link href={"/admin/resources/" + resource}>← Back to list</Link>
        }
      />
      <ResourceState {...r} />
      {loaded ? (
        <Form error={a.error} busy={a.busy} message={a.message} onSubmit={save}>
          <div className="panel admin-form stack">
            {def.fields.map((f) => {
              const v = value[f.key];
              if (f.type === "check")
                return (
                  <Check
                    key={f.key}
                    checked={!!v}
                    onChange={(e) => set(f.key, e.target.checked)}
                  >
                    {f.label}
                  </Check>
                );
              if (f.type === "select")
                return (
                  <SelectField
                    key={f.key}
                    label={f.label}
                    name={f.key}
                    value={str(v)}
                    required={f.required}
                    onChange={(e) => set(f.key, e.target.value)}
                  >
                    <option value="">Select…</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </SelectField>
                );
              if (f.type === "textarea")
                return (
                  <TextAreaField
                    key={f.key}
                    label={f.label}
                    name={f.key}
                    value={str(v)}
                    maxLength={f.max}
                    required={f.required}
                    hint={f.hint}
                    onChange={(e) => set(f.key, e.target.value || null)}
                  />
                );
              if (f.type === "states")
                return (
                  <fieldset key={f.key}>
                    <legend>{f.label}</legend>
                    <p className="muted">{f.hint}</p>
                    <div className="choices">
                      {states.map((s) => (
                        <Check
                          key={s}
                          checked={Array.isArray(v) && v.includes(s)}
                          onChange={(e) =>
                            set(
                              f.key,
                              e.target.checked
                                ? [...(Array.isArray(v) ? v : []), s]
                                : (Array.isArray(v) ? v : []).filter(
                                    (x) => x !== s,
                                  ),
                            )
                          }
                        >
                          {s}
                        </Check>
                      ))}
                    </div>
                  </fieldset>
                );
              if (f.type === "ids")
                return (
                  <IdInput
                    key={f.key}
                    label={f.label}
                    value={v}
                    hint={f.hint}
                    onChange={(ids) => set(f.key, ids)}
                  />
                );
              if (f.type === "date")
                return (
                  <InputField
                    key={f.key}
                    label={f.label}
                    type="datetime-local"
                    value={localDate(v)}
                    onChange={(e) =>
                      set(
                        f.key,
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      )
                    }
                  />
                );
              const numeric = ["money", "number"].includes(f.type || "");
              const scaled =
                f.type === "money" ||
                f.key === "basis_points" ||
                (resource === "coupons" && f.key === "value");
              const displayed =
                v === null || v === undefined
                  ? ""
                  : scaled
                    ? Number(v) / 100
                    : str(v);
              return (
                <InputField
                  key={f.key}
                  label={
                    resource === "coupons" && f.key === "value"
                      ? value.type === "fixed"
                        ? "Discount amount ($)"
                        : "Discount (%)"
                      : f.label
                  }
                  name={f.key}
                  type={numeric ? "number" : "text"}
                  value={displayed}
                  required={f.required}
                  maxLength={numeric ? undefined : f.max}
                  min={
                    numeric && f.min !== undefined
                      ? scaled
                        ? f.min / 100
                        : f.min
                      : undefined
                  }
                  max={
                    numeric && f.max !== undefined
                      ? scaled
                        ? f.max / 100
                        : f.max
                      : undefined
                  }
                  step={numeric ? (scaled ? ".01" : "1") : undefined}
                  hint={f.hint}
                  onChange={(e) =>
                    set(
                      f.key,
                      e.target.value
                        ? numeric
                          ? scaled
                            ? Math.round(Number(e.target.value) * 100)
                            : Number(e.target.value)
                          : e.target.value
                        : f.nullable
                          ? null
                          : numeric
                            ? 0
                            : "",
                    )
                  }
                />
              );
            })}
            {resource === "pages" ? (
              <BlockEditor
                blocks={rows(value.blocks)}
                onChange={(b) => set("blocks", b)}
              />
            ) : null}
            {resource === "size-guides" ? (
              <GuideEditor
                content={(value.content as Row) || {}}
                onChange={(c) => set("content", c)}
              />
            ) : null}
            <Button busy={a.busy}>Save record</Button>
          </div>
        </Form>
      ) : null}
    </>
  );
}
function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: Row[];
  onChange: (b: Row[]) => void;
}) {
  const set = (index: number, key: string, v: unknown) =>
    onChange(blocks.map((b, i) => (i === index ? { ...b, [key]: v } : b)));
  const upload = useAction();
  return (
    <div className="stack">
      <h2>Page content</h2>
      <p className="muted">Use plain text. Blocks appear in the order shown.</p>
      {blocks.map((b, i) => (
        <div className="block-editor stack" key={i}>
          <div className="spread">
            <strong>Block {i + 1}</strong>
            <div className="actions">
              <Button
                type="button"
                variant="secondary"
                disabled={!i}
                onClick={() => {
                  const a = [...blocks];
                  [a[i - 1], a[i]] = [a[i], a[i - 1]];
                  onChange(a);
                }}
              >
                Move up
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onChange(blocks.filter((_, n) => n !== i))}
              >
                Remove
              </Button>
            </div>
          </div>
          <SelectField
            label="Block type"
            required
            value={str(b.type)}
            onChange={(e) =>
              onChange(
                blocks.map((old, n) =>
                  n === i ? { type: e.target.value } : old,
                ),
              )
            }
          >
            {["heading", "paragraph", "image", "link", "products"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </SelectField>
          {["heading", "paragraph", "link"].includes(str(b.type)) ? (
            <TextAreaField
              label={b.type === "link" ? "Link label" : "Text"}
              maxLength={20000}
              value={str(b.text)}
              onChange={(e) => set(i, "text", e.target.value)}
            />
          ) : null}
          {b.type === "link" ? (
            <InputField
              label="Destination URL (HTTPS)"
              type="url"
              value={str(b.url)}
              onChange={(e) => set(i, "url", e.target.value)}
            />
          ) : null}
          {b.type === "image" ? (
            <>
              <InputField
                label="Image description"
                maxLength={180}
                value={str(b.alt)}
                onChange={(e) => set(i, "alt", e.target.value)}
              />
              <InputField
                label="Image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void upload.run(async () => {
                    if (file.size > 3 * 1024 * 1024)
                      throw new Error("Choose an image under 3 MB.");
                    const form = new FormData();
                    form.set("image", file);
                    const j = await api<{ data: Row }>("admin/media", {
                      method: "POST",
                      body: form,
                    });
                    set(i, "image_path", j.data.path);
                  }, "");
                }}
              />
              <small className="muted">
                {b.image_path
                  ? "Image uploaded."
                  : "Choose an image to upload."}
              </small>
            </>
          ) : null}
          {b.type === "products" ? (
            <IdInput
              label="Product IDs, in display order"
              hint="Comma-separated product numbers, up to 30."
              value={b.product_ids}
              onChange={(ids) => set(i, "product_ids", ids)}
            />
          ) : null}
        </div>
      ))}
      <Errors error={upload.error} />
      <Button
        type="button"
        variant="secondary"
        disabled={blocks.length >= 100 || upload.busy}
        onClick={() => onChange([...blocks, { type: "paragraph", text: "" }])}
      >
        Add content block
      </Button>
    </div>
  );
}
function GuideEditor({
  content,
  onChange,
}: {
  content: Row;
  onChange: (c: Row) => void;
}) {
  const set = (k: string, v: unknown) => onChange({ ...content, [k]: v });
  return (
    <div className="stack">
      <h2>Measurements</h2>
      <InputField
        label="Measurement unit"
        value={str(content.unit)}
        onChange={(e) => set("unit", e.target.value)}
        placeholder="in or cm"
      />
      <InputField
        label="Column headings"
        value={Array.isArray(content.columns) ? content.columns.join(", ") : ""}
        onChange={(e) =>
          set(
            "columns",
            e.target.value.split(",").map((v) => v.trim()),
          )
        }
        hint="Separate columns with commas, for example Size, Bust, Waist."
      />
      <TextAreaField
        label="Size rows"
        value={
          Array.isArray(content.rows)
            ? content.rows
                .map((r) => (Array.isArray(r) ? r.join(", ") : ""))
                .join("\n")
            : ""
        }
        onChange={(e) =>
          set(
            "rows",
            e.target.value
              .split("\n")
              .map((line) => line.split(",").map((v) => v.trim())),
          )
        }
        hint="One row per line; separate measurements with commas. Use actual verified product measurements."
      />
      <TextAreaField
        label="Sizing note"
        value={str(content.note)}
        onChange={(e) => set("note", e.target.value)}
      />
    </div>
  );
}
