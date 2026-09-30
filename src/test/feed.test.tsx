import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { loginAsDemoUser, renderAppAt } from './render';

describe('community feed', () => {
  it('renders seeded travel stories with author and location', async () => {
    renderAppAt('/');

    expect(await screen.findByText(/sand path that ends where the fishing boats rest/i)).toBeInTheDocument();
    // Author and location metadata are visible on the post card.
    expect(screen.getAllByText(/ream coastal trail/i).length).toBeGreaterThan(0);
    // The guide authored more than one seeded story.
    expect(screen.getAllByText('Malis Chea').length).toBeGreaterThan(0);
  });

  it('redirects guests to the login page when they try to like a post', async () => {
    const user = userEvent.setup();
    renderAppAt('/');

    const likeButtons = await screen.findAllByRole('button', { name: /^like$/i });
    await user.click(likeButtons[0]);

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('lets a signed-in user like and save a post', async () => {
    const user = userEvent.setup();
    loginAsDemoUser();
    renderAppAt('/');

    // The header logout button only exists once the session is restored.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });
    const likeButtons = await screen.findAllByRole('button', { name: /^like$/i });
    // Some seeded posts arrive pre-liked; pick the first one that is not.
    const firstLike = likeButtons.find((button) => !button.className.includes('liked'));
    expect(firstLike).toBeDefined();
    await user.click(firstLike as HTMLElement);
    await waitFor(() => {
      expect((firstLike as HTMLElement).className).toContain('liked');
    });

    const saveButtons = await screen.findAllByRole('button', { name: /save place/i });
    await user.click(saveButtons[0]);
    await waitFor(() => {
      expect(saveButtons[0]).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('shows an empty state for a search with no results', async () => {
    renderAppAt('/?q=zzz-no-such-place-zzz');
    expect(await screen.findByText(/no stories match your search/i)).toBeInTheDocument();
  });

  it('filters the feed by category', async () => {
    const user = userEvent.setup();
    renderAppAt('/');

    await screen.findByText(/sand path that ends where the fishing boats rest/i);
    // "Aesthetic Cafes" category chip — the coastal trail (hidden gem) must disappear.
    const cafeChip = (await screen.findAllByRole('button', { name: /cafes/i }))[0];
    await user.click(cafeChip);

    expect(await screen.findByText(/mist pours over the ridge/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/sand path that ends where the fishing boats rest/i)).not.toBeInTheDocument();
    });
  });
});
