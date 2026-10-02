import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAppAt, loginAsDemoUser } from './render';
import { apiFetch } from '../lib/http';
import { ALL_SAFETY_TAGS } from '../lib/safetyTags';
import type { Post } from '../types';

/**
 * Phase 9 — Safety & accessibility tags: a closed allow-list of
 * self-reported traveller observations. Tags never affect ranking and the
 * server (seam + Laravel rules) rejects anything outside the list.
 */

const json = (payload: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const postBody = (extra: Record<string, unknown>) => ({
  caption: 'Safety test post',
  location_name: 'QA Safety Spot',
  province: 'Kampot',
  category: 'nature',
  commune_id: 1006,
  media: [],
  ...extra,
});

describe('safety & accessibility tags (Phase 9)', () => {
  it('accepts tags from the closed allow-list and stores them on the post', async () => {
    loginAsDemoUser();
    const res = await apiFetch('/posts', {
      method: 'POST',
      ...json(postBody({ safety_tags: ['well_lit', 'wheelchair_accessible'] })),
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as Post;
    expect(created.safety_tags).toEqual(['well_lit', 'wheelchair_accessible']);

    const fetched = (await (await apiFetch(`/posts/${created.id}`)).json()) as Post;
    expect(fetched.safety_tags).toEqual(['well_lit', 'wheelchair_accessible']);
  });

  it('rejects unknown tags with 422 and never creates the post', async () => {
    loginAsDemoUser();
    const before = (await (await apiFetch('/posts')).json()) as Post[];
    const res = await apiFetch('/posts', {
      method: 'POST',
      ...json(postBody({ safety_tags: ['totally_made_up_tag'] })),
    });
    expect(res.status).toBe(422);
    const after = (await (await apiFetch('/posts')).json()) as Post[];
    expect(after.length).toBe(before.length);
  });

  it('dedupes repeated tags and defaults to an empty list', async () => {
    loginAsDemoUser();
    const dupe = await apiFetch('/posts', {
      method: 'POST',
      ...json(postBody({ safety_tags: ['quiet_space', 'quiet_space'] })),
    });
    expect(((await dupe.json()) as Post).safety_tags).toEqual(['quiet_space']);

    const none = await apiFetch('/posts', { method: 'POST', ...json(postBody({})) });
    expect(((await none.json()) as Post).safety_tags).toEqual([]);
  });

  it('the composer offers every allow-list tag as toggleable pills', async () => {
    const user = userEvent.setup();
    loginAsDemoUser();
    renderAppAt('/');
    await user.click(await screen.findByRole('button', { name: /share freely/i }, { timeout: 6000 }));

    expect(await screen.findByText(/safety & accessibility/i, {}, { timeout: 6000 })).toBeInTheDocument();
    // Every allow-list tag is offered exactly once (EN labels).
    expect(ALL_SAFETY_TAGS.length).toBe(8);
    const labels = [
      /well-lit at night/i,
      /security on site/i,
      /family-friendly/i,
      /solo-traveller friendly/i,
      /wheelchair accessible/i,
      /accessible restroom/i,
      /step-free entrance/i,
      /quiet space/i,
    ];
    for (const label of labels) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }

    const chip = screen.getByRole('button', { name: /well-lit at night/i });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    // The observations-not-guarantees note is always visible.
    expect(screen.getByText(/traveller observations, not guarantees/i)).toBeInTheDocument();
  });

  it('seeded tags surface as labelled chips on the public post page', async () => {
    renderAppAt('/post/1');
    expect(await screen.findByText(/family-friendly/i, {}, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByText(/well-lit at night/i)).toBeInTheDocument();
  });
});
