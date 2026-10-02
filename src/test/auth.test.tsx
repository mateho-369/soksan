import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAppAt } from './render';

describe('authentication', () => {
  it('shows validation errors for a bad register form', async () => {
    const user = userEvent.setup();
    renderAppAt('/register');

    await user.type(await screen.findByLabelText(/your name/i), 'D');
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/^password/i), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/at least 2 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('rejects a wrong password with a friendly message', async () => {
    const user = userEvent.setup();
    renderAppAt('/login');

    await user.type(await screen.findByLabelText(/email/i), 'dara@soksan.app');
    await user.type(screen.getByLabelText(/^password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/email or password is incorrect/i)).toBeInTheDocument();
  });

  it('logs the demo user in and out', async () => {
    const user = userEvent.setup();
    renderAppAt('/login');

    await user.type(await screen.findByLabelText(/email/i), 'dara@soksan.app');
    await user.type(screen.getByLabelText(/^password/i), 'soksan123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    // Header chip + feed rail both show the signed-in user after the redirect.
    await waitFor(() => {
      expect(screen.getAllByText('Dara Sok').length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole('link', { name: /join free/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /log out/i }));
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /join free/i })).toBeInTheDocument();
    });
  });

  it('registers a new account and starts a session', async () => {
    const user = userEvent.setup();
    renderAppAt('/register');

    await user.type(await screen.findByLabelText(/your name/i), 'Sokha Meas');
    await user.type(screen.getByLabelText(/email/i), 'sokha@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'averysecret1');
    await user.type(screen.getByLabelText(/confirm password/i), 'averysecret1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Sokha Meas').length).toBeGreaterThan(0);
    });
  });

  it('restores a session from a stored token', async () => {
    localStorage.setItem('soksan-token', 'mock-token-3');
    renderAppAt('/');
    await waitFor(() => {
      expect(screen.getAllByText('Dara Sok').length).toBeGreaterThan(0);
    });
  });
});
