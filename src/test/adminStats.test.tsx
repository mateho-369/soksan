/**
 * Phase 1 hardening (2.4) — verified in the browser against the demo seam.
 * Admin dashboard stats: read-only counts, admin-only access.
 */
import { describe, expect, it } from 'vitest';
import { apiFetch } from '../lib/http';

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

describe('admin dashboard stats (Phase 1 hardening)', () => {
  it('admins receive an operational snapshot', async () => {
    const res = await apiFetch('/admin/stats', auth('mock-token-4'));
    expect(res.status).toBe(200);
    const stats = await res.json();

    expect(stats.posts.total).toBeGreaterThan(0);
    expect(stats.posts.published).toBeGreaterThan(0);
    expect(stats.posts.published + stats.posts.pending_review + stats.posts.rejected).toBeLessThanOrEqual(
      stats.posts.total,
    );
    expect(stats.reports.pending).toBeGreaterThanOrEqual(0);
    expect(stats.users.total).toBeGreaterThan(0);
    expect(Array.isArray(stats.top_provinces)).toBe(true);
    expect(stats.top_provinces.length).toBeGreaterThan(0);
    expect(stats.top_provinces[0].posts_count).toBeGreaterThan(0);

    // Provinces are ordered by post count, descending.
    const counts = stats.top_provinces.map((row: { posts_count: number }) => row.posts_count);
    expect(counts).toEqual([...counts].sort((a: number, b: number) => b - a));
  });

  it('non-admins cannot read the stats', async () => {
    const res = await apiFetch('/admin/stats', auth('mock-token-3'));
    expect(res.status).toBe(403);

    const anon = await apiFetch('/admin/stats');
    expect(anon.status).toBe(401);
  });
});
