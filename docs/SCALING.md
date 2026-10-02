# SokSan Network — Scaling Plan (to ~1M users)

Plain-language plan for growing from one small server to a full production
setup. Each stage says **what to change**, **when to change it** (the
trigger), and roughly **what it costs**. Nothing here is built ahead of
time — the app is already stateless, so every stage is additive.

**Stateless from day one.** The API keeps no session or upload state on
local disk: sessions live in Redis, files in Cloudflare R2, counters flush
from Redis to PostgreSQL. Any request can land on any server, which is what
makes every stage below a "add another box" change instead of a rewrite.

---

## How Redis is used today (stage 1 code, stage 2 service)

| Feature | Redis structure | Notes |
|---|---|---|
| Feed cache | `feed:v1:{cat}:{prov}:{search}:{page}` strings + registry set | Anonymous feed pages only |
| View counters | `views:{post}` INCR, registry `counters:pending` | Batch-flushed to `posts.view_count` |
| Like/comment mirrors | `likes:{post}`, `comments:{post}` INCRBY | DB rows stay the source of truth |
| Province leaderboard | ZSET `leaderboard:provinces` | ZINCRBY on post; rebuilt from DB every 15 min |
| Sessions / cache / rate limiter | Laravel `SESSION_DRIVER/CACHE_STORE/QUEUE_CONNECTION=redis` | Multi-server ready out of the box |
| Moderation queue | Redis queue `moderation` | Consumed by separate `worker` containers |

### Cache invalidation strategy (plain language)

Two rules working together, so nothing is ever very stale and invalidation
is cheap:

1. **Short TTL (60 s).** Every cached anonymous feed page expires by
   itself after `FEED_CACHE_TTL` seconds. Even if nothing else worked, a
   new post is visible to anonymous readers within one minute.
2. **Write-through invalidation.** The moment a post is created or
   deleted, or a comment is added, we delete the affected cached pages
   immediately. We do **not** scan Redis with wildcards: every cached key
   is also recorded in a small registry set (`feed:v1:keys`), so
   invalidation is "read the list, delete exactly those keys". When the
   invalidation knows the province, only that province's pages are
   dropped; comments (which touch counts everywhere) flush the whole list.

| What is cached | TTL | What clears it early |
|---|---|---|
| Anonymous feed pages | 60 s | New/deleted post in the province; any new/deleted comment |
| View counters | none (persisted) | `counters:flush` (every minute) applies them to Postgres |
| Leaderboard | none | `leaderboard:rebuild` (every 15 min) recomputes from Postgres |

Redis is on the **private Docker network only** (no published port), so it
cannot be reached from outside the stack.

---

## Stage 1 — Single VPS (today → ~5k daily active users)

**What:** one VPS running `docker compose up` — Postgres + Redis + API +
worker + frontend all on the box. Cloudflare in front (free tier) for CDN
+ R2 for media.

**Trigger to move on:** CPU sustained > 70%, or Postgres + Redis + app
fighting for RAM (box < 20% free), or p95 response time > 500 ms.

**Cost/complexity:** ~$12–24/month VPS. Zero extra ops work. This is where
you stay as long as it is comfortable — do not upgrade early.

## Stage 2 — Split database & Redis onto their own servers (~5k–50k DAU)

**What:** move Postgres to its own managed/VPS box and Redis to its own
small box (or managed Redis). Point `DB_HOST` / `REDIS_HOST` at them.
Nothing in the code changes — the app already talks to them over the
network.

**Trigger to move on:** the API container itself saturates its CPU
(sustained > 70%) while DB and Redis are calm, or you want deploy-zero
downtime.

**Cost/complexity:** +$12–40/month. Low complexity: config change +
migration of data. Monitoring from stage 1 (`/api/v1/ops/health` and
`/ops/metrics`, admin-only) starts mattering here: watch DB connections
and Redis memory.

## Stage 3 — Multiple app servers + load balancer + read replicas (~50k–300k DAU)

**What:** 2–4 API containers behind a load balancer (Cloudflare LB or a
small nginx/HAProxy box); Postgres gains one read replica for feed reads;
workers get their own box (scale replicas of the `worker` service when
queue depth grows). Because sessions are in Redis and media in R2, new
app servers are interchangeable — no sticky sessions.

**Trigger to move on:** a single API box sustains > 70% CPU during peak,
or `queues:moderation` depth (visible in `/ops/metrics`) stays above a
few hundred jobs, or the primary Postgres CPU is high on reads.

**Cost/complexity:** +$50–150/month. Medium complexity: health-check
routing and a deploy habit of "add server, verify, then drain old".

## Stage 4 — Autoscaling + connection pooling + full edge (~300k–1M+ DAU)

**What:** autoscaled API containers (any orchestrator or a platform like
Fly/Render/Cloud Run); PgBouncer in front of Postgres to cap connection
counters; aggressive Cloudflare edge caching (full-page cache for
anonymous feeds at the CDN, R2 + image resizing at the edge). At this
point also consider a second Redis replica for queue/cache split.

**Trigger:** growth beyond ~300k DAU, traffic spikes > 3× baseline (the
autoscaler absorbs them), or Postgres connection count approaching 200.

**Cost/complexity:** usage-based, roughly $300–800/month at 1M MAU
depending on media egress, which R2 largely eliminates (no egress fees).
Highest complexity tier — adopt only when stages 1–3 are genuinely
outgrown.

---

## Monitoring hooks (already in the code)

- `GET /api/v1/ops/health` (admin) — app + Postgres + Redis liveness.
- `GET /api/v1/ops/metrics` (admin) — queue depth (default + moderation),
  active DB connections, PHP memory.
- Queue depth, DB connections, error rate and response time are the four
  numbers each stage's trigger above is based on; wire them into any
  dashboard (Grafana/UptimeRobot/Cloudflare) when entering stage 2.
- Scheduled jobs to keep alive from stage 2 on:
  `* * * * * php artisan schedule:run` (drives `counters:flush` and
  `leaderboard:rebuild`).

## Known limits (honest notes)

- Redis code paths are written but **not executed in this sandbox** (no
  Docker/PHP here) — first `docker compose up` is the verification point.
- Every Redis feature degrades gracefully to Postgres-only if Redis is
  unreachable (see `App\Services\RedisGate`).
- Per-user feed caching is intentionally not built yet; anonymous pages
  are cached, logged-in feeds come straight from Postgres until volume
  demands per-user pages.
- Moderation checks are pluggable stubs (Safe Browsing / Cloud Vision
  integration points are marked in `ModeratePostJob`).
