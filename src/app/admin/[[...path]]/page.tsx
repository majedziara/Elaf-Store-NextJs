import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { serverUser } from "@/lib/server";
import { AuthView } from "@/components/auth";
import { AdminShell } from "@/components/admin/shell";
import { AdminProducts, ProductEditor } from "@/components/admin/catalog";
import { ResourceList, ResourceEditor } from "@/components/admin/resources";
import { resourcePermissions } from "@/lib/navigation";
import {
  Dashboard,
  AdminOrders,
  AdminOrder,
  AdminReturns,
  AdminReturn,
  Payments,
} from "@/components/admin/operations";
import {
  Gateways,
  StoreSettings,
  Customers,
  CustomerDetails,
  Messages,
  Team,
  Audit,
} from "@/components/admin/management";
import { Empty } from "@/components/ui";
export const metadata: Metadata = {
  title: "Store administration",
  robots: { index: false, follow: false },
};
type Props = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export default async function Page({ params, searchParams }: Props) {
  const paths = (await params).path || [],
    q = await searchParams,
    path = paths[0] || "";
  if (path === "sign-in" && paths.length === 1)
    return (
      <AuthView
        mode="admin-sign-in"
        query={{ next: typeof q.next === "string" ? q.next : "" }}
      />
    );
  const user = await serverUser();
  if (!user)
    redirect(
      "/admin/sign-in?next=" +
        encodeURIComponent(
          "/admin" + (paths.length ? "/" + paths.join("/") : ""),
        ),
    );
  const permissions: Record<string, string> = {
    "": "dashboard.view",
    products: "catalog.manage",
    orders: "orders.view",
    returns: "returns.manage",
    payments: "payments.manage",
    gateways: "payments.manage",
    settings: "settings.manage",
    customers: "customers.view",
    messages: "messages.manage",
    team: "team.manage",
    audit: "team.manage",
  };
  const permission =
    path === "resources" ? resourcePermissions[paths[1]] : permissions[path];
  if (!permission) notFound();
  if (!user.email_verified || !user.permissions.includes(permission))
    return (
      <AdminShell user={user}>
        <Empty title="This page isn’t available to your account">
          A verified email and the relevant store permission are required.
          Contact your administrator if you need access.
        </Empty>
      </AdminShell>
    );
  let body: React.ReactNode;
  if (!path && paths.length === 0) body = <Dashboard />;
  else if (path === "products" && paths.length === 1) body = <AdminProducts />;
  else if (
    path === "products" &&
    paths.length === 2 &&
    /^(new|\d+)$/.test(paths[1])
  )
    body = <ProductEditor key={paths[1]} id={paths[1]} />;
  else if (path === "resources" && paths.length === 2)
    body = <ResourceList resource={paths[1]} permissions={user.permissions} />;
  else if (
    path === "resources" &&
    paths.length === 3 &&
    /^(new|\d+)$/.test(paths[2])
  )
    body = (
      <ResourceEditor
        key={paths[1] + "/" + paths[2]}
        resource={paths[1]}
        id={paths[2]}
      />
    );
  else if (path === "orders" && paths.length === 1) body = <AdminOrders />;
  else if (
    path === "orders" &&
    paths.length === 2 &&
    /^[a-f0-9-]{36}$/i.test(paths[1])
  )
    body = <AdminOrder uuid={paths[1]} user={user} />;
  else if (path === "returns" && paths.length === 1) body = <AdminReturns />;
  else if (
    path === "returns" &&
    paths.length === 2 &&
    /^[a-f0-9-]{36}$/i.test(paths[1])
  )
    body = <AdminReturn uuid={paths[1]} />;
  else if (path === "payments" && paths.length === 1) body = <Payments />;
  else if (path === "gateways" && paths.length === 1) body = <Gateways />;
  else if (path === "settings" && paths.length === 1) body = <StoreSettings />;
  else if (path === "customers" && paths.length === 1) body = <Customers />;
  else if (path === "customers" && paths.length === 2 && /^\d+$/.test(paths[1]))
    body = <CustomerDetails id={paths[1]} />;
  else if (path === "messages" && paths.length === 1) body = <Messages />;
  else if (path === "messages" && paths.length === 2 && /^\d+$/.test(paths[1]))
    body = <Messages id={paths[1]} />;
  else if (path === "team" && paths.length === 1) body = <Team />;
  else if (path === "audit" && paths.length === 1) body = <Audit />;
  else notFound();
  return <AdminShell user={user}>{body}</AdminShell>;
}
