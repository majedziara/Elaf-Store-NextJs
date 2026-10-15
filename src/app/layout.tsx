import type { Metadata } from "next";
import localFont from "next/font/local";
import { siteName, siteUrl, defaultDescription, socialImage, jsonLd } from "@/lib/seo";
import { Analytics } from "@/components/analytics";
import { headers, cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { serverGet, config, cookieNames } from "@/lib/server";
import type { Settings } from "@/lib/types";
import "./globals.css";
const manrope = localFont({
  src: [
    { path: "../../public/fonts/font-0.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/font-1.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/font-2.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/font-3.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-manrope", display: "swap", preload: false, adjustFontFallback: "Arial",
});
const newsreader = localFont({
  src: [
    { path: "../../public/fonts/font-4.woff2", weight: "400", style: "italic" },
    { path: "../../public/fonts/font-5.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/font-6.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-newsreader", display: "swap", preload: false, adjustFontFallback: "Times New Roman",
});
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nella & Vale — Everyday Clothing & Intimates",
    template: "%s | Nella & Vale",
  },
  description:
    defaultDescription,
  robots: { index: true, follow: true },
  icons: { icon: "/images/favicon.svg" },
  openGraph: {
    type: "website",
    siteName,
    locale: "en_US",
    title: "Nella & Vale — Everyday Clothing & Intimates",
    description: defaultDescription,
    url: siteUrl,
    images: [socialImage],
  },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  const jar = await cookies();
  const hasSession = jar.getAll().some(cookie => cookie.name === config().session || cookie.name.startsWith("remember_web_"));
  const hasCart = Boolean(jar.get(cookieNames.cart));
  let settings: Settings = {};
  try {
    settings = (await serverGet<{ data: Settings }>("settings")).data;
  } catch {}
  return (
    <html lang="en" className={`${manrope.variable} ${newsreader.variable}`}>
      <body>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: jsonLd({
            "@context": "https://schema.org", "@graph": [
              { "@type": "Organization", "@id": siteUrl + "/#organization", name: siteName, url: siteUrl, logo: siteUrl + "/images/logo.png" },
              { "@type": "WebSite", "@id": siteUrl + "/#website", name: siteName, url: siteUrl, publisher: { "@id": siteUrl + "/#organization" }, inLanguage: "en-US" },
            ],
          }) }}
        />
        <Providers settings={settings} hasSession={hasSession} hasCart={hasCart}>{children}</Providers>
        <Analytics nonce={nonce} />
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
