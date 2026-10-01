# SokSan Network (សុខសាន្ត)

Cambodia-focused social web app for discovering and sharing "hidden gem"
locations. Free for travelers; optional paid visibility tools for local
tourism businesses.

Bilingual **Khmer + English** throughout.

## Stack

| Layer    | Technology                                              |
| -------- | ------------------------------------------------------- |
| Frontend | React 19 + TypeScript, Vite 7, Tailwind CSS 4, Vitest   |
| Backend  | Laravel 12 (PHP 8.3) REST API, Laravel Sanctum tokens   |
| Database | PostgreSQL 16 + PostGIS (`backend/` migrations)         |
| Media    | Local public disk → Cloudflare R2 (S3-compatible)       |
| Infra    | Docker Compose, Cloudflare (DNS/SSL/WAF/Tunnel in prod) |

## Quick start (one command)

```bash
cp .env.example .env   # optional — defaults work as-is
docker compose up --build
```

- Web app: http://localhost:5173 (talks to the **real Laravel API** via the
  Vite dev proxy; the in-browser demo API is disabled with `VITE_USE_MOCK=false`)
- API: http://localhost:8000/api/v1
- Demo login (seeded): `dara@soksan.app` / `password`

Migrations run automatically on boot; set `SEED_DEMO=true` (default) for
demo users and posts.

### Frontend-only development (no backend)

```bash
npm install
npm run dev        # demo mode: in-browser API, full app works offline
```

The browser-side demo backend (`src/lib/api.ts`) implements the same
`/api/v1` contract, so every feature works without the Laravel service.

## Tests, lint, build

```bash
npm test           # Vitest + Testing Library (auth, feed, create post, map)
npm run lint       # ESLint (0 errors)
npm run build      # TypeScript check + production bundle
```

Backend tests (run inside Docker, where PHP exists):

```bash
docker compose run --rm api php artisan test
```

## Environment variables

### Frontend (`VITE_*`, consumed at build time)

| Variable            | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `VITE_API_BASE_URL` | API base URL. Default `/api/v1` (proxied in dev).              |
| `VITE_USE_MOCK`     | `false` disables the in-browser demo backend.                  |
| `VITE_DEV_PROXY`    | Vite dev-server proxy target for `/api` (used by Docker).      |

### Backend (`backend/.env.example` — never commit real values)

| Variable                       | Purpose                                        |
| ------------------------------ | ---------------------------------------------- |
| `APP_KEY`                      | Laravel encryption key (`php artisan key:generate`) |
| `DB_*`                         | PostgreSQL connection                          |
| `FRONTEND_URL`                 | Allowed CORS origin (the React app)            |
| `ADMIN_FRONTEND_URL`           | Reserved for the future admin site             |
| `MEDIA_DISK`                   | `public` (local) or `r2` (Cloudflare R2)       |
| `R2_*`                         | R2 bucket credentials (production only)        |
| `GOOGLE_PLACES_API_KEY`        | One-time business-registration confirm only. Public maps use OpenFreeMap / PMTiles, never Google. |
| `BAKONG_API_KEY` / `BAKONG_MERCHANT_ID` / `BAKONG_API_URL` | Bakong KHQR billing for the Boosted tier (Phase 3) |
| `BAKONG_ALLOW_DEMO_CONFIRM`    | Local/demo only: allow activating subscriptions without the real gateway |

## Folder map

```
├── docker-compose.yml        # db (PostGIS) + api (Laravel) + web (Vite)
├── src/                      # React frontend
│   ├── App.tsx               # routes + providers (lazy-loaded pages)
│   ├── lib/http.ts           # API client (base URL, bearer token)
│   ├── lib/api.ts            # in-browser demo backend (/api/v1 contract)
│   ├── lib/mapConfig.ts      # map tile source + bounds (OpenFreeMap now, PMTiles-ready)
│   ├── contexts/             # LanguageContext (KH/EN), AuthContext
│   ├── pages/                # Home, Discover, Clips, Auth, …
│   ├── components/           # feed, composer, viewer, layout, map/
│   └── test/                 # Vitest suites (critical flows)
├── docs/                     # DEPLOYMENT, SCALING, OPERATIONS
│   └── legal/                # Privacy, ToS, Guidelines, Copyright, Abuse (EN+KH)
└── backend/                  # Laravel 12 REST API
    ├── routes/api.php        # versioned endpoints (/api/v1/…)
    ├── app/Http/…            # thin controllers, requests, resources
    ├── app/Services/         # ALL business logic (reused by future admin)
    ├── app/Policies/         # ownership + admin RBAC rules
    ├── app/Http/Middleware/EnsureRole.php  # role:… middleware
    └── database/migrations/  # users, roles, posts (PostGIS point), …
```

## API v1 surface

| Method   | Endpoint                     | Auth   | Notes                       |
| -------- | ---------------------------- | ------ | --------------------------- |
| POST     | `/api/v1/auth/register`      | —      | rate limit 5/min; optional `referral_code` links the invite (badge-only, unknown codes never block signup) |
| POST     | `/api/v1/auth/login`         | —      | rate limit 5/min            |
| POST     | `/api/v1/auth/forgot-password` | —    | anti-enumeration response; 5/min |
| POST     | `/api/v1/auth/reset-password`| —      | broker token; **revokes all sessions**; 5/min |
| POST     | `/api/v1/auth/logout`        | token  | revokes current token       |
| GET      | `/api/v1/me`                 | token  |                             |
| DELETE   | `/api/v1/me`                 | token  | account deletion — password-confirmed, anonymizes, revokes tokens |
| POST     | `/api/v1/email/verification-notification` | token | resend signed verification link; 6/min |
| GET      | `/api/v1/email/verify/{id}/{hash}` | signed | email verification    |
| GET      | `/api/v1/posts`              | public | `category`, `province`, `search` (ILIKE/trigram on Postgres), `page` (anonymous pages cached in Redis) |
| GET      | `/api/v1/posts/nearby`       | public | `lat`,`lng`,`radius_km` — PostGIS `ST_DWithin`, distance-sorted, coords rounded per privacy tier |
| GET      | `/api/v1/posts/{id}`         | public | published posts only — share-card / deep-link landing page (`/post/{id}`) |
| POST     | `/api/v1/posts/{id}/view`    | public | clip view counter (Redis INCR) |
| GET      | `/api/v1/leaderboard`        | public | province leaderboard (Redis ZSET) |
| GET      | `/api/v1/rankings?scope=communes\|districts\|provinces` | public | geography rankings, recency decay (21-day half-life), rolls up commune → district → province |
| POST     | `/api/v1/places/confirm`     | token  | one-time Google Places confirmation (`place_id`) or manual pin (`lat`/`lng`) |
| GET      | `/api/v1/businesses/mine`    | token  | owner dashboard: the caller's businesses + active subscription |
| POST     | `/api/v1/uploads`            | token  | 5/min; finfo MIME sniffing, SVG blocked, EXIF/GPS stripped via re-encode, videos queued |
| GET/POST | `/api/v1/posts/{id}/comments`| public/token | comments 30/min; blocked pairs rejected |
| DELETE   | `/api/v1/comments/{id}`      | owner/admin |                        |
| POST/DEL | `/api/v1/posts/{id}/like`    | token  | toggle                      |
| POST/DEL | `/api/v1/posts/{id}/bookmark`| token  | toggle ("save")             |
| POST/DEL | `/api/v1/users/{id}/follow`  | token  | toggle; blocked pairs rejected |
| POST/DEL | `/api/v1/reports`            | token  | 10/min; closed reason list; one per reporter; auto-hide at 3 pending |
| POST/DEL | `/api/v1/users/{id}/block`   | token  | bidirectional interaction stop |
| POST/DEL | `/api/v1/users/{id}/mute`    | token  | hides author from muter's feed |
| GET/POST | `/api/v1/notifications/*`    | token  | inbox, unread-count, mark read / read-all (local-only, no push provider) |
| GET      | `/api/v1/admin/stats`        | admin  | dashboard counts snapshot   |
| GET/PATCH| `/api/v1/admin/reports`      | admin  | review queue; decisions audited |
| GET/PATCH/DEL | `/api/v1/admin/posts`   | admin  | status overrides + removal, audited |
| GET/PATCH| `/api/v1/admin/users`        | admin  | activate/deactivate, role sync, audited |
| GET      | `/api/v1/ops/health`         | admin  | app/DB/Redis liveness       |
| GET      | `/api/v1/ops/metrics`        | admin  | queue depth, DB connections |

## Redis architecture (cache, counters, leaderboard, queues)

`docker compose` adds a `redis` service and a `worker` service. Redis is on
the **private compose network only — no published port**, so it is never
reachable from outside the stack.

- **Feed cache** — anonymous feed pages cached ~60 s (`FEED_CACHE_TTL`) and
  invalidated immediately when posts/comments change (registry-set based,
  no wildcard scans). Logged-in feeds stay live (per-viewer flags).
- **Counters** — clip views are `INCR`-ed in Redis and batch-flushed to
  `posts.view_count` every minute by `counters:flush`; likes/comments keep
  Postgres rows as truth with best-effort Redis mirrors.
- **Leaderboard** — provinces ranked in a Redis ZSET (`ZINCRBY` on publish,
  rebuilt from Postgres every 15 min to correct drift).
- **Sessions/cache/rate-limit/queues** — Laravel drivers set to Redis
  (`CACHE_STORE`, `SESSION_DRIVER`, `QUEUE_CONNECTION`), so the API is
  multi-server ready with zero code changes.
- **Moderation** — `ModeratePostJob` runs on the Redis queue consumed by
  dedicated `worker` containers, never inline in requests (Safe Browsing /
  Cloud Vision integration points are stubbed and marked).
- Every Redis feature degrades gracefully to Postgres-only when Redis is
  unreachable (`App\Services\RedisGate`). Full invalidation strategy and
  scaling plan: [docs/SCALING.md](docs/SCALING.md).

## Security posture (Phase 0 hardening)

- **No tracking of any kind.** No analytics, no third-party scripts, no
  external beacons (the design-export rrweb recorder, page-view beacon and
  element-picker were removed on 2026-09-29). Map tiles come from
  OpenFreeMap (open OSM data) — tile fetches are rendering, not
  analytics; disclosed in `docs/legal/privacy.md`.
- **Mock API can never ship.** `src/lib/runtime.ts` throws on boot if
  `VITE_USE_MOCK=true` reaches a production build; the seam is loaded via
  dynamic import so it stays out of production bundles; CI greps
  `.env.production` to refuse the flag.
- **CSP, split by environment.** Dev keeps `unsafe-inline`/`ws:` for Vite
  HMR only. Production serves a hardened policy (`script-src 'self'`, no
  `ws:`) from three synced copies: the Vite build injects it into
  `index.html`, `public/_headers` for static hosts, and
  `deploy/nginx.conf.example`. Allowed third parties: OpenFreeMap tiles,
  R2 storage, Google Fonts (disclosed in the privacy policy) — nothing
  else.
- **Security headers middleware** (`EnsureSecurityHeaders`, registered in
  `bootstrap/app.php`): nosniff, frame DENY, strict referrer,
  Permissions-Policy, HSTS in production, `Cache-Control: no-store` on
  auth/password endpoints. Static-host headers covered by `_headers` +
  nginx example — see `docs/DEPLOYMENT.md`.
- **Uploads are not trusted.** `SafeMediaService` sniffs real MIME with
  `finfo` (client MIME ignored), blocks SVG outright, re-encodes images
  through GD (strips ALL EXIF/GPS metadata, caps 2560px, outputs
  WebP/JPEG/PNG), and processes videos on the queue instead of inline.
- **Location privacy by default.** Every geotagged post carries a
  precision tier: exact / approximate (~110 m, the DEFAULT) / sensitive
  (~1.1 km). Public responses round coordinates to the tier; only owner
  and admins see raw points (`PostPolicy::viewExactLocation`); the raw
  PostGIS geometry is never serialized. Composer exposes the choice in
  EN + KH.
- **Real moderation, not stubs.** Reports (closed 10-reason list, one per
  reporter per item, withdrawable), blocks (bidirectional interaction
  stop) and mutes (feed-only), auto-hide into the review queue at 3
  pending reports, keyword + report screens in `ModeratePostJob`,
  admin review endpoints with an audit log on every decision. SOP & SLAs:
  `docs/OPERATIONS.md` §5.
- **Full account lifecycle.** Password reset via the Laravel broker
  (revokes ALL Sanctum tokens), signed-URL email verification,
  password-confirmed account deletion (anonymize + revoke), per-action
  rate limits — posts 10/min, social 30/min, uploads 5/min, reports
  10/min, reset 5/min, verification 6/min, api 60/min, auth 5/min;
  accounts younger than 48h get half the write budgets.
- Sanctum bearer tokens (hashed at rest), bcrypt password hashing.
- CORS restricted to `FRONTEND_URL` (and later `ADMIN_FRONTEND_URL`).
- All input validated server-side (FormRequests); consistent error shape
  `{message, errors}`; no stack traces outside `APP_DEBUG`.
- RBAC from day one: `roles` table + `role:` middleware + policies —
  the admin panel (built, Phase 5 + hardening) sits on top of it.
- Structured production logging (`LOG_CHANNEL=json`), 14-day rotation,
  no third-party sinks; policy: never log secrets or coordinates.

## Safety tags & auto-translate (Phase 9)

- Posts accept an optional `safety_tags` array validated against a CLOSED
  allow-list (`SafetyTagService`; mirrored client-side in
  `src/lib/safetyTags.ts`). Safety group: `well_lit`, `security_present`,
  `family_friendly`, `solo_friendly`. Accessibility group:
  `wheelchair_accessible`, `accessible_restroom`, `step_free`,
  `quiet_space`. Unknown tags → 422. Tags are self-reported traveller
  observations — displayed with that caveat, never used for ranking.
- **Auto-translate is intentionally not implemented**: the scope is
  "only if a translation service exists", and none is configured in this
  environment. App chrome is i18n'd (EN/KH); post content stays in the
  author's language.

## Admin panel (built, in-app, behind `role:admin`)

The Phase 5 admin endpoints plus the Phase 0 trust-and-safety surface are
live under `/api/v1/admin/*` (stats, report review queue, post
status/removal, user status/role), every mutation audit-logged. A
separate admin website can later authenticate against the same API —
services and policies are already shared, no controller reuse required.

## Known limitations & verification status

- **Backend tests:** the suite is designed to run WITHOUT Docker —
  `phpunit.xml` pins SQLite `:memory:`, array cache/mail, sync queue, so
  `cd backend && php artisan test` works on any PHP 8.3 machine. This
  repo's sandbox has no PHP, so the backend suite is **UNVERIFIED here**;
  the CI workflow (`.github/workflows/ci.yml`, pending GitHub
  `workflows` permission for the session token) runs it on push.
  PostGIS-only paths (nearby `ST_DWithin`, trigram indexes, geometry
  columns) need the docker-compose Postgres for full exercise:
  `docker compose up --build` then `docker compose run --rm api php
  artisan test`.
- Public maps render with MapLibre GL JS over free OpenFreeMap vector tiles
  (no API key, mandatory OSM attribution in `SokSanMap`). The tile source
  is centralized in `src/lib/mapConfig.ts` so the launch-region demo can
  swap to self-hosted PMTiles later without touching any component.
  Google is never used for map rendering — only the one-time
  business-registration confirm (`GOOGLE_PLACES_API_KEY`).
- Redis code paths are written with a graceful Postgres fallback
  (`RedisGate`) but not executed in this repo's sandbox (no Docker/PHP);
  `docker compose up` is the verification point.
- The demo backend's data resets on reload (it is a demo, not storage).
- All demo content is original, self-contained, and isolated in `src/demo/`
  — see `src/demo/README.md` for the one-step removal when the real API
  takes over completely.
- Email delivery needs a real mailer credential before verification and
  reset links work outside tests (`MAIL_MAILER=array` in the test env).
