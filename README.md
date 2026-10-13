# Nella & Vale

Next.js 16 storefront and store administration, connected to the Laravel backend through a same-origin BFF. English interface, USD, US addresses. Requires Node 22 or 24; static export is unsupported.

## Local setup

```bash
npm ci
npm run assets
cp .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set the generated stable key as `APP_COOKIE_KEY` in `.env.local`. Local origins are `APP_URL=http://localhost:3000`, `LARAVEL_API_URL=http://127.0.0.1:8000`, and `NEXT_PUBLIC_MEDIA_URL=http://127.0.0.1:8000`. Keep `.env.local` outside Git. PayPal credentials belong only in Laravel.

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

The homepage route is `src/app/(shop)/[[...path]]/page.tsx`; homepage design is in `src/components/content.tsx`. Store and administration use dynamic catch-all pages. Shared styling is `src/app/globals.css`.

```bash
npm run build
npm run check
npm test
npm run start
```

The automated frontend tests cover protected callback forwarding, encrypted guest-access cookies, payment-state presentation, and return eligibility. Browser/API checks exercise the live local backend. Product images and legal/policy pages are managed in administration; missing catalog photography displays a neutral placeholder.

PayPal returns to this application's `/api/paypal/return` or `/api/paypal/cancel`. The server forwards only the fixed callback to Laravel for verification/capture, stores guest access in encrypted HttpOnly cookies, and opens a view based on the actual payment status. Email verification, password reset, email change, and guest access links also open local views and complete through Laravel.

Production needs HTTPS, stable cookie encryption keys, private Laravel credentials, SMTP, queue/scheduler, and your real product photography/published policies. For trusted BFF client-IP rate limits, configure the same `BFF_RATE_SECRET` in both servers and only an ingress-overwritten `TRUSTED_CLIENT_IP_HEADER`.
