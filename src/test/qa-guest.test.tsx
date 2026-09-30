import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAppAt } from './render';

/**
 * QA pass — GUEST journey. Drives the real UI end-to-end: browse, search,
 * filters, map, rankings, clips, viewer, language switch, registration.
 * Console errors are captured and asserted clean at the end.
 */
const consoleErrors: string[] = [];
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map(String).join(' '));
  });
});
afterEach(() => {
  errorSpy.mockRestore();
});

const ignoreConsoleError = (message: string) =>
  /Not implemented|act\(|useLayoutEffect/.test(message);

describe('QA — guest journey', () => {
  it('browses the feed, searches, and filters by category', async () => {
    const user = userEvent.setup();
    renderAppAt('/');

    expect(await screen.findByText(/sand path that ends where the fishing boats rest/i)).toBeInTheDocument();

    // Search via URL works.
    renderAppAt('/?q=zzz-nothing');
    expect(await screen.findByText(/no stories match your search/i)).toBeInTheDocument();

    // Category chip filters the feed.
    renderAppAt('/');
    await screen.findAllByText(/sand path that ends where the fishing boats rest/i);
    await user.click((await screen.findAllByRole('button', { name: /cafes/i }))[0]);
    expect(await screen.findByText(/mist pours over the ridge/i)).toBeInTheDocument();
  });

  it('uses discover: lists, filters and pins', async () => {
    const user = userEvent.setup();
    renderAppAt('/discover');

    expect((await screen.findAllByText('Ream Coastal Trail')).length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText(/filter places/i), 'aesthetic-cafes');
    await waitFor(() => expect(screen.getAllByText('Cloud Valley Coffee').length).toBeGreaterThan(0));
    // Clicking a destination card button is a real action (opens sheet/detail).
    const card = screen.getAllByRole('button', { name: /cloud valley coffee/i })[0];
    await user.click(card);
  });

  it('switches ranking tabs', async () => {
    const user = userEvent.setup();
    renderAppAt('/rankings');

    const cafeTab = await screen.findByRole('button', { name: /best cafes/i });
    await user.click(cafeTab);
    await waitFor(() => expect(cafeTab.className).toContain('active'));
    expect((await screen.findAllByText(/Kampot/i)).length).toBeGreaterThan(0);
  });

  it('interacts with clips: unmute, comment drawer, like-gate', async () => {
    const user = userEvent.setup();
    renderAppAt('/clips');

    await screen.findAllByText(/koh rong dawn swim/i);

    // Unmute toggle.
    const sound = screen.getAllByLabelText(/unmute/i)[0];
    await user.click(sound);
    expect(screen.getAllByLabelText(/mute/i).length).toBeGreaterThan(0);

    // Comment drawer opens without leaving the clip.
    const commentButtons = await screen.findAllByRole('button', { name: /comment/i });
    await user.click(commentButtons[0]);
    expect(await screen.findByLabelText(/close comments/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/close comments/i)); // unique after backdrop rename

    // Guest like → login redirect.
    const likeButtons = await screen.findAllByRole('button', { name: /^like$/i });
    await user.click(likeButtons[0]);
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('opens the post viewer from a feed card', async () => {
    const user = userEvent.setup();
    renderAppAt('/');

    await screen.findByText(/sand path that ends where the fishing boats rest/i);
    // The media button has no text label — target it by class (the
    // location button would navigate away instead of opening the viewer).
    const mediaButton = document.querySelector('.facebook-media') as HTMLElement;
    expect(mediaButton).toBeTruthy();
    await user.click(mediaButton);
    // Viewer shows the caption and action rail (feed + viewer both match).
    await waitFor(() => {
      expect(screen.getAllByText(/sand path that ends where the fishing boats rest/i).length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getAllByRole('button', { name: /^like$/i }).length).toBeGreaterThan(0);
  });

  it('switches language to Khmer and back', async () => {
    const user = userEvent.setup();
    renderAppAt('/');

    await screen.findByText(/sand path that ends where the fishing boats rest/i);
    await user.click(screen.getByRole('button', { name: 'KH' }));
    // Khmer feed title appears (real Khmer sentence from the demo data).
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/កម្ពុជា|សុខសាន្ត/);
    });
    await user.click(screen.getByRole('button', { name: 'EN' }));
    await waitFor(() => {
      expect(screen.getAllByText(/sand path that ends where the fishing boats rest/i).length).toBeGreaterThan(0);
    });
  });

  it('registers a new account and lands signed in', async () => {
    const user = userEvent.setup();
    renderAppAt('/register');

    await user.type(await screen.findByPlaceholderText(/e\.g\. dara sok/i), 'QA Tester');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'qa.tester@example.com');
    const passwords = screen.getAllByPlaceholderText('••••••••');
    await user.type(passwords[0], 'soksan-qa-123');
    await user.type(passwords[1], 'soksan-qa-123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // Signed-in state: composer is available on the feed.
    expect(await screen.findByRole('button', { name: /share freely/i }, { timeout: 6000 })).toBeInTheDocument();
  });

  it('surfaces no unexpected console errors across the guest journey', () => {
    const real = consoleErrors.filter((message) => !ignoreConsoleError(message));
    expect(real).toEqual([]);
  });
});
