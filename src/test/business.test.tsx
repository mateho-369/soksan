import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAppAt } from './render';
import { MockMap, mapMock } from './maplibre-mock';
import { apiFetch } from '../lib/http';

/**
 * Phase 3 — business registration + Bakong KHQR upgrade, driven through the
 * real UI. The demo seam auto-approves registrations (production holds them
 * for the Phase 5 admin queue) and confirms KHQR payments instantly.
 */
async function loginViaUI(user: ReturnType<typeof userEvent.setup>) {
  renderAppAt('/login');
  await user.type(await screen.findByPlaceholderText('you@example.com'), 'dara@soksan.app');
  await user.type(screen.getByPlaceholderText('••••••••'), 'soksan123');
  await user.click(screen.getByRole('button', { name: /log in/i }));
  await waitFor(() => screen.getByRole('button', { name: /log out/i }), { timeout: 6000 });
}

describe('business registration (Phase 3)', () => {
  it('registers a new business with a map pin and lands on the dashboard', async () => {
    const user = userEvent.setup();
    await loginViaUI(user);
    renderAppAt('/business/register');

    await user.type(await screen.findByLabelText(/business name/i), 'QA Test Café');
    await user.type(screen.getByLabelText(/short description/i), 'Test espresso by the quay.');
    await user.type(screen.getByLabelText(/phone/i), '+855 98 765 432');

    // Manual pin path (Phase 2) reused for business locations.
    await user.click(screen.getByRole('button', { name: /pin on map/i }));
    const pickerMap = await waitFor(() => {
      const map = mapMock.lastMap();
      expect(map).toBeTruthy();
      return map as InstanceType<typeof MockMap>;
    });
    await waitFor(() => {
      pickerMap.emit('click', { lngLat: { lat: 11.5701, lng: 104.9211 } });
      expect(screen.getByText(/11\.57010, 104\.92110/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /use this location/i }));

    await user.click(screen.getByRole('button', { name: /^register business$/i }));

    // Lands on the owner dashboard showing the new business (the login app
    // instance stays mounted behind, so matches can be duplicated).
    await waitFor(
      () => {
        expect(screen.getAllByText('QA Test Café').length).toBeGreaterThan(0);
      },
      { timeout: 6000 },
    );
    expect(screen.getAllByText(/approved/i).length).toBeGreaterThan(0);
  });

  it('upgrades the seeded business to Boosted via the Bakong KHQR modal', async () => {
    const user = userEvent.setup();
    await loginViaUI(user);
    renderAppAt('/business/dashboard');

    await screen.findAllByText(/dara's riverside café/i);
    expect(screen.getAllByText(/^verified$/i).length).toBeGreaterThan(0);

    // Two verified businesses may exist (seed + the one test 1 registered).
    const upgradeButtons = screen.getAllByRole('button', { name: /upgrade to boosted/i });
    await user.click(upgradeButtons[0]);

    // Invoice: $9.90/month and a rendered KHQR SVG.
    expect(await screen.findByText(/\$9\.90/)).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector('.bakong-qr-svg svg')).toBeTruthy();
    });
    expect(screen.getByText(/scan with the bakong app/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /i have paid/i }));

    // Dashboard reloads with the Boosted badge.
    await waitFor(
      () => {
        expect(screen.getAllByText(/^boosted$/i).length).toBeGreaterThan(0);
      },
      { timeout: 6000 },
    );
  });

  it('guard: the demo seam prices the invoice and refuses double upgrades', async () => {
    const login = localStorage.getItem('soksan-token');
    localStorage.setItem('soksan-token', 'mock-token-3');

    const res = await apiFetch('/businesses/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: 1 }),
    });
    // Either a fresh invoice (201) or "already Boosted" (409) depending on
    // test order — both are valid business rules; assert the shape.
    expect([201, 409]).toContain(res.status);
    const data = await res.json();
    if (res.status === 201) {
      expect(data.invoice.amount_usd).toBeCloseTo(9.9);
      expect(data.invoice.invoice_ref).toMatch(/^KHQR-/);
      expect(data.invoice.khqr_payload).toContain('KHQR|');

      const confirm = await apiFetch('/businesses/upgrade/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: 1 }),
      });
      expect(confirm.status).toBe(200);
      const confirmed = await confirm.json();
      expect(confirmed.tier).toBe('boosted');

      const again = await apiFetch('/businesses/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: 1 }),
      });
      expect(again.status).toBe(409);
    } else {
      expect(data.error).toMatch(/already/i);
    }

    if (login === null) localStorage.removeItem('soksan-token');
    else localStorage.setItem('soksan-token', login);
  });
});
