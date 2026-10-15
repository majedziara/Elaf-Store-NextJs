"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { analyticsLocation, analyticsReferrer, measurementId } from "@/lib/analytics";
import { siteUrl, publicPages } from "@/lib/seo";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...values: unknown[]) => void;
    nvAnalyticsInitialized?: boolean;
  }
}

export function Analytics({ nonce }: { nonce?: string }) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const previous = useRef("");
  const lastTracked = useRef("");
  const disabledKey = "ga-disable-" + measurementId;
  useEffect(() => {
    const production = process.env.NODE_ENV === "production" && window.location.hostname === new URL(siteUrl).hostname;
    const setDisabled = (url: string) => {
      const allowed = production && Boolean(analyticsLocation(url));
      (window as unknown as Record<string, unknown>)[disabledKey] = !allowed;
      return allowed;
    };
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    function guardPush(this: History, ...args: Parameters<History["pushState"]>) {
      setDisabled(new URL(args[2] || location.href, location.href).href);
      return originalPush.apply(this, args);
    }
    function guardReplace(this: History, ...args: Parameters<History["replaceState"]>) {
      setDisabled(new URL(args[2] || location.href, location.href).href);
      return originalReplace.apply(this, args);
    }
    history.pushState = guardPush;
    history.replaceState = guardReplace;
    const pop = () => setDisabled(location.href);
    window.addEventListener("popstate", pop, true);
    const allowed = setDisabled(location.href);
    if (production) {
      window.dataLayer ||= [];
      window.gtag ||= function (..._values: unknown[]) { window.dataLayer!.push(arguments); };
      if (!window.nvAnalyticsInitialized) {
        window.gtag("js", new Date());
        window.gtag("config", measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: analyticsLocation(location.href) || siteUrl, page_referrer: analyticsReferrer(document.referrer) });
        window.nvAnalyticsInitialized = true;
      }
    }
    setEnabled(allowed);
    return () => {
      if (history.pushState === guardPush) history.pushState = originalPush;
      if (history.replaceState === guardReplace) history.replaceState = originalReplace;
      window.removeEventListener("popstate", pop, true);
      (window as unknown as Record<string, unknown>)[disabledKey] = true;
    };
  }, [disabledKey]);
  useEffect(() => {
    const url = analyticsLocation(location.href);
    const allowed = process.env.NODE_ENV === "production" && location.hostname === new URL(siteUrl).hostname && Boolean(url);
    (window as unknown as Record<string, unknown>)[disabledKey] = !allowed;
    setEnabled(allowed);
    if (!allowed || !url) { lastTracked.current = ""; return; }
    if (lastTracked.current === url || !window.gtag) return;
    lastTracked.current = url;
    const referrer = previous.current || analyticsReferrer(document.referrer);
    previous.current = url;
    window.gtag("set", { page_location: url, page_referrer: referrer });
    window.gtag("event", "page_view", { send_to: measurementId, page_location: url, page_title: publicPages[pathname.replace(/^\//, "")]?.title || document.title, page_referrer: referrer });
  }, [pathname, disabledKey]);
  return enabled ? <Script id="google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" nonce={nonce} /> : null;
}
