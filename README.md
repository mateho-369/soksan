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
| POST     | `/api/v1/auth/register`      | —      | rate limit 5/min            |
| POST     | `/api/v1/auth/login`         | —      | rate limit 5/min            |
| POST     | `/api/v1/auth/logout`        | token  | revokes current token       |
| GET      | `/api/v1/me`                 | token  |                             |
| GET      | `/api/v1/posts`              | public | `category`, `province`, `search`, `page` (anonymous pages cached in Redis) |
| GET      | `/api/v1/posts/{id}`         | public |                             |
| POST     | `/api/v1/posts/{id}/view`    | public | clip view counter (Redis INCR) |
| GET      | `/api/v1/leaderboard`        | public | province leaderboard (Redis ZSET) |
| GET      | `/api/v1/rankings?scope=communes\|districts\|provinces` | public | geography rankings, recency decay (21-day half-life), rolls up commune → district → province |
| POST     | `/api/v1/places/confirm`     | token  | one-time Google Places confirmation (`place_id`) or manual pin (`lat`/`lng`) |
| GET      | `/api/v1/businesses/mine`    | token  | owner dashboard: the caller's businesses + active subscription |
| POST     | `/api/v1/businesses`         | token  | register business (free Verified tier; production holds `pending` for admin approval) |
| POST     | `/api/v1/businesses/{id}/upgrade`         | owner | open a Bakong KHQR invoice for the Boosted tier |
| POST     | `/api/v1/businesses/{id}/upgrade/confirm` | owner | verify payment server-side, activate subscription |
| POST     | `/api/v1/businesses/{id}/leads`           | public | log a lead event (`call` / `message` / `directions`) |
| GET      | `/api/v1/businesses/{id}/leads/summary`   | owner/admin | 7-day lead totals, optional `from`/`to` range |
| GET      | `/api/v1/placements/active`               | public | partner placements inside their admin date window (always labeled ដៃគូ/Partner; never affects ranking) |
| GET      | `/api/v1/hidden-gem/current`              | public | Hidden Gem of the Week (editorial admin pick; never score-derived) |
| GET      | `/api/v1/trending`                        | public | Trending Now — engagement × 0.5^(age/3d) inside a 14-day window; read-only, never writes ranking state |
| GET      | `/api/v1/trips/shared/{slug}`             | public | a shareable trip list (404 when private or missing) |
| GET      | `/api/v1/trips/mine`                      | token  | the caller's trip lists |
| POST     | `/api/v1/trips`                           | token  | create a trip list (auto slug) |
| PATCH/DEL | `/api/v1/trips/{trip}`                   | owner  | rename / set privacy / delete a trip |
| POST/DEL | `/api/v1/trips/{trip}/posts[/{post}]`     | owner  | add/remove stops — published posts only |
| GET      | `/api/v1/admin/posts/pending`             | role:admin | first-post queue (`posts.status = pending_review`) |
| POST     | `/api/v1/admin/posts/{post}/approve\|reject` | role:admin | publish or reject a queued post (audited) |
| GET      | `/api/v1/admin/businesses/pending`        | role:admin | business registrations awaiting review |
| POST     | `/api/v1/admin/businesses/{business}/approve\|reject` | role:admin | approve or reject a business (audited) |
| GET/POST/PATCH | `/api/v1/admin/placements`        | role:admin | schedule partner placements (date ranges + active toggle; audited) |
| POST     | `/api/v1/admin/hidden-gem`                | role:admin | pick Hidden Gem of the Week (published posts only, one per ISO week; audited) |
| GET      | `/api/v1/admin/audit-logs`                | role:admin | append-only log of every admin action |
| POST     | `/api/v1/posts`              | token  | creates place + media refs (+ optional `latitude`/`longitude` pin); a new author's FIRST post is held as `pending_review` |
| PATCH    | `/api/v1/posts/{id}`         | owner/admin |                        |
| DELETE   | `/api/v1/posts/{id}`         | owner/admin |                        |
| POST     | `/api/v1/uploads`            | token  | base64 media, allowlist + size limits |
| GET/POST | `/api/v1/posts/{id}/comments`| public/token |                     |
| DELETE   | `/api/v1/comments/{id}`      | owner/admin |                        |
| POST/DEL | `/api/v1/posts/{id}/like`    | token  | toggle                      |
| POST/DEL | `/api/v1/posts/{id}/bookmark`| token  | toggle ("save")             |
| POST/DEL | `/api/v1/users/{id}/follow`  | token  | toggle                      |
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

## Security posture

- **No tracking of any kind.** The design-export tool originally injected a
  session recorder (rrweb + key capture), a page-view beacon to the design
  tool's API, and an element-picker script into `index.html` — all three
  were removed on 2026-09-29 along with their companion Vite plugin. The
  app ships no analytics, no third-party scripts, no external beacons.
- **Client hardening** in `index.html`: Content-Security-Policy (self-only
  scripts/styles; media/images limited to the demo asset origins; no
  objects, no external form targets), Permissions-Policy
  (camera/geolocation/microphone/payment denied), strict referrer policy.
  Dev note: `script-src 'unsafe-inline'` and `connect-src ws:` exist only
  for the Vite dev server — tighten them behind your web server/CDN in
  production (the bundle itself has no inline scripts).
- **Response headers to set at the CDN/web server** (meta tags cannot set
  them): `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`),
  `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, and a
  `Cache-Control: no-store` on `/api/v1` auth responses.
- Sanctum bearer tokens (hashed at rest), bcrypt password hashing.
- Rate limiting: 60/min general API, 5/min on credential endpoints.
- CORS restricted to `FRONTEND_URL` (and later `ADMIN_FRONTEND_URL`).
- All input validated server-side (FormRequests); JSON-only error responses,
  no stack traces outside `APP_DEBUG`.
- Upload validation: MIME allowlist, size caps, random filenames.
- RBAC from day one: `roles` table + `role:` middleware + policies
  (owner-or-admin) — the admin panel builds on this, not around it.

## Admin panel (next step — designed, not built)

The backend is admin-ready without rewrites:

1. New separate website authenticates against the **same** API.
2. Add `/api/v1/admin/*` routes guarded by `role:admin`
   (moderation queue via the existing `posts.status` column, user
   management, campaign approval).
3. Services and policies are already shared — no controller logic reuse
   required.

## Known limitations

- The Laravel backend in this repo is written to Laravel 12 conventions but
  must be exercised on a machine with Docker (this repo's CI sandbox has no
  PHP). `docker compose up --build` + `php artisan test` is the verification
  path.
- Public maps render with MapLibre GL JS over free OpenFreeMap vector tiles
  (no API key). The tile source is centralized in `src/lib/mapConfig.ts` so
  the launch-region demo can swap to self-hosted PMTiles later without
  touching any component. Google is never used for map rendering — only the
  one-time business-registration confirm (`GOOGLE_PLACES_API_KEY`).
- The demo backend's data resets on reload (it is a demo, not storage).
- All demo content is original, self-contained, and isolated in `src/demo/`
  — see `src/demo/README.md` for the one-step removal when the real API
  takes over completely.
- Redis code paths are written but not executed in this repo's sandbox (no
  Docker/PHP here); `docker compose up` is the verification point.
