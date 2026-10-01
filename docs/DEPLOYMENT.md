# SokSan Network — Deployment & Security Headers

Phase 0 hardening. This document is the source of truth for how the
production frontend is served and where each security control lives.

## How the app reaches Laravel

The production build expects the API **same-origin**: the web server
proxies `/api/v1` to the Laravel API, so no CORS configuration is needed
and no API hostname is exposed to the browser.

- Nginx reference: `deploy/nginx.conf.example` (SPA fallback
  `try_files $uri $uri/ /index.html;` + `/api/` proxy).
- Cloudflare Pages: `public/_headers` for headers; use a Worker or a
  reverse-proxy rule to forward `/api/*` to the origin running Laravel
  (Cloudflare Tunnel is the recommended transport — it keeps the API
  server off the public internet).
- `VITE_API_BASE_URL` defaults to `/api/v1` (see `.env.production`). Set
  an absolute `https://` URL only when the API is served from a different
  origin — in that case configure `CORS_ALLOWED_ORIGINS` on the backend.

## Content Security Policy — chosen approach

**Option A from the hardening plan: build-time injection via a Vite
plugin**, plus header form for the CDN:

1. `index.html` carries a **development** CSP (Vite HMR requires
   `script-src 'unsafe-inline'` and `connect-src ws:`).
2. `vite.config.ts` → `productionCspPlugin()` swaps that meta tag for the
   hardened **production** CSP during `vite build` (no `unsafe-inline`
   scripts, no `ws:`, allow-listed tile/media/R2 domains).
3. `public/_headers` (Cloudflare Pages) and `deploy/nginx.conf.example`
   carry the same policy **as a header**, plus `frame-ancestors 'none'`
   which meta tags cannot express.

> Keep the three copies of the CSP in sync when you edit one.

Production connect domains and why they are needed:

| Domain | Purpose |
| --- | --- |
| `https://tiles.openfreemap.org` | MapLibre vector tiles/styles — rendering only, no analytics, no per-user tracking (OpenFreeMap privacy policy). |
| `https://*.openfreemap.org` | OpenFreeMap style CDN. |
| `https://*.r2.cloudflarestorage.com` | User media on Cloudflare R2 (or your custom R2 public domain). |
| `https://picsum.photos`, `https://commondatastorage.googleapis.com` | DEMO-only seed media; remove once real uploads replace the seed. |

The map intentionally uses OpenFreeMap (privacy-respecting) instead of
Google Maps; tile requests are necessary for rendering and are not
analytics. Geolocation is only requested when the user explicitly taps
the locate control, and the browser permission prompt gates it.

## Demo / mock API

The in-browser demo API (`src/lib/api.ts`) is a **development tool**:

- active by default for `npm run dev` and the test suite;
- **removed from production builds entirely** — `src/main.tsx` gates the
  import behind `import.meta.env.PROD`, which the bundler eliminates;
- `VITE_USE_MOCK=true` in a production build **throws on boot**
  (`src/lib/runtime.ts`) instead of serving fake data to real users.

## Security headers summary

| Header | Value | Where |
| --- | --- | --- |
| Content-Security-Policy | see above | meta (build) + `_headers` + nginx |
| X-Content-Type-Options | nosniff | `_headers` + nginx + Laravel middleware |
| X-Frame-Options | DENY | `_headers` + nginx + Laravel middleware |
| Referrer-Policy | strict-origin-when-cross-origin | `_headers` + nginx + Laravel middleware |
| Permissions-Policy | camera=(), microphone=(), geolocation=(self), payment=() | meta + `_headers` + nginx + Laravel middleware |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | `_headers` + nginx + Laravel middleware (production only) |
| Cache-Control no-store | sensitive API paths | Laravel middleware (`EnsureSecurityHeaders`) |

## Verification checklist

```sh
npm run build
grep -o "unsafe-inline'" dist/index.html        # expect: only inside style-src
grep -c "ws:" dist/index.html                   # expect: 0
grep -rl "DEMO SEAM" dist/assets || echo "mock seam absent from prod bundle"
```

Then check response headers on the deployed origin:

```sh
curl -sI https://soksan.app/ | grep -iE 'content-security|x-frame|referrer|strict-transport|permissions'
```
