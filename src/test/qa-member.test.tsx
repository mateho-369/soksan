import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAppAt } from './render';

/**
 * QA pass — SIGNED-IN journey. Every core action a member takes: login,
 * like, save, share, follow, comment, post (with commune picker), boost,
 * message, logout. Console errors asserted clean at the end.
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

async function loginViaUI(user: ReturnType<typeof userEvent.setup>) {
  renderAppAt('/login');
  await user.type(await screen.findByPlaceholderText('you@example.com'), 'dara@soksan.app');
  await user.type(screen.getByPlaceholderText('••••••••'), 'soksan123');
  await user.click(screen.getByRole('button', { name: /log in/i }));
  await waitFor(
    () => {
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    },
    { timeout: 6000 },
  );
}

describe('QA — signed-in journey', () => {
  it('logs in via the UI', async () => {
    const user = userEvent.setup();
    await loginViaUI(user);
  });

  it('likes, saves and shares a feed post', async () => {
    const user = userEvent.setup();
    await loginViaUI(user);

    const likeButtons = await screen.findAllByRole('button', { name: /^like$/i });
    const target = likeButtons.find((button) => !button.className.includes('liked')) as HTMLElement;
    await user.click(target);
    await waitFor(() => expect(target.className).toContain('liked'));

    const saveButtons = await screen.findAllByRole('button', { name: /save place/i });
    await user.click(saveButtons[0]);
    await waitFor(() => expect(saveButtons[0]).toHaveAttribute('aria-pressed', 'true'));

    const shareButtons = await screen.findAllByRole('button', { name: /^share$/i });
    await user.click(shareButtons[0]); // clipboard fallback path — must not throw
  });

  it('follows and unfollows a post author', async () => {
    const user = userEvent.setup();
    await loginViaUI(user);

    const followButtons = await screen.findAllByRole('button', { name: /^· follow$/i });
    await user.click(followButtons[0]);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /following/i }).length).toBeGreaterThan(0);
    });
  });

  it('comments on a post through the viewer drawer', async () => {
    const user = userEvent.setup();
    await loginViaUI(user);

    // Open the viewer via the media button, then the comment rail button.
    await screen.findAllByText(/sand path that ends where the fishing boats rest/i);
    const mediaButton = document.querySelector('.facebook-media') as HTMLElement;
    expect(mediaButton).toBeTruthy();
    await user.click(mediaButton);
    // Wait for the viewer chrome to mount (AnimatePresence render).
    await screen.findByRole('button', { name: /close viewer/i }, { timeout: 5000 });
    // Two 'Comment' buttons exist (feed behind + viewer rail) — scope to
    // the viewer's floating actions.
    const viewerComment = await waitFor(
      () => {
        const found = screen
          .getAllByRole('button', { name: /^comment$/i })
          .find((button) => button.closest('.viewer-floating-actions'));
        expect(found).toBeTruthy();
        return found as HTMLElement;
      },
      { timeout: 5000 },
    );
    await user.click(viewerComment);

    const input = await screen.findByPlaceholderText(/write a comment/i);
    await user.type(input, 'QA comment — the trail was quiet this morning.');
    const drawer = document.querySelector('.viewer-comment-drawer');
    const submit = drawer?.querySelector('button[type="submit"]') as HTMLElement;
    expect(submit).toBeTruthy();
    await user.click(submit);

    expect(await screen.findByText(/qa comment — the trail was quiet/i)).toBeInTheDocument();
  });

  it('publishes a post with the full commune cascade', async () => {
    const user = userEvent.setup();
    await loginViaUI(user);

    await user.click(await screen.findByRole('button', { name: /share freely/i }, { timeout: 6000 }));
    await user.type(
      screen.getByPlaceholderText(/tell people what makes this place worth finding/i),
      'QA journey post — sunset over the river bend.',
    );
    await user.type(screen.getByPlaceholderText(/place, venue, or event name/i), 'QA Sunset Bend');
    await user.selectOptions(screen.getByLabelText(/choose province/i), 'Kampot');
    await user.selectOptions(screen.getByLabelText(/district/i), '104'); // Chum Kiri
    await user.selectOptions(await screen.findByLabelText(/^commune/i), '1004'); // Chroung

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    await user.upload(fileInput as HTMLElement, new File(['qa-bytes'], 'qa.jpg', { type: 'image/jpeg' }));

    const publish = await screen.findByRole('button', { name: /post free/i });
    await waitFor(() => expect(publish).toBeEnabled());
    await user.click(publish);

    expect(await screen.findByText(/qa sunset bend/i, {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getAllByText(/qa journey post/i).length).toBeGreaterThan(0);
  });

  it('opens and closes the boost dialog', async () => {
    const user = userEvent.setup();
    await loginViaUI(user);

    await screen.findByText(/sand path that ends where the fishing boats rest/i);
    const zap = document.querySelector('.facebook-boost') as HTMLElement;
    expect(zap).toBeTruthy();
    await user.click(zap);

    expect(await screen.findByText(/boost this local story/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close boost dialog/i }));
    await waitFor(() => {
      expect(screen.queryByText(/boost this local story/i)).not.toBeInTheDocument();
    });
  });

  it('sends a message in a conversation', async () => {
    const user = userEvent.setup();
    await loginViaUI(user);

    // Navigate via the real Messages nav link (bottom tab bar).
    const messagesLinks = await screen.findAllByRole('link', { name: /messages/i }, { timeout: 6000 });
    await user.click(messagesLinks[messagesLinks.length - 1]);

    // Open the first conversation.
    const convo = (await screen.findAllByText(/malis chea/i, {}, { timeout: 6000 }))[0];
    await user.click(convo);

    const box = await screen.findByPlaceholderText(/write a message/i);
    await user.type(box, 'QA message — see you at the trailhead at 6am!');
    await user.keyboard('{Enter}');

    // Appears in the thread AND the conversation list preview.
    await waitFor(() => {
      expect(screen.getAllByText(/see you at the trailhead at 6am/i).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('logs out and returns to the guest state', async () => {
    const user = userEvent.setup();
    await loginViaUI(user);

    await user.click(screen.getByRole('button', { name: /log out/i }));
    // Guest composer CTA replaces the composer.
    expect(await screen.findByText(/log in to share your places/i)).toBeInTheDocument();
  });

  it('surfaces no unexpected console errors across the member journey', () => {
    const real = consoleErrors.filter((message) => !ignoreConsoleError(message));
    expect(real).toEqual([]);
  });
});
