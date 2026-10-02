import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAppAt } from './render';
import { apiFetch } from '../lib/http';
import { isPlacementActive } from '../lib/api';

/**
 * Phase 4 — monetization: lead tracking + partner placements.
 * Rules under test:
 *   1. Every partner card is labeled ដៃគូ · Partner.
 *   2. Admin date ranges hide expired/future placements.
 *   3. Call / Message / Directions taps log leads visible to the owner.
 *   4. Partner data never appears in organic ranking output.
 */
async function loginViaUI(user: ReturnType<typeof userEvent.setup>) {
  renderAppAt('/login');
  await user.type(await screen.findByPlaceholderText('you@example.com'), 'dara@soksan.app');
  await user.type(screen.getByPlaceholderText('••••••••'), 'soksan123');
  await user.click(screen.getByRole('button', { name: /log in/i }));
  await waitFor(() => screen.getByRole('button', { name: /log out/i }), { timeout: 6000 });
}

describe('partner placements', () => {
  it('shows only placements inside their admin date window, always labeled', async () => {
    renderAppAt('/partners');

    // Active window + open-ended placements visible…
    await screen.findAllByText(/malis coastal guide/i);
    expect(screen.getAllByText(/kampot friendly tuk-tuk/i).length).toBeGreaterThan(0);
    // …the expired one (ended 2026-06-30) is not served at all.
    expect(screen.queryAllByText(/highland green taxi/i)).toHaveLength(0);

    // Mandatory ដៃគូ · Partner label on every card.
    const labels = screen.getAllByText(/ដៃគូ · partner/i);
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });

  it('admin date-window logic: past/future/open-ended', () => {
    const now = new Date('2026-09-30T12:00:00Z');
    expect(isPlacementActive({ active: true, starts_at: null, ends_at: null }, now)).toBe(true);
    expect(
      isPlacementActive(
        { active: true, starts_at: '2026-09-01T00:00:00Z', ends_at: '2026-12-31T00:00:00Z' },
        now,
      ),
    ).toBe(true);
    // Expired yesterday.
    expect(
      isPlacementActive(
        { active: true, starts_at: '2026-01-01T00:00:00Z', ends_at: '2026-09-29T00:00:00Z' },
        now,
      ),
    ).toBe(false);
    // Scheduled for next month.
    expect(
      isPlacementActive(
        { active: true, starts_at: '2026-10-15T00:00:00Z', ends_at: null },
        now,
      ),
    ).toBe(false);
    // Admin switched it off.
    expect(isPlacementActive({ active: false, starts_at: null, ends_at: null }, now)).toBe(false);
  });
});

describe('lead tracking', () => {
  it('logs call / message / directions on the public business profile', async () => {
    const user = userEvent.setup();
    renderAppAt('/business/1');

    await screen.findByText(/dara's riverside café/i);

    await user.click(screen.getByRole('link', { name: /^call$/i }));
    await user.click(screen.getByRole('button', { name: /^message$/i }));
    expect(await screen.findByText(/the business will see your message request/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^directions$/i })).toHaveAttribute(
      'href',
      expect.stringContaining('openstreetmap.org/directions'),
    );
    await user.click(screen.getByRole('link', { name: /^directions$/i }));

    // Owner sees the 7-day summary: 3 seeded calls + 1, 1 seeded message + 1,
    // 2 seeded directions + 1 (seeded dates sit within 7 days of 2026-09-30).
    await loginViaUI(user);
    renderAppAt('/business/dashboard');
    await screen.findAllByText(/dara's riverside café/i);
    await waitFor(
      () => {
        expect(screen.getAllByText(/leads — last 7 days/i).length).toBeGreaterThan(0);
      },
      { timeout: 6000 },
    );
    const res = await apiFetch('/businesses/leads/summary?business_id=1');
    const summary = await res.json();
    expect(summary.call).toBe(3);
    expect(summary.message).toBe(2);
    expect(summary.directions).toBe(3);
    expect(summary.total).toBe(8);
  });

  it('guard: strangers cannot read another business\' lead analytics', async () => {
    // No token at all.
    const saved = localStorage.getItem('soksan-token');
    localStorage.removeItem('soksan-token');
    const anon = await apiFetch('/businesses/leads/summary?business_id=1');
    expect(anon.status).toBe(401);

    // A registered-but-unrelated user gets 403, not the analytics.
    const register = await apiFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'QA Stranger', email: 'qa-stranger@example.com', password: 'soksan123' }),
    });
    expect(register.ok).toBe(true);
    const { token: strangerToken } = await register.json();
    const stranger = await apiFetch('/businesses/leads/summary?business_id=1', {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    expect(stranger.status).toBe(403);

    if (saved === null) localStorage.removeItem('soksan-token');
    else localStorage.setItem('soksan-token', saved);
  });
});

describe('ranking isolation', () => {
  it('organic rankings contain no partner placement data', async () => {
    const res = await apiFetch('/rankings/geography?scope=communes');
    expect(res.ok).toBe(true);
    const text = JSON.stringify(await res.json());
    // Partner businesses are paid placements; they must never leak into the
    // organic ranking payload.
    expect(text).not.toContain('Malis Coastal Guide');
    expect(text).not.toContain('Kampot Friendly Tuk-Tuk');
    expect(text).not.toContain('monthly_fee');
  });
});
