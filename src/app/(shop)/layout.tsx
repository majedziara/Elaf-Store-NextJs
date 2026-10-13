import { ShopShell } from "@/components/shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}
