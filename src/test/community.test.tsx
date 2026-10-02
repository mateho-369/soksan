import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderAppAt } from './render';
import { apiFetch } from '../lib/http';
import { CONTRIBUTOR_FORMULA } from '../lib/api';
import type { Collection, ContributorSummary, Post } from '../types';

/**
 * Phase 7 — Community: transparent contributor levels/badges, public
 * Collections, and duplicate-place detection that merges ONLY after an
 * admin confirms (audited).
 */

const ADMIN_AUTH = { Authorization: 'Bearer mock-token-4' };
const json = (payload: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

describe('contributor levels & badges (Phase 7)', () => {
  it('derives points live with the public formula (likes*1 + comments*3 + shares*2 + views/50)', async () => {
    // Dara (id 3) owns seeded post 100 — recompute her score from the feed.
    const feedRes = await apiFetch('/posts');
    const feed = (await feedRes.json()) as Post[];
    const expected = feed
      .filter((p) => p.profile_id === 3)
      .reduce(
        (sum, p) =>
          sum + p.like_count + 3 * p.comment_count + 2 * p.share_count + (p.view_count ?? 0) / 50,
        0,
      );

    const mineRes = await apiFetch('/contributors/me', {
      headers: { Authorization: 'Bearer mock-token-3' },
    });
    expect(mineRes.status).toBe(200);
    const summary = (await mineRes.json()) as ContributorSummary;
    expect(summary.quality_points).toBeCloseTo(expected, 1);
    expect(summary.formula).toBe(CONTRIBUTOR_FORMULA);
    expect(summary.badges).toContain('first_story');
    // Level floors are monotonic and consistent with the points.
    expect(summary.quality_points).toBeGreaterThanOrEqual(summary.level.floor);
    if (summary.next_level) {
      expect(summary.quality_points).toBeLessThan(summary.next_level.floor);
    }
  });

  it('a public profile can read any contributor summary', async () => {
    const res = await apiFetch('/contributors/3');
    expect(res.status).toBe(200);
    const summary = (await res.json()) as ContributorSummary;
    expect(summary.level.key).toBeTruthy();
    expect(Array.isArray(summary.badges)).toBe(true);
  });

  it('a new author with zero published posts sits at Seedling with no badges', async () => {
    const registerRes = await apiFetch('/auth/register', {
      method: 'POST',
      ...json({ name: 'New Seed', email: 'new.seed@example.com', password: 'soksan-seed-1' }),
    });
    const { token, user } = await registerRes.json();

    const res = await apiFetch('/contributors/me', { headers: { Authorization: `Bearer ${token}` } });
    const summary = (await res.json()) as ContributorSummary;
    expect(summary.quality_points).toBe(0);
    expect(summary.level.key).toBe('seedling');
    expect(summary.badges.length).toBe(0);
    // Their first post is held for review, so it must NOT add points.
    await apiFetch('/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: 'Seed post',
        location_name: 'QA Seed Spot',
        category: 'nature',
        commune_id: 1005,
        province: 'Kampot',
        media: [],
      }),
    });
    const after = (await (await apiFetch('/contributors/me', { headers: { Authorization: `Bearer ${token}` } })).json()) as ContributorSummary;
    expect(after.quality_points).toBe(0);
    expect(user.name).toBe('New Seed');
  });

  it('the profile page shows the contributor card to signed-in users', async () => {
    localStorage.setItem('soksan-token', 'mock-token-3');
    renderAppAt('/profile');
    expect(
      await screen.findByText(/your contributor level/i, {}, { timeout: 6000 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(CONTRIBUTOR_FORMULA).length).toBeGreaterThan(0);
  });
});

describe('public Collections (Phase 7)', () => {
  let ownerToken = '';
  let otherToken = '';
  let collection: Collection;

  it('creates a public collection; only published posts can be collected', async () => {
    const ownerRes = await apiFetch('/auth/register', {
      method: 'POST',
      ...json({ name: 'Curator One', email: 'curator.one@example.com', password: 'soksan-cur-1' }),
    });
    ownerToken = (await ownerRes.json()).token;
    const otherRes = await apiFetch('/auth/register', {
      method: 'POST',
      ...json({ name: 'Curator Two', email: 'curator.two@example.com', password: 'soksan-cur-2' }),
    });
    otherToken = (await otherRes.json()).token;

    // Owner's first post = pending_review (Phase 5 gate) → cannot collect it.
    const pendingRes = await apiFetch('/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: 'Pending place',
        location_name: 'QA Pending Collect',
        category: 'food',
        commune_id: 1001,
        province: 'Phnom Penh',
        media: [],
      }),
    });
    const pendingPost = (await pendingRes.json()) as Post;
    expect(pendingPost.status).toBe('pending_review');

    const createRes = await apiFetch('/collections', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Best coffee in Phnom Penh', description: 'Worked-tested cafés.' }),
    });
    expect(createRes.status).toBe(201);
    collection = (await createRes.json()) as Collection;
    expect(collection.slug.length).toBeGreaterThan(5);

    const blocked = await apiFetch(`/collections/${collection.id}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: pendingPost.id }),
    });
    expect(blocked.status).toBe(422);

    const added = await apiFetch(`/collections/${collection.id}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: 2 }),
    });
    expect(added.status).toBe(201);
    expect(((await added.json()) as Collection).posts_count).toBe(1);
  });

  it('is publicly browsable by index and by slug', async () => {
    const indexRes = await apiFetch('/collections');
    expect(indexRes.status).toBe(200);
    const index = (await indexRes.json()) as Collection[];
    const listed = index.find((c) => c.id === collection.id);
    expect(listed).toBeTruthy();
    expect(listed?.posts_count).toBe(1);
    expect(listed?.owner?.name).toBe('Curator One');

    const detailRes = await apiFetch(`/collections/${collection.slug}`);
    expect(detailRes.status).toBe(200);
    const detail = (await detailRes.json()) as Collection;
    expect(detail.items?.length).toBe(1);
    expect(detail.items?.[0].post.id).toBe(2);
  });

  it('only the owner can mutate a collection', async () => {
    const strangerAdd = await apiFetch(`/collections/${collection.id}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: 3 }),
    });
    expect(strangerAdd.status).toBe(403);

    const strangerPatch = await apiFetch(`/collections/${collection.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${otherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hijacked' }),
    });
    expect(strangerPatch.status).toBe(403);

    const removeItem = await apiFetch(`/collections/${collection.id}/posts/2`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(removeItem.status).toBe(200);
    expect(((await removeItem.json()) as Collection).posts_count).toBe(0);
  });

  it('the browse page lists public collections', async () => {
    // Put something back in so the card shows a count.
    await apiFetch(`/collections/${collection.id}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: 2 }),
    });
    renderAppAt('/collections');
    expect(
      await screen.findByText(/community collections/i, {}, { timeout: 6000 }),
    ).toBeInTheDocument();
    // The grid fills in after the index fetch resolves.
    expect(
      (await screen.findAllByText('Best coffee in Phnom Penh', undefined, { timeout: 6000 }))
        .length,
    ).toBeGreaterThan(0);
  });
});

describe('duplicate-place detection (Phase 7)', () => {
  it('detects the seeded same-name pair inside one commune', async () => {
    const res = await apiFetch('/admin/places/duplicates', { headers: ADMIN_AUTH });
    expect(res.status).toBe(200);
    const pairs = (await res.json()) as Array<{
      a: { id: number; name: string };
      b: { id: number; name: string };
      reason: string;
    }>;
    const seeded = pairs.find(
      (p) => (p.a.id === 4 && p.b.id === 101) || (p.a.id === 101 && p.b.id === 4),
    );
    expect(seeded).toBeTruthy();
    expect(seeded?.reason).toBe('same name');
  });

  it('refuses non-admin access to detection and merge', async () => {
    const anon = await apiFetch('/admin/places/duplicates');
    expect(anon.status).toBe(401);
    const member = await apiFetch('/admin/places/duplicates', {
      headers: { Authorization: 'Bearer mock-token-3' },
    });
    expect(member.status).toBe(403);
  });

  it('merges ONLY via the admin-confirmed endpoint, audits it, hides the duplicate', async () => {
    const mergeRes = await apiFetch('/admin/places/merge', {
      method: 'POST',
      headers: { ...ADMIN_AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify({ canonical_id: 4, duplicate_id: 101 }),
    });
    expect(mergeRes.status).toBe(200);

    // The duplicate vanished from the public feed and the candidate list.
    const feedRes = await apiFetch('/posts');
    const feed = (await feedRes.json()) as Post[];
    expect(feed.some((p) => p.id === 101)).toBe(false);

    const pairsRes = await apiFetch('/admin/places/duplicates', { headers: ADMIN_AUTH });
    const pairs = (await pairsRes.json()) as Array<{ a: { id: number }; b: { id: number } }>;
    expect(pairs.some((p) => p.a.id === 101 || p.b.id === 101)).toBe(false);

    // And the merge is recorded in the audit log.
    const auditRes = await apiFetch('/admin/audit-logs', { headers: ADMIN_AUTH });
    const audit = (await auditRes.json()) as Array<{ action: string }>;
    expect(audit.some((row) => row.action === 'place.merge')).toBe(true);

    // Merging an already-merged place is refused.
    const again = await apiFetch('/admin/places/merge', {
      method: 'POST',
      headers: { ...ADMIN_AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify({ canonical_id: 4, duplicate_id: 101 }),
    });
    expect(again.status).toBe(422);
  });
});
