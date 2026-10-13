"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  RotateCcw,
  Ticket,
  FileText,
  CreditCard,
  Settings,
  ShieldCheck,
  MessageSquare,
  ClipboardList,
  Menu,
  LogOut,
} from "lucide-react";
import type { User } from "@/lib/types";
import { useAction } from "@/lib/api";
import { useStore } from "../providers";
import { Logo, Drawer, Button, Errors } from "../ui";
export const adminNav = [
  {
    label: "Overview",
    href: "/admin",
    permission: "dashboard.view",
    icon: LayoutDashboard,
  },
  {
    label: "Orders",
    href: "/admin/orders",
    permission: "orders.view",
    icon: ShoppingBag,
  },
  {
    label: "Products & inventory",
    href: "/admin/products",
    permission: "catalog.manage",
    icon: Package,
  },
  {
    label: "Categories & collections",
    href: "/admin/resources/categories",
    permission: "catalog.manage",
    icon: Package,
  },
  {
    label: "Returns & exchanges",
    href: "/admin/returns",
    permission: "returns.manage",
    icon: RotateCcw,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    permission: "customers.view",
    icon: Users,
  },
  {
    label: "Discounts",
    href: "/admin/resources/coupons",
    permission: "discounts.manage",
    icon: Ticket,
  },
  {
    label: "Pages & FAQs",
    href: "/admin/resources/pages",
    permission: "content.manage",
    icon: FileText,
  },
  {
    label: "Payments & events",
    href: "/admin/payments",
    permission: "payments.manage",
    icon: CreditCard,
  },
  {
    label: "Payment gateways",
    href: "/admin/gateways",
    permission: "payments.manage",
    icon: CreditCard,
  },
  {
    label: "Shipping & tax",
    href: "/admin/resources/shipping-methods",
    permission: "settings.manage",
    icon: Package,
  },
  {
    label: "Store settings",
    href: "/admin/settings",
    permission: "settings.manage",
    icon: Settings,
  },
  {
    label: "Customer messages",
    href: "/admin/messages",
    permission: "messages.manage",
    icon: MessageSquare,
  },
  {
    label: "Team & roles",
    href: "/admin/team",
    permission: "team.manage",
    icon: ShieldCheck,
  },
  {
    label: "Audit log",
    href: "/admin/audit",
    permission: "team.manage",
    icon: ClipboardList,
  },
];
export function AdminShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const path = usePathname(),
    router = useRouter(),
    store = useStore(),
    a = useAction();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav aria-label="Administration">
      {adminNav
        .filter((n) => user.permissions.includes(n.permission))
        .map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            aria-current={
              path === n.href ||
              (n.href !== "/admin" && path.startsWith(n.href + "/"))
                ? "page"
                : undefined
            }
          >
            <n.icon />
            {n.label}
          </Link>
        ))}
    </nav>
  );
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Logo inverse />
        <p className="eyebrow">Store operations</p>
        {nav}
        <div className="admin-user">
          <strong>{user.name}</strong>
          <p>{user.email}</p>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="icon-button admin-mobile-nav"
            onClick={() => setOpen(true)}
            aria-label="Open admin navigation"
          >
            <Menu />
          </button>
          <Link href="/admin" className="muted">
            Nella & Vale / Store administration
          </Link>
          <div className="actions">
            <Link href="/">View storefront ↗</Link>
            <Button
              variant="secondary"
              busy={a.busy}
              onClick={() =>
                a.run(async () => {
                  await store.logout();
                  router.push("/admin/sign-in");
                  router.refresh();
                }, "")
              }
            >
              <LogOut size={16} /> Sign out
            </Button>
          </div>
        </header>
        <div className="admin-content">
          <Errors error={a.error} />
          {children}
        </div>
      </div>
      <Drawer open={open} onOpenChange={setOpen} title="Store administration">
        <div className="drawer-nav">
          {adminNav
            .filter((n) => user.permissions.includes(n.permission))
            .map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
        </div>
      </Drawer>
    </div>
  );
}
