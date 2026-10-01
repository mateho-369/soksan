/**
 * Phase 1 hardening (2.2) — verified in the browser against the demo seam.
 * GET /posts/nearby: distance sort, radius filter, pagination and the
 * location-privacy rounding that mirrors PostResource.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { apiFetch } from '../lib/http';

const authJson = (token: string, payload: unknown) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(payload),
});

const DARA = 'mock-token-3';

// Phnom Penh center for all geo assertions.
const PP = { lat: 11.5564, lng: 104.9282 };

async function createPost(fields: Record<string, unknown>) {
  const res = await apiFetch('/posts', {
    method: 'POST',
    ...authJson(DARA, {
      caption: fields.caption ?? 'geo post',
      category: 'hidden-gems',
      location_name: fields.location_name ?? 'Geo spot',
      province: 'Phnom Penh',
      media: [],
      ...fields,
    }),
  });
  expect(res.status).toBe(201);
  return res.json();
}

// The Phase-5 first-post gate holds a brand-new author's FIRST post for
// review; warming up guarantees every post we create below is published.
beforeAll(async () => {
  await createPost({ caption: 'warmup', latitude: 10.0, longitude: 105.5 });
});

describe('GET /posts/nearby (Phase 1 hardening)', () => {
  it('returns only published posts inside the radius, sorted by distance', async () => {
    await createPost({ caption: 'PP riverside', latitude: 11.5620, longitude: 104.9310 }); // ~0.7km
    await createPost({ caption: 'Siem Reap town', latitude: 13.3671, longitude: 103.8448 }); // ~314km

    const res = await apiFetch(`/posts/nearby?lat=${PP.lat}&lng=${PP.lng}&radius_km=50`);
    expect(res.status).toBe(200);
    const { data, meta } = await res.json();

    expect(data.length).toBeGreaterThan(0);
    const captions = data.map((p: { caption_en?: string }) => p.caption_en);
    expect(captions).toContain('PP riverside');
    expect(captions).not.toContain('Siem Reap town');

    // Sorted ascending by distance_km.
    const distances = data.map((p: { distance_km: number }) => p.distance_km);
    expect(distances).toEqual([...distances].sort((a: number, b: number) => a - b));
    expect(distances[0]).toBeLessThan(50);
    expect(meta.radius_km).toBe(50);
  });

  it('rounds public coordinates to the post precision (never raw)', async () => {
    await createPost({
      caption: 'fuzzy spot',
      latitude: 11.123456,
      longitude: 104.654321,
      location_precision: 2,
    });

    // Anonymous viewer → rounded; the spot sits ~49km from PP center.
    const res = await apiFetch(`/posts/nearby?lat=${PP.lat}&lng=${PP.lng}&radius_km=100`);
    const { data } = await res.json();
    const spot = data.find((p: { caption_en?: string }) => p.caption_en === 'fuzzy spot');
    expect(spot).toBeTruthy();
    expect(spot.lat).toBe(11.12);
    expect(spot.lng).toBe(104.65);
    expect(spot.has_exact_location).toBe(false);
  });

  it('validates inputs and clamps the radius', async () => {
    const missing = await apiFetch('/posts/nearby');
    expect(missing.status).toBe(422);

    const absurd = await apiFetch(`/posts/nearby?lat=${PP.lat}&lng=${PP.lng}&radius_km=9999`);
    expect(absurd.status).toBe(200);
    const { meta } = await absurd.json();
    expect(meta.radius_km).toBe(100); // hard cap mirrors the controller
  });

  it('paginates results', async () => {
    // Cluster three new posts within ~2km of the center.
    await createPost({ caption: 'cluster-a', latitude: 11.5570, longitude: 104.9290 });
    await createPost({ caption: 'cluster-b', latitude: 11.5590, longitude: 104.9260 });
    await createPost({ caption: 'cluster-c', latitude: 11.5510, longitude: 104.9250 });

    const page1 = await (
      await apiFetch(`/posts/nearby?lat=${PP.lat}&lng=${PP.lng}&radius_km=5&per_page=2&page=1`)
    ).json();
    const page2 = await (
      await apiFetch(`/posts/nearby?lat=${PP.lat}&lng=${PP.lng}&radius_km=5&per_page=2&page=2`)
    ).json();

    expect(page1.data.length).toBe(2);
    expect(page1.meta.per_page).toBe(2);
    expect(page1.meta.total).toBeGreaterThanOrEqual(3);
    expect(page2.data.length).toBeGreaterThanOrEqual(1);

    const ids = [...page1.data, ...page2.data].map((p: { id: number }) => p.id);
    expect(new Set(ids).size).toBe(ids.length); // no overlap across pages
  });
});
