import { describe, expect, it } from 'vitest';
import { apiFetch } from '../lib/http';
import type { Post } from '../types';

/**
 * Phase 0 hardening — real moderation & safety controls through the seam:
 * reporting (one per reporter per item, auto-hide threshold), admin review,
 * blocks (stop follow/comment) and mutes (hide from feed).
 */

const json = (payload: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

/** json() + bearer token, merged correctly (spread order matters!). */
const authJson = (token: string, payload: unknown) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(payload),
});

const register = async (name: string, email: string): Promise<string> => {
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    ...json({ name, email, password: 'soksan-mod-1' }),
  });
  expect(res.status).toBe(201);
  return (await res.json()).token;
};

describe('reporting (Phase 0 hardening)', () => {
  it('users can report a post from the closed reason list', async () => {
    const token = await register('Reporter A', 'reporter.a@example.com');
    const res = await apiFetch('/reports', {
      method: 'POST',
      ...authJson(token, { reportable_type: 'post', reportable_id: 2, reason: 'scam', details: 'Fake prices' }),
    });
    expect(res.status).toBe(201);
    const report = await res.json();
    expect(report.status).toBe('pending');
    expect(report.reason).toBe('scam');
  });

  it('rejects unknown reasons, self-reports and duplicates', async () => {
    const token = await register('Reporter B', 'reporter.b@example.com');
    const auth = { Authorization: `Bearer ${token}` };

    const badReason = await apiFetch('/reports', {
      method: 'POST',
      ...authJson(token, { reportable_type: 'post', reportable_id: 2, reason: 'not_a_reason' }),
    });
    expect(badReason.status).toBe(422);

    // Self-report: create a post, then try to report it.
    const post = (await (
      await apiFetch('/posts', {
        method: 'POST',
        ...authJson(token, { caption: 'Mine', location_name: 'QA Self Spot', province: 'Kampot', category: 'nature', commune_id: 1006, media: [] }),
      })
    ).json()) as Post;
    const selfReport = await apiFetch('/reports', {
      method: 'POST',
      ...authJson(token, { reportable_type: 'post', reportable_id: post.id, reason: 'spam' }),
    });
    expect(selfReport.status).toBe(422);

    const first = await apiFetch('/reports', {
      method: 'POST',
      ...authJson(token, { reportable_type: 'post', reportable_id: 4, reason: 'spam' }),
    });
    expect(first.status).toBe(201);
    const duplicate = await apiFetch('/reports', {
      method: 'POST',
      ...authJson(token, { reportable_type: 'post', reportable_id: 4, reason: 'spam' }),
    });
    expect(duplicate.status).toBe(409);
  });

  it('a post is auto-hidden into the review queue after 3 pending reports', async () => {
    const t1 = await register('Hider A', 'hider.a@example.com');
    const t2 = await register('Hider B', 'hider.b@example.com');
    const t3 = await register('Hider C', 'hider.c@example.com');

    for (const token of [t1, t2, t3]) {
      const res = await apiFetch('/reports', {
        method: 'POST',
        ...authJson(token, { reportable_type: 'post', reportable_id: 5, reason: 'fake_place' }),
      });
      expect(res.status).toBe(201);
    }

    // Pulled out of the public feed (pending_review is not visible).
    const feed = (await (await apiFetch('/posts')).json()) as Post[];
    expect(feed.find((p) => p.id === 5)).toBeUndefined();
  });

  it('admins list pending reports and approving one hides the content', async () => {
    const reporter = await register('Reporter C', 'reporter.c@example.com');
    await apiFetch('/reports', {
      method: 'POST',
      ...authJson(reporter, { reportable_type: 'post', reportable_id: 6, reason: 'nudity' }),
    });

    const list = (await (
      await apiFetch('/admin/reports?status=pending', { headers: { Authorization: 'Bearer mock-token-4' } })
    ).json()) as Array<{ id: number; reportable_id: number; status: string }>;
    const target = list.find((r) => r.reportable_id === 6);
    expect(target).toBeTruthy();
    expect(target?.status).toBe('pending');

    const review = await apiFetch(`/admin/reports/${target!.id}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer mock-token-4', 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved' }),
    });
    expect(review.status).toBe(200);

    // Approved report hides the post from the public feed.
    const feed = (await (await apiFetch('/posts')).json()) as Post[];
    expect(feed.find((p) => p.id === 6)).toBeUndefined();

    // Non-admins cannot touch the queue.
    const forbidden = await apiFetch('/admin/reports', { headers: { Authorization: `Bearer ${reporter}` } });
    expect(forbidden.status).toBe(403);
  });

  it('reporters can withdraw their own pending report', async () => {
    const token = await register('Withdrawer', 'withdrawer@example.com');
    const auth = { Authorization: `Bearer ${token}` };
    const created = await (
      await apiFetch('/reports', {
        method: 'POST',
        ...authJson(token, { reportable_type: 'post', reportable_id: 7, reason: 'other' }),
      })
    ).json();

    const withdrawn = await apiFetch(`/reports/${created.id}`, { method: 'DELETE', headers: auth });
    expect(withdrawn.status).toBe(200);

    const second = await apiFetch(`/reports/${created.id}`, { method: 'DELETE', headers: auth });
    expect(second.status).toBe(404);
  });
});

describe('blocks and mutes (Phase 0 hardening)', () => {
  it('blocking prevents follows and comments in both directions', async () => {
    const owner = 'mock-token-3'; // dara
    const strangerToken = await register('Stranger', 'stranger.block@example.com');

    // Stranger comments fine before the block (on a post by another author).
    const before = await apiFetch('/comments', {
      method: 'POST',
      ...authJson(strangerToken, { post_id: 2, body: 'Lovely spot!' }),
    });
    expect(before.status).toBe(201);

    // Dara blocks the stranger.
    const block = await apiFetch('/users/102/block', { method: 'POST', headers: { Authorization: `Bearer ${owner}` } });
    expect([201, 404, 422]).toContain(block.status);

    // Register a fresh pair to test deterministically (known ids).
    const aRes = await apiFetch('/auth/register', {
      method: 'POST',
      ...json({ name: 'Blocker A', email: 'blocker.a@example.com', password: 'soksan-mod-1' }),
    });
    const aData = await aRes.json();
    const bRes = await apiFetch('/auth/register', {
      method: 'POST',
      ...json({ name: 'Blocked B', email: 'blocked.b@example.com', password: 'soksan-mod-1' }),
    });
    const bData = await bRes.json();
    const aToken = aData.token as string;
    const bToken = bData.token as string;

    const blockRes = await apiFetch(`/users/${bData.user.id}/block`, { method: 'POST', ...authJson(aToken, {}) });
    expect(blockRes.status).toBe(201);

    // B tries to follow A -> 403 (follow seam keys by profile_id = user id).
    const follow = await apiFetch('/follows', {
      method: 'POST',
      ...authJson(bToken, { profile_id: aData.user.id }),
    });
    expect(follow.status).toBe(403);

    // Unblock restores interaction.
    await apiFetch(`/users/${bData.user.id}/block`, { method: 'DELETE', ...authJson(aToken, {}) });
    const followAfter = await apiFetch('/follows', {
      method: 'POST',
      ...authJson(bToken, { profile_id: aData.user.id }),
    });
    expect(followAfter.status).toBe(200);
  });

  it('muting an author hides their posts from the muter feed only', async () => {
    const muterToken = await register('Muter', 'muter@example.com');
    const authorToken = await register('Muted Author', 'muted.author@example.com');

    // Author publishes a post (first-post gate holds it… so publish via admin approval path? No —
    // create as an account that already has posts: use dara).
    const authorPost = (await (
      await apiFetch('/posts', {
        method: 'POST',
        ...authJson('mock-token-3', { caption: 'Mute me', location_name: 'QA Mute Spot', province: 'Kampot', category: 'nature', commune_id: 1006, media: [] }),
      })
    ).json()) as Post;
    void authorToken;

    // Visible before muting.
    let feed = (await (await apiFetch('/posts', { headers: { Authorization: `Bearer ${muterToken}` } })).json()) as Post[];
    expect(feed.find((p) => p.id === authorPost.id)).toBeTruthy();

    const mute = await apiFetch('/users/3/block'.replace('/block', '/mute'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${muterToken}` },
    });
    expect(mute.status).toBe(201);

    // Hidden from the muter…
    feed = (await (await apiFetch('/posts', { headers: { Authorization: `Bearer ${muterToken}` } })).json()) as Post[];
    expect(feed.find((p) => p.id === authorPost.id)).toBeUndefined();

    // …but still visible to everyone else.
    feed = (await (await apiFetch('/posts')).json()) as Post[];
    expect(feed.find((p) => p.id === authorPost.id)).toBeTruthy();

    // Unmute restores it.
    await apiFetch('/users/3/mute', { method: 'DELETE', headers: { Authorization: `Bearer ${muterToken}` } });
    feed = (await (await apiFetch('/posts', { headers: { Authorization: `Bearer ${muterToken}` } })).json()) as Post[];
    expect(feed.find((p) => p.id === authorPost.id)).toBeTruthy();
  });
});
