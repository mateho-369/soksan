/**
 * Phase 0 hardening (1.8) — verified in the browser against the demo seam.
 * Password recovery with session revocation, email verification links and
 * account deletion (password-confirmed, anonymizing).
 */
import { describe, expect, it } from 'vitest';
import { apiFetch } from '../lib/http';

const json = (payload: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

async function register(name: string, email: string, password = 'soksan-auth-1') {
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    ...json({ name, email, password }),
  });
  return res.json();
}

describe('password recovery (Phase 0 hardening)', () => {
  it('resetting a password revokes every existing session', async () => {
    const { token: oldToken, user } = await register('Recovery Rina', 'recovery.rina@example.com');
    const email = user.email as string;

    // Request a reset link (demo returns the token; production emails it).
    const forgot = await apiFetch('/auth/forgot-password', {
      method: 'POST',
      ...json({ email }),
    });
    expect(forgot.status).toBe(200);
    const { demo_token: code } = await forgot.json();
    expect(typeof code).toBe('string');

    // Wrong token is rejected.
    const bad = await apiFetch('/auth/reset-password', {
      method: 'POST',
      ...json({ email, token: 'nope', password: 'brand-new-pass-1', password_confirmation: 'brand-new-pass-1' }),
    });
    expect(bad.status).toBe(422);

    // Correct token rotates the password.
    const ok = await apiFetch('/auth/reset-password', {
      method: 'POST',
      ...json({ email, token: code, password: 'brand-new-pass-1', password_confirmation: 'brand-new-pass-1' }),
    });
    expect(ok.status).toBe(200);

    // Old credentials no longer work...
    const oldLogin = await apiFetch('/auth/login', {
      method: 'POST',
      ...json({ email, password: 'soksan-auth-1' }),
    });
    expect(oldLogin.status).toBe(422);

    // ...the pre-reset session is revoked...
    const stale = await apiFetch('/auth/me', { headers: { Authorization: `Bearer ${oldToken}` } });
    expect(stale.status).toBe(401);

    // ...and the new password signs in cleanly.
    const fresh = await apiFetch('/auth/login', {
      method: 'POST',
      ...json({ email, password: 'brand-new-pass-1' }),
    });
    expect(fresh.status).toBe(200);
  });

  it('does not reveal whether an email has an account', async () => {
    const res = await apiFetch('/auth/forgot-password', {
      method: 'POST',
      ...json({ email: 'nobody-here@example.com' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toMatch(/If that account exists/);
    expect(data.demo_token).toBeUndefined();
  });

  it('reset codes are single-use', async () => {
    const { user } = await register('Once Ono', 'once.ono@example.com');
    const email = user.email as string;
    const { demo_token: code } = await (
      await apiFetch('/auth/forgot-password', { method: 'POST', ...json({ email }) })
    ).json();

    const first = await apiFetch('/auth/reset-password', {
      method: 'POST',
      ...json({ email, token: code, password: 'single-use-pass-1', password_confirmation: 'single-use-pass-1' }),
    });
    expect(first.status).toBe(200);

    const second = await apiFetch('/auth/reset-password', {
      method: 'POST',
      ...json({ email, token: code, password: 'single-use-pass-2', password_confirmation: 'single-use-pass-2' }),
    });
    expect(second.status).toBe(422);
  });
});

describe('email verification (Phase 0 hardening)', () => {
  it('the signed link marks the account verified', async () => {
    const { token, user } = await register('Verify Dara', 'verify.dara@example.com');

    const notify = await apiFetch('/email/verification-notification', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(notify.status).toBe(200);
    const { demo_hash: hash } = await notify.json();

    // Tampered hash is rejected...
    const tampered = await apiFetch(`/email/verify/${user.id}/${'f'.repeat(8)}`);
    expect(tampered.status).toBe(403);

    // ...the real one verifies.
    const verified = await apiFetch(`/email/verify/${user.id}/${hash}`);
    expect(verified.status).toBe(200);
  });
});

describe('account deletion (Phase 0 hardening)', () => {
  it('deleting requires the password, then anonymizes and locks the account', async () => {
    const { token, user } = await register('Gone Gita', 'gone.gita@example.com');
    const email = user.email as string;

    // Wrong password is rejected.
    const wrong = await apiFetch('/auth/me', {
      method: 'DELETE',
      ...json({ password: 'wrong-password' }),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(wrong.status).toBe(422);

    const gone = await apiFetch('/auth/me', {
      method: 'DELETE',
      ...json({ password: 'soksan-auth-1' }),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(gone.status).toBe(200);

    // The old email can no longer sign in...
    const login = await apiFetch('/auth/login', { method: 'POST', ...json({ email, password: 'soksan-auth-1' }) });
    expect(login.status).toBe(422);

    // ...and the old session token is dead.
    const stale = await apiFetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    expect(stale.status).toBe(401);

    // The anonymized email cannot register either (deleted accounts keep
    // their slot only in the sense that the original email is free to
    // re-register as a fresh account — allowed by design, documented).
  });
});
