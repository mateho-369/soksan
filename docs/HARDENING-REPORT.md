# SokSan — Public Beta Hardening Report

Branch: `arena/01a0e79c-soksan` · Base: previous business-logic work (`64a794a`, PR #1)
Frontend gates at HEAD: `tsc --noEmit` clean · `eslint` clean · **vitest 133/133 (24 files)** · production build OK.

> **Verification model:** this sandbox has Node but **no PHP/composer/Docker**.
> All Laravel code is written against Laravel 12 conventions and syntax-checked,
> but its tests are marked **unverified** below. Everything frontend
> (including the in-browser demo seam that mirrors the API contract) is fully
> verified by the vitest suite.

---

## Commits (reviewable, one concern each)

| Commit | Scope |
|---|---|
| `547e953` | P0a — production mock-API guard (throws if `VITE_USE_MOCK=true` in prod), hardened production CSP (`script-src 'self'`, no `ws:`), dev-only CSP kept, `public/_headers` + nginx example |
| `fc8a735` | P0b — `EnsureSecurityHeaders` middleware (nosniff, DENY frames, referrer, Permissions-Policy, HSTS prod-only, no-store on auth paths) + per-action rate limiters |
| `afd612c` | P0c — `config/media.php` + `SafeMediaService`: finfo MIME sniffing (never client MIME), SVG blocked, images re-encoded via GD (EXIF/GPS stripped, ≤2560px, WebP/JPEG/PNG), videos queued |
| `fd80f8a` | P0d — location privacy: migration + `PostPolicy::viewExactLocation`, public rounding by precision (exact/approximate/sensitive), composer choice EN+KH |
| `8d919c1` | P0e — moderation: reports/blocks/mutes, auto-hide at 3 pending reports, admin review queue + post/user management, block-aware follow/comment |
| `9137dfb` | P0f — auth lifecycle: broker password reset (revokes all tokens), signed email verification, password-confirmed deletion with anonymization |
| `79d8839` | P0g — `.github/workflows/ci.yml` (frontend gates incl. mock-guard grep; backend `php artisan test` on phpunit's SQLite env) |
| `66a2ae1` | P1 — `GET /api/v1/posts/nearby`: PostGIS `ST_DWithin`/`ST_Distance`, GIST index, distance sort, rounded public coords |
| `219efa3` | P1 — search hardening: ILIKE on Postgres + pg_trgm GIN indexes + relevance ranking (Khmer-safe) |
| `dc104bb` | P1 — in-app notifications (likes/comments/approvals/report outcomes), bilingual, local-only, mark-read/read-all |
| `93e4512` | P1 — `GET /api/v1/admin/stats` dashboard snapshot |
| `e31f5fb` | P2/P3 — ReportDialog UI (⋯ → report/block/mute), structured JSON logging, `docs/OPERATIONS.md`, five bilingual legal pages |

## Migrations added (this hardening)

- `2026_01_12_000001_add_location_privacy_fields_to_posts_table` (precision default 4, `is_sensitive_location`, exact-to-owner default)
- `2026_01_13_000001_create_reports_table` (morphs post/comment, unique reporter+target)
- `2026_01_13_000002_create_blocks_and_mutes_tables`
- `2026_01_14_000001_add_location_point_geography_index_to_posts_table` (GIST, pgsql-guarded)
- `2026_01_14_000002_add_trigram_search_indexes_to_posts_table` (pg_trgm, pgsql-guarded)
- `2026_01_14_000003_create_notifications_table`

## New API routes (all under `/api/v1`, versioned)

- Public: `GET posts/nearby`
- Auth: `POST auth/forgot-password`, `POST auth/reset-password`, `POST email/verification-notification`, `GET email/verify/{id}/{hash}` (signed), `DELETE me`
- Auth safety: `POST/DELETE reports`, `POST/DELETE users/{user}/block`, `POST/DELETE users/{user}/mute`
- Auth inbox: `GET notifications`, `GET notifications/unread-count`, `POST notifications/read-all`, `POST notifications/{notification}/read`
- Admin (`role:admin`): `GET admin/stats`, `GET/PATCH admin/reports[/{id}]`, `GET/PATCH/DELETE admin/posts…`, `GET/PATCH admin/users…`

Rate limits (per minute, `<48h` accounts get half write budgets): api 60 · auth 5 · posts 10 · social 30 · uploads 5 · reports 10 · password-reset 5 · verification 6.

## Tests

**Frontend — verified (133 tests / 24 files):** new suites `moderation` (7),
`authFlows` (5), `nearby` (4), `notifications` (4), `adminStats` (2),
`reportUi` (3); plus all 18 pre-existing suites still green (infra change:
testing-library `asyncUtilTimeout` 4s for full-suite parallel load).

**Backend — written, unverified (no PHP here):** `UploadTest`, `ReportTest`,
`AuthFlowTest`, `NearbyPostTest`, `SearchTest`, `NotificationTest`,
`AdminStatsTest`. Run with `cd backend && php artisan test` on any machine
with PHP 8.3 (phpunit.xml pins SQLite :memory:, no services needed).

## Commands run / not run

Run here: `tsc --noEmit -p tsconfig.app.json`, `npm run lint`,
`vitest run` (full suite), `npm run build`, PHP token-balance checks on all
new/edited backend files.

Not runnable here (marked unverified): `php artisan test`,
`php artisan migrate`, `composer install`, `docker compose up`,
the CI workflow itself (push-based; needs GitHub runners).

## Remaining risks / known gaps

1. **`.github/workflows/ci.yml` is written but NOT yet pushed** — the
   GitHub App token for this session lacks the `workflows` permission, so
   GitHub rejects the push. The file is ready in the workspace; push it as
   a follow-up commit once the permission is granted (nothing else is
   blocked by it).
2. **Backend suite unverified** in this sandbox — first CI run may need
   small fixes (e.g. factory state for notification assertions).
3. Rate-limit tests for `<48h` budgets are not automated (manual check).
4. Legal pages are markdown; wiring them as in-app routes is a small
   follow-up (footer links currently point to the docs).
5. Email delivery needs a real SMTP/SES credential before verification &
   reset links work outside tests (`MAIL_MAILER=array` in tests).
6. PostGIS path of `/posts/nearby` is exercised only on production
   Postgres (SQLite runs the haversine fallback).

## Suggested next PRs

- Legal pages in-app (route + footer links, reuse the markdown content).
- Real S3/R2 media disk wiring + signed upload URLs.
- E2E smoke (Playwright) against docker-compose with real Postgres/PostGIS.
- Admin dashboard UI consuming `/admin/stats` + report queue.
