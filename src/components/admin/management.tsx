"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useAction, useResource } from "@/lib/api";
import {
  type Row,
  type PageData,
  type User,
  type Address,
  type Order,
  str,
  rows,
  date,
  money,
} from "@/lib/types";
import {
  PageHeading,
  Button,
  Form,
  InputField,
  TextAreaField,
  SelectField,
  Check,
  Drawer,
  Errors,
  Notice,
  ResourceState,
  Pagination,
  Confirm,
  Badge,
} from "../ui";
import { AddressView } from "../account";
import { OrdersTable } from "./operations";
export function Gateways() {
  const r = useResource<{ data: Row[] }>("admin/gateways");
  return (
    <>
      <PageHeading eyebrow="Store settings" title="Payment gateways">
        Only implemented and enabled payment methods appear at checkout.
      </PageHeading>
      <ResourceState {...r} />
      <div className="stack">
        {r.data?.data.map((g) =>
          g.slug === "paypal" ? (
            <PayPalSettings key={str(g.slug)} gateway={g} reload={r.reload} />
          ) : (
            <div className="payment-card" key={str(g.slug)}>
              <div className="spread">
                <h3>{str(g.name)}</h3>
                <Badge value="Integration pending" />
              </div>
              <p className="muted">
                This payment adapter has not been implemented. It remains
                disabled and cannot accept store payments.
              </p>
            </div>
          ),
        )}
      </div>
    </>
  );
}
function PayPalSettings({
  gateway,
  reload,
}: {
  gateway: Row;
  reload: () => void;
}) {
  const a = useAction(),
    [env, setEnv] = useState(str(gateway.environment) || "sandbox"),
    [enabled, setEnabled] = useState(!!gateway.enabled);
  const [credentials, setCredentials] = useState<Record<string, string>>({
    client_id: "",
    client_secret: "",
    merchant_id: "",
    webhook_id: "",
  });
  useEffect(() => {
    setEnv(str(gateway.environment));
    setEnabled(!!gateway.enabled);
  }, [gateway]);
  const configured =
    (gateway.configured_fields as Record<string, string[]>) || {};
  return (
    <div className="payment-card">
      <div className="spread">
        <h3>PayPal</h3>
        <div className="actions">
          <Badge value={gateway.enabled ? "enabled" : "disabled"} />
          <Badge value={gateway.environment} />
        </div>
      </div>
      <p className="muted">
        Stored secrets are never displayed. Leave fields empty to preserve
        existing values or use server environment settings.
      </p>
      <Form
        error={a.error}
        busy={a.busy}
        message={a.message}
        onSubmit={(e) => {
          e.preventDefault();
          const fields = Object.fromEntries(
            Object.entries(credentials).filter(([, v]) => v.trim()),
          );
          const body = {
            enabled,
            environment: env,
            ...(Object.keys(fields).length
              ? { credentials: { [env]: fields } }
              : {}),
          };
          void a.run(async () => {
            await api("admin/gateways/paypal", { method: "PUT", body });
            setCredentials({
              client_id: "",
              client_secret: "",
              merchant_id: "",
              webhook_id: "",
            });
            reload();
          }, "PayPal settings saved. Validate them with a real sandbox checkout.");
        }}
      >
        <SelectField
          label="Environment"
          value={env}
          onChange={(e) => {
            setEnv(e.target.value);
            setCredentials({
              client_id: "",
              client_secret: "",
              merchant_id: "",
              webhook_id: "",
            });
          }}
        >
          <option value="sandbox">Sandbox</option>
          <option value="live">Live</option>
        </SelectField>
        {env === "live" ? (
          <Notice>
            Live payments move real money. Use credentials and a webhook
            subscription for your live merchant account.
          </Notice>
        ) : null}
        <Check checked={enabled} onChange={(e) => setEnabled(e.target.checked)}>
          Enable new PayPal payments
        </Check>
        <div className="form-grid">
          {[
            ["client_id", "Client ID"],
            ["client_secret", "Client secret"],
            ["merchant_id", "Merchant ID"],
            ["webhook_id", "Webhook subscription ID"],
          ].map(([key, name]) => (
            <InputField
              key={key}
              label={name}
              type={key === "client_secret" ? "password" : "text"}
              autoComplete="off"
              value={credentials[key]}
              maxLength={
                key === "merchant_id" ? 80 : key === "webhook_id" ? 120 : 255
              }
              placeholder={
                configured[env]?.includes(key)
                  ? "Configured — leave blank to keep"
                  : "Not stored here"
              }
              onChange={(e) =>
                setCredentials({ ...credentials, [key]: e.target.value })
              }
            />
          ))}
        </div>
        <Button busy={a.busy}>Save PayPal settings</Button>
      </Form>
    </div>
  );
}
export function StoreSettings() {
  const r = useResource<{ data: Row[] }>("admin/settings"),
    a = useAction(),
    upload = useAction(),
    router = useRouter();
  const [value, setValue] = useState<Row | null>(null);
  useEffect(() => {
    if (r.data)
      setValue(
        Object.fromEntries(r.data.data.map((x) => [str(x.key), x.value])),
      );
  }, [r.data]);
  const set = (k: string, v: unknown) => setValue((s) => ({ ...s, [k]: v }));
  return (
    <>
      <PageHeading eyebrow="Store configuration" title="Store settings" />
      <ResourceState {...r} />
      {value ? (
        <Form
          error={a.error}
          busy={a.busy}
          message={a.message}
          onSubmit={(e) => {
            e.preventDefault();
            const keys = [
              "brand_name",
              "support_email",
              "logo_path",
              "shipping_policy",
              "return_policy",
              "checkout_enabled",
              "tax_mode",
              "returns_enabled",
              "exchanges_enabled",
              "return_days",
            ];
            const body = Object.fromEntries(keys.map((k) => [k, value[k]]));
            void a.run(async () => {
              await api("admin/settings", { method: "PUT", body });
              r.reload();
              router.refresh();
            }, "Store settings updated.");
          }}
        >
          <div className="panel admin-form stack">
            <h2>Identity & customer care</h2>
            <InputField
              label="Brand name"
              required
              maxLength={120}
              value={str(value.brand_name)}
              onChange={(e) => set("brand_name", e.target.value)}
            />
            <InputField
              label="Support email"
              type="email"
              maxLength={254}
              value={str(value.support_email)}
              onChange={(e) => set("support_email", e.target.value || null)}
            />
            <InputField
              label="Upload store logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void upload.run(async () => {
                  if (file.size > 3 * 1024 * 1024)
                    throw new Error("Choose an image under 3 MB.");
                  const f = new FormData();
                  f.set("image", file);
                  const j = await api<{ data: Row }>("admin/media", {
                    method: "POST",
                    body: f,
                  });
                  set("logo_path", j.data.path);
                }, "Logo uploaded. Save settings to apply it.");
              }}
            />
            <Errors error={upload.error} />
            {upload.message ? <Notice>{upload.message}</Notice> : null}
            <h2>Checkout</h2>
            <SelectField
              label="Tax calculation"
              value={str(value.tax_mode)}
              required
              onChange={(e) => set("tax_mode", e.target.value)}
            >
              <option value="unconfigured" disabled>
                Not configured
              </option>
              <option value="manual">Manual destination rules</option>
              <option value="none">No tax charged</option>
            </SelectField>
            <Notice>
              Choose the tax setup verified for your business. Checkout also
              requires an active shipping method and an enabled, configured
              PayPal gateway.
            </Notice>
            <Check
              checked={!!value.checkout_enabled}
              onChange={(e) => set("checkout_enabled", e.target.checked)}
            >
              Open checkout
            </Check>
            <h2>Shipping policy</h2>
            <TextAreaField
              label="Published shipping policy"
              maxLength={30000}
              value={str(value.shipping_policy)}
              onChange={(e) => set("shipping_policy", e.target.value || null)}
            />
            <h2>Returns & exchanges</h2>
            <TextAreaField
              label="Published return policy"
              maxLength={30000}
              value={str(value.return_policy)}
              onChange={(e) => set("return_policy", e.target.value || null)}
            />
            <InputField
              label="Return window (days after delivery)"
              type="number"
              min={0}
              max={365}
              value={Number(value.return_days || 0)}
              onChange={(e) => set("return_days", Number(e.target.value))}
            />
            <Check
              checked={!!value.returns_enabled}
              onChange={(e) => set("returns_enabled", e.target.checked)}
            >
              Enable return requests
            </Check>
            <Check
              checked={!!value.exchanges_enabled}
              onChange={(e) => set("exchanges_enabled", e.target.checked)}
            >
              Enable size exchanges
            </Check>
            <p className="muted">
              Product eligibility is managed separately. A published page with
              slug shipping or returns takes precedence over these policy text
              fields.
            </p>
            <Button busy={a.busy || upload.busy}>Save store settings</Button>
          </div>
        </Form>
      ) : null}
    </>
  );
}
export function Customers() {
  const [page, setPage] = useState(1),
    [type, setType] = useState("registered"),
    [q, setQ] = useState(""),
    [search, setSearch] = useState("");
  const r = useResource<PageData<Row>>(
    `admin/customers?page=${page}&type=${type}&q=${encodeURIComponent(search)}`,
  );
  return (
    <>
      <PageHeading eyebrow="Customer care" title="Customers" />
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q);
          setPage(1);
        }}
      >
        <InputField
          label="Search"
          maxLength={100}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <SelectField
          label="Customer type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="registered">Registered</option>
          <option value="guest">Guest checkout</option>
        </SelectField>
        <Button variant="secondary">Search</Button>
      </form>
      <ResourceState {...r} />
      {r.data ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Orders</th>
                  <th>{type === "guest" ? "Ordered total" : "Account"}</th>
                </tr>
              </thead>
              <tbody>
                {r.data.data.map((c, i) => (
                  <tr key={str(c.id) || i}>
                    <td>
                      {type === "registered" ? (
                        <Link href={"/admin/customers/" + str(c.id)}>
                          {str(c.name)} ↗
                        </Link>
                      ) : (
                        "Guest"
                      )}
                    </td>
                    <td>{str(c.email)}</td>
                    <td>{str(c.orders_count)}</td>
                    <td>
                      {type === "guest" ? (
                        money(c.ordered_cents)
                      ) : (
                        <Badge value={c.is_active ? "active" : "disabled"} />
                      )}
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
export function CustomerDetails({ id }: { id: string }) {
  const [page, setPage] = useState(1),
    r = useResource<{ data: Row; addresses: Address[]; orders: PageData<Row> }>(
      "admin/customers/" + id + "?page=" + page,
    );
  return (
    <>
      <PageHeading
        eyebrow="Customer profile"
        title={str(r.data?.data.name) || "Customer details"}
      />
      <ResourceState {...r} />
      {r.data ? (
        <div className="stack">
          <div className="panel">
            <p>{str(r.data.data.email)}</p>
            <div className="actions">
              <Badge value={r.data.data.is_active ? "active" : "disabled"} />
              <Badge
                value={
                  r.data.data.email_verified_at
                    ? "email verified"
                    : "email unverified"
                }
              />
            </div>
            <p className="muted">Joined {date(r.data.data.created_at)}</p>
          </div>
          <div className="card-grid">
            {r.data.addresses.map((ad) => (
              <div className="panel" key={ad.id}>
                <AddressView address={ad} />
              </div>
            ))}
          </div>
          <h2>Order history</h2>
          <OrdersTable orders={r.data.orders.data} />
          <Pagination data={r.data.orders} onPage={setPage} />
        </div>
      ) : null}
    </>
  );
}
export function Messages({ id }: { id?: string }) {
  const [page, setPage] = useState(1),
    r = useResource<PageData<Row>>(
      !id ? "admin/contact-messages?page=" + page : null,
    ),
    single = useResource<{ data: Row }>(
      id ? "admin/contact-messages/" + id : null,
    ),
    a = useAction();
  const msg = single.data?.data;
  return (
    <>
      <PageHeading
        eyebrow="Customer care"
        title={id ? "Customer message" : "Customer messages"}
      />
      <ResourceState {...(id ? single : r)} />
      {id && msg ? (
        <div className="stack">
          <div className="panel">
            <h2>{str(msg.subject)}</h2>
            <p>
              {str(msg.name)} · {str(msg.email)}
            </p>
            <p className="muted">
              {date(msg.created_at)} · {str(msg.order_reference)}
            </p>
            <p className="prose">{str(msg.message)}</p>
          </div>
          <Form
            error={a.error}
            busy={a.busy}
            message={a.message}
            onSubmit={(e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget));
              void a.run(async () => {
                await api("admin/contact-messages/" + id, {
                  method: "PUT",
                  body: d,
                });
                single.reload();
              }, "Message updated.");
            }}
          >
            <SelectField
              label="Status"
              name="status"
              defaultValue={str(msg.status)}
              required
            >
              {["new", "in_progress", "closed"].map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              label="Internal note"
              name="admin_note"
              defaultValue={str(msg.admin_note)}
              maxLength={5000}
            />
            <Button busy={a.busy}>Save message</Button>
            <p className="muted">
              Saving a status or note does not send an email reply.
            </p>
            <a className="button secondary" href={"mailto:" + str(msg.email)}>
              Reply using email
            </a>
          </Form>
        </div>
      ) : r.data ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Sender</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {r.data.data.map((m) => (
                  <tr key={str(m.id)}>
                    <td>
                      {str(m.name)}
                      <p className="muted">{str(m.email)}</p>
                    </td>
                    <td className="wrap">
                      <Link href={"/admin/messages/" + str(m.id)}>
                        {str(m.subject)} ↗
                      </Link>
                    </td>
                    <td>
                      <Badge value={m.status} />
                    </td>
                    <td>{date(m.created_at)}</td>
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
export function Team() {
  const [page, setPage] = useState(1),
    r = useResource<PageData<Row>>("admin/team?page=" + page),
    roles = useResource<{ data: Row[] }>("admin/roles"),
    a = useAction();
  const [member, setMember] = useState<Row | null>(null),
    [open, setOpen] = useState(false);
  const roleNames = [
    "admin",
    "catalog_manager",
    "order_manager",
    "content_editor",
    "support",
  ];
  const edit = (row?: Row) => {
    setMember(
      row
        ? { ...row, roles: rows(row.roles).map((role) => str(role.name)) }
        : { name: "", email: "", is_active: true, roles: ["support"] },
    );
    setOpen(true);
  };
  return (
    <>
      <PageHeading
        eyebrow="Access management"
        title="Team & roles"
        action={<Button onClick={() => edit()}>Invite team member</Button>}
      />
      <ResourceState {...r} />
      {r.data ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {r.data.data.map((m) => (
                  <tr key={str(m.id)}>
                    <td>{str(m.name)}</td>
                    <td>{str(m.email)}</td>
                    <td>
                      {rows(m.roles)
                        .map((r) => str(r.name))
                        .join(", ")}
                    </td>
                    <td>
                      <Badge value={m.is_active ? "active" : "disabled"} />
                    </td>
                    <td>
                      <Button variant="secondary" onClick={() => edit(m)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination data={r.data} onPage={setPage} />
        </>
      ) : null}
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title={member?.id ? "Edit team member" : "Invite team member"}
      >
        {member ? (
          <Form
            error={a.error}
            busy={a.busy}
            onSubmit={(e) => {
              e.preventDefault();
              void a.run(async () => {
                const body = {
                  name: member.name,
                  is_active: member.is_active,
                  roles: member.roles,
                  ...(!member.id ? { email: member.email } : {}),
                };
                await api("admin/team" + (member.id ? "/" + member.id : ""), {
                  method: member.id ? "PUT" : "POST",
                  body,
                });
                setOpen(false);
                r.reload();
              }, "");
            }}
          >
            <InputField
              label="Full name"
              required
              maxLength={120}
              value={str(member.name)}
              onChange={(e) => setMember({ ...member, name: e.target.value })}
            />
            {!member.id ? (
              <InputField
                label="Email"
                type="email"
                required
                maxLength={254}
                value={str(member.email)}
                onChange={(e) =>
                  setMember({ ...member, email: e.target.value })
                }
              />
            ) : (
              <InputField label="Email" value={str(member.email)} readOnly />
            )}
            <Check
              checked={!!member.is_active}
              onChange={(e) =>
                setMember({ ...member, is_active: e.target.checked })
              }
            >
              Active account
            </Check>
            <fieldset>
              <legend>Roles</legend>
              <div className="stack">
                {roleNames.map((role) => (
                  <Check
                    key={role}
                    checked={(member.roles as string[]).includes(role)}
                    onChange={(e) =>
                      setMember({
                        ...member,
                        roles: e.target.checked
                          ? [...(member.roles as string[]), role]
                          : (member.roles as string[]).filter(
                              (x) => x !== role,
                            ),
                      })
                    }
                  >
                    {role.replaceAll("_", " ")}
                  </Check>
                ))}
              </div>
            </fieldset>
            {!member.id ? (
              <Notice>
                The new member receives email verification and password setup
                links. No password is entered here.
              </Notice>
            ) : null}
            <Button busy={a.busy}>Save member</Button>
          </Form>
        ) : null}
      </Drawer>
      <div className="stack" style={{ marginTop: 32 }}>
        <h2>Role permissions</h2>
        <ResourceState {...roles} />
        {roles.data?.data.map((role) => (
          <RoleEditor
            key={str(role.id)}
            role={role}
            all={roles.data!.data}
            reload={roles.reload}
          />
        ))}
      </div>
    </>
  );
}
function RoleEditor({
  role,
  all,
  reload,
}: {
  role: Row;
  all: Row[];
  reload: () => void;
}) {
  const a = useAction(),
    [permissions, setPermissions] = useState(
      rows(role.permissions).map((p) => str(p.name)),
    );
  const available = [
    ...new Set(all.flatMap((r) => rows(r.permissions).map((p) => str(p.name)))),
  ];
  const fixed = ["admin", "customer"].includes(str(role.name));
  return (
    <details>
      <summary>
        {str(role.name).replaceAll("_", " ")}
        {fixed ? " — fixed permissions" : ""}
      </summary>
      <Errors error={a.error} />
      <div className="choices">
        {available.map((p) => (
          <Check
            key={p}
            disabled={fixed || a.busy}
            checked={permissions.includes(p)}
            onChange={(e) =>
              setPermissions(
                e.target.checked
                  ? [...permissions, p]
                  : permissions.filter((x) => x !== p),
              )
            }
          >
            {p.replaceAll(".", " / ")}
          </Check>
        ))}
      </div>
      {!fixed ? (
        <Confirm
          title="Replace this role’s permissions?"
          label="Save role permissions"
          busy={a.busy}
          onConfirm={() =>
            a.run(async () => {
              await api("admin/roles/" + str(role.id) + "/permissions", {
                method: "PUT",
                body: { permissions },
              });
              reload();
            }, "Role permissions updated.")
          }
        >
          This affects every account assigned to the role.
        </Confirm>
      ) : null}
    </details>
  );
}
export function Audit() {
  const [page, setPage] = useState(1),
    r = useResource<PageData<Row>>("admin/audit-log?page=" + page);
  return (
    <>
      <PageHeading eyebrow="Access & operations" title="Audit log" />
      <ResourceState {...r} />
      {r.data ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Subject</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {r.data.data.map((log) => (
                  <tr key={str(log.id)}>
                    <td>{date(log.created_at)}</td>
                    <td>{str(log.actor_id) || "System"}</td>
                    <td>{str(log.action).replaceAll("_", " ")}</td>
                    <td>
                      {str(log.subject)} #{str(log.subject_id)}
                    </td>
                    <td className="wrap">
                      {log.metadata ? (
                        <details>
                          <summary>View details</summary>
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </details>
                      ) : null}
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
