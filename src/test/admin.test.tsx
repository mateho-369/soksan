import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAppAt } from './render';
import { apiFetch } from '../lib/http';
import type { Post } from '../types';

/**
 * Phase 5 — in-app admin behind role:admin: moderation queue, first-post
 * gate, Hidden Gem of the Week, placement scheduling and the audit log.
 */

const ADMIN_AUTH = { Authorization: 'Bearer mock-token-4' };
const json = (payload: unknown) => ({
  headers: { ...ADMIN_AUTH, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

describe('admin RBAC (Phase 5)', () => {
  it('refuses anonymous and non-admin access to the admin API', async () => {
    const anon = await apiFetch('/admin/posts/pending');
    expect(anon.status).toBe(401);

    // mock-token-3 = Dara, role "user" — must be refused with 403.
    const member = await apiFetch('/admin/posts/pending', {
      headers: { Authorization: 'Bearer mock-token-3' },
    });
    expect(member.status).toBe(403);
  });
});

describe('first-post moderation pipeline (Phase 5)', () => {
  let pendingPostId = 0;

  it('holds a brand-new author’s first post for review', async () => {
    const registerRes = await apiFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fresh Author',
        email: 'fresh.author@example.com',
        password: 'soksan-demo-1',
      }),
    });
    expect(registerRes.status).toBe(201);
    const { token } = await registerRes.json();

    const createRes = await apiFetch('/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: 'My very first spot: iced coffee at the market.',
        location_name: 'QA Pending Café',
        category: 'food',
        commune_id: 1001,
        province: 'Phnom Penh',
        media: [],
      }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as Post;
    expect(created.status).toBe('pending_review');
    pendingPostId = created.id;

    // The public feed never shows posts under review.
    const feedRes = await apiFetch('/posts');
    const feed = (await feedRes.json()) as Post[];
    expect(feed.some((p) => p.id === pendingPostId)).toBe(false);

    // It waits in the admin queue.
    const queueRes = await apiFetch('/admin/posts/pending', { headers: ADMIN_AUTH });
    const queue = (await queueRes.json()) as Post[];
    expect(queue.some((p) => p.id === pendingPostId)).toBe(true);
  });

  it('admin approval publishes the post and the feed picks it up', async () => {
    const approveRes = await apiFetch('/admin/posts/approve', {
      method: 'POST',
      ...json({ post_id: pendingPostId }),
    });
    expect(approveRes.status).toBe(200);
    const approved = (await approveRes.json()) as Post;
    expect(approved.status).toBe('published');

    const feedRes = await apiFetch('/posts');
    const feed = (await feedRes.json()) as Post[];
    expect(feed.some((p) => p.id === pendingPostId)).toBe(true);

    // The decision is in the audit log.
    const auditRes = await apiFetch('/admin/audit-logs', { headers: ADMIN_AUTH });
    const audit = (await auditRes.json()) as Array<{ action: string; subject: string }>;
    expect(audit.some((row) => row.action === 'post.approve')).toBe(true);
  });

  it('rejects a pending post so it never reaches the feed', async () => {
    const registerRes = await apiFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Second Fresh',
        email: 'second.fresh@example.com',
        password: 'soksan-demo-2',
      }),
    });
    const { token } = await registerRes.json();
    const createRes = await apiFetch('/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: 'A spammy first post.',
        location_name: 'QA Reject Spot',
        category: 'food',
        commune_id: 1002,
        province: 'Phnom Penh',
        media: [],
      }),
    });
    const created = (await createRes.json()) as Post;
    expect(created.status).toBe('pending_review');

    const rejectRes = await apiFetch('/admin/posts/reject', {
      method: 'POST',
      ...json({ post_id: created.id }),
    });
    expect(rejectRes.status).toBe(200);
    expect(((await rejectRes.json()) as Post).status).toBe('rejected');

    const feedRes = await apiFetch('/posts');
    const feed = (await feedRes.json()) as Post[];
    expect(feed.some((p) => p.id === created.id)).toBe(false);
  });
});

describe('Hidden Gem of the Week (Phase 5)', () => {
  it('only published posts can be picked; the pick is public', async () => {
    // Grab a pending post id from the queue to prove it cannot be picked.
    const queueRes = await apiFetch('/admin/posts/pending', { headers: ADMIN_AUTH });
    const queue = (await queueRes.json()) as Post[];
    if (queue.length > 0) {
      const blocked = await apiFetch('/admin/hidden-gem', {
        method: 'POST',
        ...json({ post_id: queue[0].id }),
      });
      expect(blocked.status).toBe(422);
    }

    const pickRes = await apiFetch('/admin/hidden-gem', {
      method: 'POST',
      ...json({ post_id: 1, note: 'Editor favourite' }),
    });
    expect(pickRes.status).toBe(201);

    const currentRes = await apiFetch('/hidden-gem/current');
    expect(currentRes.status).toBe(200);
    const { current } = await currentRes.json();
    expect(current.post_id).toBe(1);
    expect(current.post.id).toBe(1);
  });

  it('the home feed shows the Hidden Gem banner', async () => {
    renderAppAt('/');
    expect(await screen.findByText(/hidden gem of the week/i, {}, { timeout: 6000 })).toBeInTheDocument();
  });
});

describe('placement scheduling (Phase 5)', () => {
  it('schedules a partner placement and toggles it via the admin API', async () => {
    const createRes = await apiFetch('/admin/placements', {
      method: 'POST',
      ...json({
        business_name: 'QA Partner Tours',
        starts_at: new Date(Date.now() - 86400000).toISOString(),
        ends_at: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    expect(createRes.status).toBe(201);
    const placement = await createRes.json();
    expect(placement.active).toBe(true);

    const toggleRes = await apiFetch('/admin/placements/update', {
      method: 'POST',
      ...json({ id: placement.id, active: false }),
    });
    expect(toggleRes.status).toBe(200);
    expect((await toggleRes.json()).active).toBe(false);

    const listRes = await apiFetch('/admin/placements', { headers: ADMIN_AUTH });
    const list = await listRes.json();
    expect(list.some((row: { id: number }) => row.id === placement.id)).toBe(true);

    const auditRes = await apiFetch('/admin/audit-logs', { headers: ADMIN_AUTH });
    const audit = (await auditRes.json()) as Array<{ action: string }>;
    expect(audit.some((row) => row.action === 'placement.schedule')).toBe(true);
    expect(audit.some((row) => row.action === 'placement.update')).toBe(true);
  });
});

describe('admin panel UI (Phase 5)', () => {
  it('refuses a signed-in member without the admin role', async () => {
    const user = userEvent.setup();
    renderAppAt('/login');
    await user.type(await screen.findByPlaceholderText('you@example.com'), 'dara@soksan.app');
    await user.type(screen.getByPlaceholderText('••••••••'), 'soksan123');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => screen.getAllByRole('button', { name: /log out/i }).length > 0, {
      timeout: 6000,
    });
    renderAppAt('/admin');
    expect(
      await screen.findByText(/does not have the admin role/i, {}, { timeout: 6000 }),
    ).toBeInTheDocument();
  });

  it('renders queues, placements, hidden gem and audit tabs for an admin', async () => {
    // Authenticate directly as the seeded admin (the login flow itself is
    // covered by the member test above and the QA suites).
    const stored = localStorage.getItem('soksan-token');
    localStorage.setItem('soksan-token', 'mock-token-4');

    renderAppAt('/admin');
    const waitOpts = { timeout: 8000 };
    expect((await screen.findAllByText(/admin panel/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/pending posts/i, undefined, waitOpts)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/pending businesses/i, undefined, waitOpts)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/partner placements/i, undefined, waitOpts)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/hidden gem/i, undefined, waitOpts)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/audit log/i, undefined, waitOpts)).length).toBeGreaterThan(0);

    // The audit tab lists recorded admin actions from earlier tests.
    const auditButtons = screen.getAllByRole('button', { name: /audit log/i });
    await userEvent.setup().click(auditButtons[auditButtons.length - 1]);
    expect(await screen.findByText(/post\.approve|business\.approve/i, {}, waitOpts)).toBeInTheDocument();

    if (stored === null) localStorage.removeItem('soksan-token');
    else localStorage.setItem('soksan-token', stored);
  });
});
