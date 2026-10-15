# Nella & Vale

Next.js 16 storefront and store administration, connected to the Laravel backend through a same-origin BFF. English interface, USD, US addresses. Requires Node 22 or 24; static export is unsupported.

## Local setup

```bash
npm ci
npm run assets
cp .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set the generated stable key as `APP_COOKIE_KEY` in `.env.local`. Local origins are `APP_URL=http://localhost:3000`, `LARAVEL_API_URL=http://127.0.0.1:8000`, and `NEXT_PUBLIC_MEDIA_URL=http://127.0.0.1:8000`. Keep `.env.local` outside Git. All payment credentials belong only in Laravel .env; Next.js needs no Stripe or Triple-A secrets.

Laravel settings for this integration:

```dotenv
APP_URL=http://localhost:3000
FRONTEND_ORIGINS=http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost:8000,127.0.0.1:8000
SESSION_COOKIE=nv_session
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=false
PUBLIC_STORAGE_URL=http://127.0.0.1:8000/storage
PAYPAL_RETURN_URL="${APP_URL}/api/paypal/return"
PAYPAL_CANCEL_URL="${APP_URL}/api/paypal/cancel"
```

The integration patch in `scripts/laravel-integration.patch` is a reference for the original backend guide. Its changes were applied manually to the current Laravel project, preserving later payment/auth fixes. Do not reapply blindly to that project.

Run Laravel on port 8000 with its queue worker, then:

```bash
npm run dev
```

Open http://localhost:3000. Administration: http://localhost:3000/admin/sign-in. Use the local administrator already created in Laravel; its credentials remain in Laravel's ignored `storage/app/private/local-admin.txt`.

## Source and verification

The homepage route is `src/app/(shop)/[[...path]]/page.tsx`; homepage markup is in `src/components/home.tsx` and its interactive hero/ribbon are in `src/components/home-motion.tsx`. Store and administration use dynamic catch-all pages. Shared styling is `src/app/globals.css`.

```bash
npm run build
npm run check
npm test
npm run start
```

The automated frontend tests cover protected callback forwarding, encrypted guest-access cookies, payment-state presentation, and return eligibility. Browser/API checks exercise the live local backend. Product images and legal/policy pages are managed in administration; missing catalog photography displays a neutral placeholder.

PayPal returns to this application's `/api/paypal/return` or `/api/paypal/cancel`. The server forwards only the fixed callback to Laravel for verification/capture, stores guest access in encrypted HttpOnly cookies, and opens a view based on the actual payment status. Email verification, password reset, email change, and guest access links also open local views and complete through Laravel.

Production needs HTTPS, stable cookie encryption keys, private Laravel credentials, SMTP, queue/scheduler, and your real product photography/published policies. For trusted BFF client-IP rate limits, configure the same `BFF_RATE_SECRET` in both servers and only an ingress-overwritten `TRUSTED_CLIENT_IP_HEADER`.

## Stripe and Triple-A

The checkout reads available gateways from Laravel and shows only fully configured active sandbox/live environments. Gateway selection is carried to the order payment page; an existing attempt keeps its original provider. Redirect hosts are restricted to the implemented providers.

Return/cancel routes `/api/payments/{stripe|triple-a}/{return|cancel}` forward protected state to Laravel, which verifies the provider's actual status. Verified guest access is stored in encrypted HttpOnly cookies. Signed provider POSTs at `/api/v1/webhooks/{paypal|stripe|triple-a}/{sandbox|live}` preserve their raw bytes and signatures, and forward to Laravel without browser sessions. Their public URLs must be reachable by the payment provider.

Set modes and credentials only in Laravel `.env` using its `.env.example`. Changing gateway credentials does not require rebuilding Next.js. The gateway administration page displays readiness and environment variable names without exposing secrets. Triple-A's default sandbox uses testBTC; USDT availability in live mode depends on the merchant account. Run the Laravel queue and scheduler so delayed payment/refund confirmations are processed.

## Search Console, Analytics and performance

The production canonical origin is `NEXT_PUBLIC_SITE_URL=https://elaf-store.vercel.app`. Vercel also needs `APP_URL=https://elaf-store.vercel.app` and `LARAVEL_API_URL=https://elaf-store.onrender.com` and `NEXT_PUBLIC_MEDIA_URL=https://elaf-store.onrender.com`; local `.env.local` keeps its localhost runtime origins. Do not publish localhost as the production origin.

Google Search Console verification is served verbatim at `/googledb9beca33381b118.html`. After deploying, select **Verify** in the matching URL-prefix Search Console property and submit `https://elaf-store.vercel.app/sitemap.xml`. Verification/submission in the Google account cannot be completed by adding the file alone.

Google Analytics uses measurement ID `G-KXMX3VBRZ7` (override with `NEXT_PUBLIC_GA_ID`) and loads after hydration only on the canonical production hostname. Local and preview hosts and private account/payment/admin routes are excluded. Page locations/referrers contain no query parameters or tokens. Initial external referrers retain only their origin so acquisition sources remain measurable. It records explicit page views for Next.js navigation. In GA4 **Admin → Data streams → Web stream → Enhanced measurement → Page views → Advanced settings**, turn off **Page changes based on browser history events** to avoid duplicating the explicit events; `send_page_view:false` alone does not override that property setting. Validate public navigation in Realtime/DebugView after deployment.

SEO includes distinct page/product metadata, canonical URLs, Open Graph/Twitter cards, robots exclusions, Organization/WebSite/Product/Offer/BreadcrumbList JSON-LD, and published product sitemap entries. Product schema uses actual inventory/prices/images and does not invent reviews or store policies. Products without real images need catalog photos before they qualify for Google's merchant listing image requirements.

The original font files have equivalent WOFF2 versions (same glyphs and metrics), loaded through `next/font/local` for hashed immutable assets and adjusted fallback metrics; unused weights are not preloaded. Next Image optimizes the existing image sources using responsive sizes and WebP at quality 90; media hosts are restricted to the configured storage origin. Animation timings, behaviour, colours and spacing are preserved. Marketing/settings content is cached for 60 seconds and invalidated after successful admin content changes through the BFF; product inventory, prices, payment availability and authenticated data remain uncached. React request caching deduplicates shared server reads during one render. The original homepage hero streams immediately while fresh product data loads inside its own Suspense boundary. Account, authentication and checkout views load their JavaScript only when requested, with server rendering preserved.
