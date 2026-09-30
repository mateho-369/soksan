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

## Media sources (placeholders)

- Photos: https://picsum.photos (seeded, stable URLs)
- Videos: Google's public sample bucket
  (`commondatastorage.googleapis.com/gtv-videos-bucket`) — replace with R2
  URLs in production.
