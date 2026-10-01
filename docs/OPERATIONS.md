# SokSan — Operations Manual

Audience: on-call engineers and trusted admins. Everything here assumes the
stack from `docs/DEPLOYMENT.md`: Laravel 12 (PHP 8.3), PostgreSQL 16 +
PostGIS, Redis, Cloudflare R2 storage, Docker, Cloudflare edge.

> ភាសាខ្មែរ: ឯកសារនេះសម្រាប់អ្នកថែទាំប្រព័ន្ធ។ សម្រាប់គោលការណ៍សហគមន៍ និងឯកជនភាព សូមមើល `docs/legal/`.

---

## 1. Health & metrics

| Endpoint | Auth | Purpose |
|---|---|---|
| `/up` | public | Liveness probe (Laravel `health:` route). Used by load balancers. |
| `GET /api/v1/ops/health` | role:admin | DB + Redis + queue liveness summary. |
| `GET /api/v1/ops/metrics` | role:admin | Queue depth, DB connections, Redis ping. |

Ops endpoints are admin-only on purpose — they leak internal topology.

## 2. Backups

Nightly schedule (cron on the app host or a CI job):

```bash
# 1. Database (custom format, PostGIS-safe). Keep 14 daily + 12 weekly.
pg_dump -Fc --no-owner "$DATABASE_URL" > /backup/soksan-$(date +%F).dump
gzip -c /backup/soksan-$(date +%F).dump > /backup/soksan-$(date +%F).dump.gz

# 2. Media (R2 is versioned; keep a monthly cross-region snapshot bucket).
# 3. .env files (contain keys) — encrypt before storing off-host.
```

Retention: 14 daily, 12 weekly, 12 monthly. Store outside the app host
(R2 bucket with lifecycle rules or separate object store).

**Restore drill (monthly, mandatory before launch):**

```bash
# Create throwaway DB, restore, run migrations status check.
createdb soksan-restore-test
pg_restore --no-owner -d soksan-restore-test soksan-YYYY-MM-DD.dump.gz
psql soksan-restore-test -c "select count(*) from posts;"
psql soksan-restore-test -c "select postgis_version();"   # PostGIS present
```

Redis is cache/queue only — it may be flushed; the system must tolerate a
cold cache (it does: feed cache rebuilds lazily, views recount on write).

## 3. Key & credential rotation

| Secret | Location | Rotation |
|---|---|---|
| `APP_KEY` | `.env` | On incident or staff departure. Rotate with `php artisan key:rotate` equivalent: generate new key, re-encrypt. Sessions survive (token-based), signed URLs invalidate — acceptable. |
| Database password | `.env` / host | Every 90 days; update connection, restart app. |
| Redis password | `.env` | With DB password. |
| R2 access keys | Cloudflare dashboard | Every 90 days; never more than one live key pair. |
| Sanctum tokens | DB | Reset-password and account-deletion flows already revoke all tokens. Admins can force it by truncating `personal_access_tokens` for a user. |
| Email (SMTP) credentials | `.env` | With DB password. |

Never commit `.env`. CI asserts `VITE_USE_MOCK=true` is absent from
`.env.production` (see `.github/workflows/ci.yml`).

## 4. Incident response runbook

1. **Detect** — `/up` failing, ops metrics alert, or moderation escalation.
2. **Classify**:
   - SEV1: data exposure, auth bypass, API down > 5 min.
   - SEV2: degraded (queue jam, cache dead), moderation flood.
   - SEV3: single-content issue.
3. **Contain** — for SEV1: enable maintenance mode
   (`php artisan down --secret=...`), rotate the exposed credential,
   revoke affected tokens (`DELETE FROM personal_access_tokens WHERE tokenable_id = ...`).
4. **Communicate** — post in the internal ops channel; external notice only
   if user data was exposed (see Privacy Policy notification duty).
5. **Recover & postmortem** — restore from backup if needed (drill script
   above), write a blameless postmortem within 72h.

Location data rule: during ANY incident, do not paste raw coordinates or
users' location choices into tickets/chat — use post IDs.

## 5. Moderation SOP

**Queue**: `GET /api/v1/admin/reports?status=pending` (in-app admin panel)
and `GET /api/v1/admin/posts?status=pending_review`.

SLAs: personal-safety or private-location reports — **4 hours**; everything
else — **48 hours**. Auto-hide (`config('moderation.auto_hide_reports')`,
default 3 pending reports) pulls content out of the feed *before* review;
that is a reversible safety measure, not a verdict.

Decision flow (`PATCH /api/v1/admin/reports/{id}`):

- `approved` — content violated guidelines: post → `rejected`, comment →
  deleted. Author is notified (in-app) without revealing the reporter.
- `rejected` / `dismissed` — content stays up; reporter is not notified of
  the outcome (privacy of the author), except for upheld cases above.

Rules:

- Every decision is audit-logged (`GET /api/v1/admin/audit-logs`) with the
  acting admin; never bypass the endpoint.
- Blocked/muted pairs cannot interact; a report involving a blocked user
  should be screened for retaliation patterns.
- Duplicate-place merges require the admin-confirmed endpoint
  (`POST /api/v1/admin/places/merge`) — never merge via raw SQL.
- Appeals: user may re-report or message; a second admin reviews.

## 6. Logging policy

- Production: `LOG_CHANNEL=json` — structured JSON lines, 14-day rotation
  (`storage/logs/soksan.json`). No third-party logging services.
- **Never log**: passwords, tokens, reset links, payment payloads, email
  addresses in request logs (user IDs only), raw coordinates or precise
  locations.
- Audit trail for admin actions lives in the database (`audit_logs`), not
  in free-form logs.

## 7. Rate limits (baseline)

Defined in `AppServiceProvider`: api 60/min, auth 5/min, posts 10/min,
social (comment/like/bookmark/follow/block/mute) 30/min, uploads 5/min,
reports 10/min, password-reset 5/min, verification 6/min. Accounts younger
than 48h get half the write budgets. 429 responses include
`Retry-After` via Laravel's throttle middleware.

## 8. Pre-launch production dry-run

Run through this list on the real environment before opening public beta:

```env
APP_ENV=production
APP_DEBUG=false              # never leak stack traces
VITE_USE_MOCK=false          # the runtime guard throws if this is "true"
VITE_API_BASE_URL=/api/v1    # same-origin proxy (see docs/DEPLOYMENT.md)
MEDIA_DISK=r2                # SafeMediaService output goes to R2
```

- [ ] `cd backend && php artisan test` passes on PHP 8.3 (no Docker
      needed for the suite; PostGIS paths additionally via docker compose).
- [ ] `php artisan migrate --force` clean on the production Postgres 16
      with PostGIS enabled (`select postgis_version();`).
- [ ] CORS allowed origins = frontend origin only.
- [ ] Sanctum stateless API tokens; `personal_access_tokens` table present.
- [ ] Queue worker running (`queue:work`) — uploads, moderation and
      notifications depend on it; confirm `supervisorctl status` / Docker.
- [ ] Redis reachable from the app only (private network, no published
      port) — or confirm `RedisGate` fallback by stopping Redis and
      loading the feed.
- [ ] R2 credentials in env (not committed); bucket CORS allows the
      frontend origin; test an upload end-to-end (EXIF check: upload a
      photo with GPS tags, download it back, verify tags are gone).
- [ ] Edge headers live: fetch the site and confirm the hardened CSP,
      HSTS, nosniff, frame-ancestors come back (curl -I).
- [ ] Real mailer configured (SMTP/SES) — send a password-reset email.
- [ ] Frontend build contains no `fonts.googleapis.com` and no
      `VITE_USE_MOCK=true` (CI asserts both).
- [ ] Never commit the real `.env`.

## 9. Routine checks

Daily: ops/health green, report queue age < SLA, disk < 70%.
Weekly: review audit log sample, failed-login spikes, R2 storage growth.
Monthly: restore drill, dependency updates (`composer audit`, `npm audit`),
rotate credentials per §3.
