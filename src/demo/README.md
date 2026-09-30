# DEMO DATA — remove this folder when the real backend takes over

Everything in `src/demo/` is **mock content authored for the in-browser demo
backend** (`src/lib/api.ts`). It exists so the whole app is browsable without
the Laravel service.

## How to remove it later (one clean cut)

1. Delete this folder: `src/demo/`.
2. Delete the demo backend: `src/lib/api.ts`.
3. In `src/main.tsx`, remove the `installApi()` import + call.
4. Point `VITE_API_BASE_URL` at the real API (or rely on the `/api/v1`
   default) and set `VITE_USE_MOCK=false`.

Nothing outside those three files imports from `src/demo/`.

## What is inside

- `data/*.json` — the seed content (posts, clips, comments, destinations,
  rankings, partners, boosts, ads, conversations, profile, services,
  itineraries, contacts, categories). All of it is original demo content
  written for this project; places are real Cambodian regions but the
  descriptions, authors, and numbers are invented.
- Demo login: `dara@soksan.app` / `soksan123`.
- Clips extras implemented in `src/lib/api.ts`:
  `GET /posts?format=clips&page=N` returns pages of 3 (an empty page marks
  the end of the feed) and `PUT /posts {"action":"view"}` bumps a clip's
  view counter — the real backend will do both from Redis.
- Real-API contract notes for the switch-over: clips pagination maps to
  `GET /api/v1/posts?page=N` (add a `video` media filter server-side) and
  view counting maps to `POST /api/v1/posts/{id}/view` (public,
  Redis-backed, already implemented in the Laravel backend).
- Phase 1 geography: `geography.json` is a launch-region SUBSET in the
  import-ready flat shape (upsert by `code`); the full national dataset
  (~1,600 communes) slots in without schema change. Mock endpoints:
  `GET /geography`, `GET /rankings/geography?scope=communes|districts|provinces`
  (same recency-decay formula as the backend `RankingService`:
  `(1 + likes + 2·comments + shares + views/100) · 0.5^(age/21d)`).
- Phase 2 map: `destinations.json` carries real `lat`/`lng` (the old
  `map_x`/`map_y` percentages are gone). Tiles come from OpenFreeMap via
  `src/lib/mapConfig.ts` — the demo has NO map API key of its own. The
  manual-pin path (`POST /api/places/confirm` with `lat`/`lng`) is mirrored
  in the demo seam; the Google Places branch needs a production key and is
  stubbed.
- Phase 3 businesses: `businesses.json` seeds ONE business for the demo
  user (Dara) so the owner dashboard and the Bakong KHQR upgrade flow are
  exercisable. The demo confirms KHQR payments instantly — production
  verifies payments against the Bakong API.
- Phase 4 monetization: `lead_events.json` seeds call/message/directions
  taps for the demo business (dates within 7 days of 2026-09-30). Partner
  placements carry admin date ranges in `partners.json` (`starts_at` /
  `ends_at`); the partner with the expired window is filtered out by the
  demo seam exactly as `PartnerPlacementService::activeAt()` does.
- Phase 5 admin: the seam mirrors the moderation pipeline. A new author's
  FIRST post is held as `pending_review` (all seeded posts have no status
  and are treated as published). New business registrations start
  `pending`. Log in as `admin@soksan.app` / `soksan123` (mock user id 4,
  `role: admin`) and open `/admin` for the queues, placement scheduling,
  the Hidden Gem picker and the audit log; the same rules are enforced at
  `/api/admin/*` (401 anonymous, 403 non-admin) and every action appends
  an audit row. `GET /api/hidden-gem/current` powers the home banner.
- Phase 6 discovery: `GET /api/trending` re-weights the SAME engagement
  formula as rankings with a 3-day half-life inside a 14-day window
  (`TRENDING_HALF_LIFE_DAYS` / `TRENDING_WINDOW_DAYS`), so it surfaces what
  is hot NOW without touching ranking state. Trip lists (`/api/trips*`)
  accept published posts only and are shared by slug. Offline save lives in
  `src/lib/offlineStore.ts` (localStorage) plus a production-only service
  worker (`public/sw.js`) that caches the app shell — media files come from
  CDN placeholders, so only the shell + explicitly saved posts are
  guaranteed offline.
- Phase 7 community: contributor levels are derived LIVE in the seam exactly
  as `ContributorService` does (`points = likes*1 + comments*3 + shares*2 +
  views/50` over published posts; pending/rejected posts count for nothing)
  with floors 0/50/200/600/1500 → Seedling → Ambassador, plus milestone
  badges. Public collections (`/api/collections*`) are always public and
  hold published posts only. Duplicate detection flags posts sharing a
  normalized place name inside one commune (the seeded pair: post 4 and
  post 101, "Phsar Chas Noodle Corner"); merging happens exclusively via
  the admin-confirmed `/api/admin/places/merge` and writes an audit row —
  the merged place becomes hidden (`status = merged`).

## Media sources (placeholders)

- Photos: https://picsum.photos (seeded, stable URLs)
- Videos: Google's public sample bucket
  (`commondatastorage.googleapis.com/gtv-videos-bucket`) — replace with R2
  URLs in production.
