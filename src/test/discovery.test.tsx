import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderAppAt } from './render';
import { apiFetch } from '../lib/http';
import { TRENDING_HALF_LIFE_DAYS, TRENDING_WINDOW_DAYS } from '../lib/api';
import {
  isSavedOffline,
  offlineEntries,
  removeOffline,
  saveOffline,
} from '../lib/offlineStore';
import type { Post, Trip } from '../types';

/**
 * Phase 6 — Discovery: Trending Now (recency-weighted, read-only), Trip
 * Planner (shareable public lists, published posts only) and offline save.
 */

const json = (payload: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

describe('Trending Now (Phase 6)', () => {
  it('is a read-only, recency-weighted list inside the 14-day window', async () => {
    const res = await apiFetch('/trending');
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      half_life_days: number;
      window_days: number;
      posts: Post[];
    };
    expect(data.half_life_days).toBe(TRENDING_HALF_LIFE_DAYS);
    expect(data.window_days).toBe(TRENDING_WINDOW_DAYS);
    expect(data.posts.length).toBeGreaterThan(0);

    const now = Date.now();
    for (const post of data.posts) {
      // Only fresh posts trend...
      expect(now - new Date(post.created_at).getTime()).toBeLessThanOrEqual(
        TRENDING_WINDOW_DAYS * 86400000,
      );
      // ...and only published ones ever surface.
      expect(!post.status || post.status === 'published').toBe(true);
    }
  });

  it('orders by engagement × 0.5^(age_days/3) — newest hot posts first', async () => {
    const [trendingRes, feedRes] = await Promise.all([apiFetch('/trending'), apiFetch('/posts')]);
    const { posts: trending } = (await trendingRes.json()) as { posts: Post[] };
    const feed = (await feedRes.json()) as Post[];

    const score = (post: Post): number => {
      const ageDays = Math.max(0, (Date.now() - new Date(post.created_at).getTime()) / 86400000);
      const engagement =
        1 + post.like_count + 2 * post.comment_count + post.share_count + (post.view_count ?? 0) / 100;
      return engagement * Math.pow(0.5, ageDays / TRENDING_HALF_LIFE_DAYS);
    };

    const expected = feed
      .filter((p) => Date.now() - new Date(p.created_at).getTime() <= TRENDING_WINDOW_DAYS * 86400000)
      .sort((a, b) => score(b) - score(a))
      .slice(0, 10)
      .map((p) => p.id);
    expect(trending.map((p) => p.id)).toEqual(expected);
  });

  it('the Discover page renders the trending rail', async () => {
    renderAppAt('/discover');
    expect(await screen.findByText(/trending now/i, {}, { timeout: 6000 })).toBeInTheDocument();
  });
});

describe('Trip Planner (Phase 6)', () => {
  let ownerToken = '';
  let otherToken = '';
  let trip: Trip;

  it('creates a trip and adds published posts; rejects unpublished ones', async () => {
    // Two fresh accounts: owner + a stranger.
    const ownerRes = await apiFetch('/auth/register', {
      method: 'POST',
      ...json({ name: 'Trip Owner', email: 'trip.owner@example.com', password: 'soksan-trip-1' }),
    });
    expect(ownerRes.status).toBe(201);
    ownerToken = (await ownerRes.json()).token;

    const otherRes = await apiFetch('/auth/register', {
      method: 'POST',
      ...json({ name: 'Trip Stranger', email: 'trip.stranger@example.com', password: 'soksan-trip-2' }),
    });
    otherToken = (await otherRes.json()).token;

    // Owner's FIRST post is held for review (Phase 5 gate) — perfect 422 bait.
    const pendingRes = await apiFetch('/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: 'Pending stop',
        location_name: 'QA Pending Stop',
        category: 'food',
        commune_id: 1003,
        province: 'Phnom Penh',
        media: [],
      }),
    });
    const pendingPost = (await pendingRes.json()) as Post;
    expect(pendingPost.status).toBe('pending_review');

    // Create the trip.
    const createRes = await apiFetch('/trips', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Kampot Weekend', description: 'Pepper, caves and river sunsets.' }),
    });
    expect(createRes.status).toBe(201);
    trip = (await createRes.json()) as Trip;
    expect(trip.slug.length).toBeGreaterThan(5);
    expect(trip.items_count).toBe(0);

    // Adding a pending post is refused...
    const blocked = await apiFetch(`/trips/${trip.id}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: pendingPost.id }),
    });
    expect(blocked.status).toBe(422);

    // ...but a published one goes in, and duplicates are idempotent.
    const add1 = await apiFetch(`/trips/${trip.id}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: 1 }),
    });
    expect(add1.status).toBe(201);
    expect(((await add1.json()) as Trip).items_count).toBe(1);

    const add2 = await apiFetch(`/trips/${trip.id}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: 1 }),
    });
    expect(((await add2.json()) as Trip).items_count).toBe(1);
  });

  it('share slug is publicly readable; privacy is enforced per list', async () => {
    // Anonymous reader sees the shared trip and its published stop.
    const sharedRes = await apiFetch(`/trips/shared/${trip.slug}`);
    expect(sharedRes.status).toBe(200);
    const shared = (await sharedRes.json()) as Trip;
    expect(shared.title).toBe('Kampot Weekend');
    expect(shared.items?.length).toBe(1);
    expect(shared.items?.[0].post.id).toBe(1);
    expect(shared.items?.[0].post.status ?? 'published').toBe('published');

    // Owner makes it private — anonymous now gets 404, owner still reads it.
    const makePrivate = await apiFetch(`/trips/${trip.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: false }),
    });
    expect(makePrivate.status).toBe(200);
    expect(((await makePrivate.json()) as Trip).is_public).toBe(false);

    const anonBlocked = await apiFetch(`/trips/shared/${trip.slug}`);
    expect(anonBlocked.status).toBe(404);

    const ownerRead = await apiFetch(`/trips/${trip.id}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(ownerRead.status).toBe(200);

    // Back to public for later tests.
    await apiFetch(`/trips/${trip.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: true }),
    });
  });

  it('only the owner can mutate a trip', async () => {
    const strangerPatch = await apiFetch(`/trips/${trip.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${otherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hijacked' }),
    });
    expect(strangerPatch.status).toBe(403);

    const strangerAdd = await apiFetch(`/trips/${trip.id}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: 2 }),
    });
    expect(strangerAdd.status).toBe(403);

    const strangerDelete = await apiFetch(`/trips/${trip.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    expect(strangerDelete.status).toBe(403);

    // Owner removes the stop, then deletes the trip entirely.
    const removeItem = await apiFetch(`/trips/${trip.id}/posts/1`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(removeItem.status).toBe(200);
    expect(((await removeItem.json()) as Trip).items_count).toBe(0);

    const deleted = await apiFetch(`/trips/${trip.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(deleted.status).toBe(200);

    const gone = await apiFetch(`/trips/shared/${trip.slug}`);
    expect(gone.status).toBe(404);
  });

  it('the trips page shows the sign-in gate to guests', async () => {
    localStorage.removeItem('soksan-token');
    renderAppAt('/trips');
    expect(await screen.findByText(/trip planner/i, {}, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByText(/sign in to collect/i)).toBeInTheDocument();
  });
});

describe('offline save (Phase 6)', () => {
  it('saves, lists and removes posts on-device without any network', async () => {
    const feedRes = await apiFetch('/posts');
    const feed = (await feedRes.json()) as Post[];
    const post = feed[0];

    expect(isSavedOffline(post.id)).toBe(false);
    saveOffline(post);
    saveOffline(post); // idempotent
    expect(isSavedOffline(post.id)).toBe(true);

    const entries = offlineEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].post.id).toBe(post.id);
    expect(entries[0].saved_at).toBeTruthy();

    removeOffline(post.id);
    expect(isSavedOffline(post.id)).toBe(false);
    expect(offlineEntries().length).toBe(0);
  });

  it('the offline library page renders saved posts from device storage', async () => {
    const feedRes = await apiFetch('/posts');
    const feed = (await feedRes.json()) as Post[];
    saveOffline(feed[1]);

    renderAppAt('/offline');
    expect(await screen.findByText(/offline library/i, {}, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getAllByText(feed[1].location_name).length).toBeGreaterThan(0);

    removeOffline(feed[1].id);
  });
});
