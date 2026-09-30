import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { apiFetch } from '../lib/http';
import { loginAsDemoUser, renderAppAt } from './render';

describe('Phase 1 — geography hierarchy & recency-decayed rankings', () => {
  it('serves a consistent commune -> district -> province hierarchy', async () => {
    const data = await (await apiFetch('/geography')).json();

    expect(data.provinces.length).toBeGreaterThan(0);
    expect(
      data.districts.every((d: { province_id: number }) =>
        data.provinces.some((p: { id: number }) => p.id === d.province_id),
      ),
    ).toBe(true);
    expect(
      data.communes.every((c: { district_id: number }) =>
        data.districts.some((d: { id: number }) => d.id === c.district_id),
      ),
    ).toBe(true);
  });

  it('derives district/province from the commune when a post is tagged', async () => {
    loginAsDemoUser();

    // Commune 1004 = Chroung (Chum Kiri district, Kampot province). The
    // request claims Mondulkiri — the server must trust the derivation.
    const res = await apiFetch('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'hidden-gems',
        location_name: 'Test Lookout',
        province: 'Mondulkiri',
        caption: 'geography derivation test',
        commune_id: 1004,
        media: [{ media_url: 'https://picsum.photos/seed/soksan-test/600/400', media_type: 'image' }],
      }),
    });
    const post = await res.json();

    expect(res.status).toBe(201);
    expect(post.commune_name).toBe('Chroung');
    expect(post.province).toBe('Kampot');
  });

  it('computes recency-decayed rankings that roll up the hierarchy', async () => {
    const communes = await (await apiFetch('/rankings/geography?scope=communes')).json();
    expect(communes.meta.half_life_days).toBe(21);
    expect(communes.data.length).toBeGreaterThan(0);
    // Sorted descending, ranks sequential, every row has engagement behind it.
    for (let i = 1; i < communes.data.length; i++) {
      expect(communes.data[i - 1].score).toBeGreaterThanOrEqual(communes.data[i].score);
    }
    communes.data.forEach((row: { rank: number; post_count: number }, index: number) => {
      expect(row.rank).toBe(index + 1);
      expect(row.post_count).toBeGreaterThanOrEqual(1);
    });

    // Province filter: districts scope restricted to Kampot (id 2).
    const kampotDistricts = await (
      await apiFetch('/rankings/geography?scope=districts&province_id=2')
    ).json();
    expect(kampotDistricts.data.length).toBeGreaterThan(0);
    kampotDistricts.data.forEach((row: { name: string }) => {
      expect(['Krong Kampot', 'Chum Kiri']).toContain(row.name);
    });

    // National = provinces scope, bounded by the demo region size.
    const national = await (await apiFetch('/rankings/geography?scope=provinces')).json();
    expect(national.data.length).toBeGreaterThan(0);
    expect(national.data.length).toBeLessThanOrEqual(6);
  });

  it('composer cascades: province narrows districts, district narrows communes', async () => {
    const user = userEvent.setup();
    loginAsDemoUser();
    renderAppAt('/');

    await user.click(await screen.findByRole('button', { name: /share freely/i }));
    await user.selectOptions(await screen.findByLabelText(/choose province/i), 'Kampot');

    const district = await screen.findByLabelText(/district/i);
    await waitFor(() => expect(district.querySelectorAll('option').length).toBeGreaterThan(1));
    expect(district.textContent).toContain('Chum Kiri');
    expect(district.textContent).not.toContain('Prey Nob'); // Sihanouk district stays out

    await user.selectOptions(district, '103'); // Krong Kampot
    // ^commune avoids matching the district label ("auto from commune").
    const commune = await screen.findByLabelText(/^commune/i);
    await waitFor(() => expect(commune.querySelectorAll('option').length).toBeGreaterThan(1));
    expect(commune.textContent).toContain('Sangkat 3');
    expect(commune.textContent).not.toContain('Ream');
  });
});
