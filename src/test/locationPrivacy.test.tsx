import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAppAt, loginAsDemoUser } from './render';
import { apiFetch } from '../lib/http';
import type { Post } from '../types';

/**
 * Phase 0 hardening — location privacy. Exact coordinates are sensitive on
 * a location-based product: public viewers receive coordinates rounded to
 * the post's precision, while owner/admin see the exact point. Sensitive
 * posts are capped at ~1.1km (2 decimals) for the public.
 */

const json = (payload: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const createPost = async (extra: Record<string, unknown>) => {
  const res = await apiFetch('/posts', {
    method: 'POST',
    ...json({
      caption: 'Location privacy test',
      location_name: 'QA Privacy Spot',
      province: 'Kampot',
      category: 'nature',
      commune_id: 1006,
      media: [],
      ...extra,
    }),
  });
  expect(res.status).toBe(201);
  return (await res.json()) as Post;
};

describe('location privacy (Phase 0 hardening)', () => {
  const LAT = 10.6123456;
  const LNG = 104.1987654;

  it('defaults new posts to approximate (precision 3), never exact', async () => {
    loginAsDemoUser();
    const created = await createPost({ latitude: LAT, longitude: LNG });
    expect(created.location_precision).toBe(3);
    expect(created.is_sensitive_location).toBe(false);
  });

  it('public viewers receive rounded coordinates, the owner sees exact', async () => {
    loginAsDemoUser(); // owner = mock-token-3
    const created = await createPost({ latitude: LAT, longitude: LNG, location_precision: 3 });

    // Owner fetches their own post — exact.
    const asOwner = (await (await apiFetch(`/posts/${created.id}`)).json()) as Post;
    expect(asOwner.lat).toBeCloseTo(LAT, 6);
    expect(asOwner.lng).toBeCloseTo(LNG, 6);
    expect(asOwner.has_exact_location).toBe(true);

    // Anonymous viewer — rounded to 3 decimals (~110m) and flagged as such.
    localStorage.removeItem('soksan-token');
    const asGuest = (await (await apiFetch(`/posts/${created.id}`)).json()) as Post;
    expect(asGuest.lat).toBe(Number(LAT.toFixed(3)));
    expect(asGuest.lng).toBe(Number(LNG.toFixed(3)));
    expect(asGuest.has_exact_location).toBe(false);
    expect(asGuest.lat).not.toBeCloseTo(LAT, 5);
  });

  it('admins see exact coordinates', async () => {
    loginAsDemoUser();
    const created = await createPost({ latitude: LAT, longitude: LNG, location_precision: 3 });

    localStorage.setItem('soksan-token', 'mock-token-4'); // admin
    const asAdmin = (await (await apiFetch(`/posts/${created.id}`)).json()) as Post;
    expect(asAdmin.lat).toBeCloseTo(LAT, 6);
    expect(asAdmin.has_exact_location).toBe(true);
  });

  it('sensitive locations are capped at ~1.1km for the public even with a high precision', async () => {
    loginAsDemoUser();
    const created = await createPost({
      latitude: LAT,
      longitude: LNG,
      location_precision: 6, // author asked for exact…
      is_sensitive_location: true, // …but flagged sensitive: public caps at 2
    });

    localStorage.removeItem('soksan-token');
    const asGuest = (await (await apiFetch(`/posts/${created.id}`)).json()) as Post;
    expect(asGuest.lat).toBe(Number(LAT.toFixed(2)));
    expect(asGuest.lng).toBe(Number(LNG.toFixed(2)));
  });

  it('the feed rounds coordinates for public viewers too', async () => {
    loginAsDemoUser();
    const created = await createPost({ latitude: LAT, longitude: LNG, location_precision: 3 });

    localStorage.removeItem('soksan-token');
    const feed = (await (await apiFetch('/posts')).json()) as Post[];
    const inFeed = feed.find((p) => p.id === created.id);
    expect(inFeed?.lat).toBe(Number(LAT.toFixed(3)));
  });

  it('the composer offers the three location-privacy choices with approximate as default', async () => {
    const user = userEvent.setup();
    loginAsDemoUser();
    renderAppAt('/');
    await user.click(await screen.findByRole('button', { name: /share freely/i }, { timeout: 6000 }));

    const group = await screen.findByRole('radiogroup', { name: /location sharing/i }, { timeout: 6000 });
    expect(group).toBeInTheDocument();

    const approximate = screen.getByRole('radio', { name: /approximate area/i });
    const exact = screen.getByRole('radio', { name: /exact location/i });
    const sensitive = screen.getByRole('radio', { name: /sensitive/i });

    // Approximate (the safer choice) is selected by default.
    expect(approximate).toHaveAttribute('aria-checked', 'true');
    expect(exact).toHaveAttribute('aria-checked', 'false');
    expect(sensitive).toHaveAttribute('aria-checked', 'false');

    await user.click(sensitive);
    expect(sensitive).toHaveAttribute('aria-checked', 'true');
    expect(approximate).toHaveAttribute('aria-checked', 'false');
    // The hint for the selected choice is visible (EN test locale).
    expect(screen.getByText(/rounded to about 1 km/i)).toBeInTheDocument();
  });
});
