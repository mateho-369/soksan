import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAppAt } from './render';
import { apiFetch } from '../lib/http';
import type { ContributorSummary, Post } from '../types';

/**
 * Phase 8 — Growth: badge-only referral (no monetary incentive), branded
 * share postcard with a public deep-link landing page.
 */

const json = (payload: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const me = async (token: string) =>
  (await (await apiFetch('/contributors/me', { headers: { Authorization: `Bearer ${token}` } })).json()) as
    ContributorSummary & { referral_code?: string };

describe('badge-only referral (Phase 8)', () => {
  let aliceToken = '';
  let aliceCode = '';

  it('every new account gets its own invite code and zero referred signups', async () => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      ...json({ name: 'Alice Ref', email: 'alice.ref@example.com', password: 'soksan-ref-1' }),
    });
    expect(res.status).toBe(201);
    aliceToken = (await res.json()).token;

    const summary = await me(aliceToken);
    expect(summary.referral_code).toBeTruthy();
    expect(summary.referral_code?.length).toBe(8);
    expect(summary.referred_signups).toBe(0);
    expect(summary.badges).not.toContain('welcomer');
    aliceCode = summary.referral_code!;
  });

  it('signing up with a code earns the referrer the Welcomer badge — and nothing else', async () => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      ...json({
        name: 'Bob Invitee',
        email: 'bob.invitee@example.com',
        password: 'soksan-ref-2',
        referral_code: aliceCode.toLowerCase(), // codes are case-insensitive
      }),
    });
    expect(res.status).toBe(201);

    const alice = await me(aliceToken);
    expect(alice.referred_signups).toBe(1);
    expect(alice.badges).toContain('welcomer');
    // Badge ONLY — no credits, balance or discount fields exist at all.
    for (const key of Object.keys(alice)) {
      expect(['quality_points', 'level', 'next_level', 'badges', 'referral_code', 'referred_signups', 'formula']).toContain(key);
    }
  });

  it('unknown or missing codes never block signup and never link', async () => {
    const bogus = await apiFetch('/auth/register', {
      method: 'POST',
      ...json({
        name: 'Cara Bogus',
        email: 'cara.bogus@example.com',
        password: 'soksan-ref-3',
        referral_code: 'NOPE-000',
      }),
    });
    expect(bogus.status).toBe(201);

    const none = await apiFetch('/auth/register', {
      method: 'POST',
      ...json({ name: 'Dan NoCode', email: 'dan.nocode@example.com', password: 'soksan-ref-4' }),
    });
    expect(none.status).toBe(201);

    const alice = await me(aliceToken);
    expect(alice.referred_signups).toBe(1);
  });

  it('the register form shows the optional invite field with the badge-only note', async () => {
    renderAppAt('/register');
    expect(await screen.findByLabelText(/invite code/i, {}, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByText(/earns a badge/i)).toBeInTheDocument();
  });
});

describe('branded share postcard (Phase 8)', () => {
  it('serves a single published post publicly; pending/unpublished never leak', async () => {
    const okRes = await apiFetch('/posts/1');
    expect(okRes.status).toBe(200);
    const post = (await okRes.json()) as Post;
    expect(post.id).toBe(1);

    const missing = await apiFetch('/posts/999999');
    expect(missing.status).toBe(404);

    // A held-for-review post must not be reachable through the share link.
    const reg = await apiFetch('/auth/register', {
      method: 'POST',
      ...json({ name: 'Pending Sharer', email: 'pending.sharer@example.com', password: 'soksan-ref-5' }),
    });
    const token = (await reg.json()).token;
    const created = (await (
      await apiFetch('/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: 'Hidden until approved',
          location_name: 'QA Hidden Spot',
          category: 'nature',
          commune_id: 1006,
          province: 'Kampong Thom',
          media: [],
        }),
      })
    ).json()) as Post;
    expect(created.status).toBe('pending_review');
    const blocked = await apiFetch(`/posts/${created.id}`);
    expect(blocked.status).toBe(404);
  });

  it('the public post page renders and opens the branded postcard', async () => {
    const user = userEvent.setup();
    renderAppAt('/post/1');
    const shareButton = await screen.findByRole('button', { name: /share this story/i }, { timeout: 6000 });
    await user.click(shareButton);

    // The postcard carries the brand lockup and the deep link.
    expect(await screen.findByText(/soksan network/i, {}, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getAllByText(/discover cambodia/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\/post\/1/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download postcard/i })).toBeInTheDocument();
  });

  it('sharing from the feed opens the postcard and counts as a share (+1)', async () => {
    const login = await apiFetch('/auth/login', {
      method: 'POST',
      ...json({ email: 'dara@soksan.app', password: 'soksan123' }),
    });
    localStorage.setItem('soksan-token', (await login.json()).token);

    const postsBefore = (await (await apiFetch('/posts')).json()) as Post[];
    const firstId = postsBefore[0].id;
    const before = postsBefore[0].share_count;

    const user = userEvent.setup();
    renderAppAt('/');
    // Wait for the stored token to re-validate (user set), so the share counts.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument();
    }, { timeout: 6000 });
    const shareButtons = await screen.findAllByRole('button', { name: /^share$/i }, { timeout: 6000 });
    await user.click(shareButtons[0]);
    await waitFor(() => screen.getByText(/soksan network/i), { timeout: 6000 });

    await waitFor(
      async () => {
        const after = ((await (await apiFetch(`/posts/${firstId}`)).json()) as Post).share_count;
        expect(after).toBe(before + 1);
      },
      { timeout: 6000 },
    );
  });
});

describe('growth touchpoints (Phase 8)', () => {
  it('the /register?ref=CODE deep link pre-fills the optional invite field', async () => {
    renderAppAt('/register?ref=DARASOK3');
    const input = await screen.findByLabelText(/invite code/i, {}, { timeout: 6000 });
    expect((input as HTMLInputElement).value).toBe('DARASOK3');
  });

  it('the Hidden Gem banner deep-links to the public post page', async () => {
    const adminLogin = await apiFetch('/auth/login', {
      method: 'POST',
      ...json({ email: 'admin@soksan.app', password: 'soksan123' }),
    });
    localStorage.setItem('soksan-token', (await adminLogin.json()).token);
    const pick = await apiFetch('/admin/hidden-gem', {
      method: 'POST',
      ...json({ post_id: 2, note: 'P8 link test' }),
    });
    expect(pick.status).toBe(201);

    renderAppAt('/');
    const link = await screen.findByRole('link', { name: /hidden gem/i }, { timeout: 6000 });
    expect(link.getAttribute('href')).toBe('/post/2');
  });
});
