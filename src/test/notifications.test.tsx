/**
 * Phase 1 hardening (2.5) — verified in the browser against the demo seam.
 * In-app notifications for likes/comments/report outcomes: inbox, unread
 * count, mark-read and read-all. Local-only (no third-party push).
 */
import { describe, expect, it } from 'vitest';
import { apiFetch } from '../lib/http';

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });
const authJson = (token: string, payload: unknown) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(payload),
});

const DARA = 'mock-token-3'; // post author in the seed data

async function daraPostId(): Promise<number> {
  const res = await apiFetch('/posts', auth(DARA));
  const posts = await res.json();
  const mine = (posts as Array<{ id: number; author: { id: number } }>).find(
    (p) => p.author.id === 3,
  );
  if (!mine) throw new Error('seed data should contain a post by user 3');
  return mine.id;
}

async function register(name: string, email: string) {
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    ...authJson('ignored', { name, email, password: 'soksan-notif-1' }),
  });
  const data = await res.json();
  return data.token as string;
}

async function unreadCount(token: string): Promise<number> {
  const res = await apiFetch('/notifications/unread-count', auth(token));
  expect(res.status).toBe(200);
  const data = await res.json();
  return data.count as number;
}

describe('notification inbox (Phase 1 hardening)', () => {
  it('liking a post notifies its author (and never yourself)', async () => {
    const postId = await daraPostId();
    const fanToken = await register('Fan Sokha', 'fan.sokha@example.com');
    const before = await unreadCount(DARA);

    const like = await apiFetch('/posts', {
      method: 'PUT',
      ...authJson(fanToken, { id: postId, action: 'like' }),
    });
    expect(like.status).toBe(200);

    expect(await unreadCount(DARA)).toBe(before + 1);
    const inbox = await (await apiFetch('/notifications', auth(DARA))).json();
    const likeNote = (inbox.data as Array<{ type: string; message_en: string }>).find(
      (n) => n.type === 'like' && n.message_en.includes('Fan Sokha'),
    );
    expect(likeNote).toBeTruthy();

    // Self-interaction produces no notification.
    const selfBefore = await unreadCount(DARA);
    await apiFetch('/posts', { method: 'PUT', ...authJson(DARA, { id: postId, action: 'like' }) });
    expect(await unreadCount(DARA)).toBe(selfBefore);
  });

  it('commenting notifies the author with a bilingual message', async () => {
    const postId = await daraPostId();
    const commenter = await register('Commenter Chea', 'commenter.chea@example.com');
    const before = await unreadCount(DARA);

    const res = await apiFetch('/comments', {
      method: 'POST',
      ...authJson(commenter, { post_id: postId, body: 'Beautiful place!' }),
    });
    expect(res.status).toBe(201);

    expect(await unreadCount(DARA)).toBe(before + 1);
    const inbox = await (await apiFetch('/notifications', auth(DARA))).json();
    const note = (inbox.data as Array<{ type: string; message_kh: string }>).find(
      (n) => n.type === 'comment',
    );
    expect(note).toBeTruthy();
    expect(note?.message_kh.length).toBeGreaterThan(0);
  });

  it('notifications can be marked read individually and in bulk', async () => {
    const viewer = await register('Reader Rith', 'reader.rith@example.com');
    const postId = await daraPostId();

    // Two likers create two unread notifications for Dara.
    const l1 = await register('Liker One', 'liker.one@example.com');
    const l2 = await register('Liker Two', 'liker.two@example.com');
    await apiFetch('/posts', { method: 'PUT', ...authJson(l1, { id: postId, action: 'like' }) });
    await apiFetch('/posts', { method: 'PUT', ...authJson(l2, { id: postId, action: 'like' }) });

    const count = await unreadCount(DARA);
    expect(count).toBeGreaterThanOrEqual(2);

    // Mark one read.
    const inbox = await (await apiFetch('/notifications', auth(DARA))).json();
    const firstUnread = (inbox.data as Array<{ id: number; is_read: boolean }>).find(
      (n) => !n.is_read,
    );
    if (!firstUnread) throw new Error('expected at least one unread notification');
    await apiFetch(`/notifications/${firstUnread.id}/read`, { method: 'POST', ...authJson(DARA, {}) });
    expect(await unreadCount(DARA)).toBe(count - 1);

    // Another user's notification id is not accessible.
    const foreign = await apiFetch(`/notifications/${firstUnread.id + 5000}/read`, {
      method: 'POST',
      ...authJson(DARA, {}),
    });
    expect(foreign.status).toBe(404);

    // Bulk mark-all-read clears the rest.
    await apiFetch('/notifications/read-all', { method: 'POST', ...authJson(DARA, {}) });
    expect(await unreadCount(DARA)).toBe(0);

    // The unread filter now returns nothing.
    const unread = await (await apiFetch('/notifications?unread=1', auth(DARA))).json();
    expect(unread.data.length).toBe(0);
  });

  it('report decisions notify the content owner', async () => {
    const postId = await daraPostId();
    const reporter = await register('Reporter Leap', 'reporter.leap@example.com');

    await apiFetch('/reports', {
      method: 'POST',
      ...authJson(reporter, { reportable_type: 'post', reportable_id: postId, reason: 'spam' }),
    });

    // Admin dismisses the report.
    const list = await (await apiFetch('/admin/reports?status=pending', auth('mock-token-4'))).json();
    const target = (list as Array<{ id: number; reportable_id: number }>).find(
      (r) => r.reportable_id === postId,
    );
    if (!target) throw new Error('expected the pending report in the admin queue');
    await apiFetch(`/admin/reports/${target.id}`, {
      method: 'PATCH',
      ...authJson('mock-token-4', { decision: 'dismissed' }),
    });

    const inbox = await (await apiFetch('/notifications', auth(DARA))).json();
    const note = (inbox.data as Array<{ type: string; message_en: string }>).find(
      (n) => n.type === 'report_reviewed',
    );
    expect(note).toBeTruthy();
    expect(note?.message_en).toMatch(/no action/i);
  });
});
