import type { Metadata } from "next";
import { headers } from "next/headers";
import { Providers } from "@/components/providers";
import { serverGet } from "@/lib/server";
import type { Settings } from "@/lib/types";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "Nella & Vale — Everyday Clothing & Intimates",
    template: "%s | Nella & Vale",
  },
  description:
    "Explore women’s clothing and intimates. Shop available colours and sizes in USD.",
  robots: { index: true, follow: true },
  icons: { icon: "/images/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "Nella & Vale",
    locale: "en_US",
    images: [
      {
        url: "/images/editorial-hero.png",
        width: 1024,
        height: 1024,
        alt: "Nella & Vale editorial",
      },
    ],
  },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await headers();
  let settings: Settings = {};
  try {
    settings = (await serverGet<{ data: Settings }>("settings")).data;
  } catch {}
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body>
        <Providers settings={settings}>{children}</Providers>
        <noscript>
          <p className="notice">
            Enable JavaScript to use the shopping bag, checkout, and account
            features.
          </p>
          <style>
            {".reveal{opacity:1!important;transform:none!important}"}
          </style>
        </noscript>
      </body>
    </html>
  );
}
