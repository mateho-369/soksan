import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { loginAsDemoUser, renderAppAt } from './render';

describe('clips — TikTok-style video feed', () => {
  it('renders the vertical clip feed from the mock API', async () => {
    renderAppAt('/clips');

    // Location names appear in the clip info copy; wait for the first page.
    expect((await screen.findAllByText(/koh rong dawn swim/i)).length).toBeGreaterThan(0);
    // Muted autoplay controls and view counts are part of the overlay.
    expect(screen.getAllByLabelText(/unmute/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/views/i).length).toBeGreaterThan(0);
  });

  it('redirects guests to login when they try to like a clip', async () => {
    const user = userEvent.setup();
    renderAppAt('/clips');

    const likeButtons = await screen.findAllByRole('button', { name: /^like$/i });
    await user.click(likeButtons[0]);

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('double-tapping a clip likes it for a signed-in user', async () => {
    const user = userEvent.setup();
    loginAsDemoUser();
    renderAppAt('/clips');

    await screen.findAllByText(/koh rong dawn swim/i);
    // Wait for the session restore so the like request carries the token.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const tapLayers = await screen.findAllByRole('button', { name: /koh rong dawn swim/i });
    // Two quick taps on the first clip's tap layer.
    await user.click(tapLayers[0]);
    await user.click(tapLayers[0]);

    const likeButtons = await screen.findAllByRole('button', { name: /^like$/i });
    await waitFor(() => {
      expect(likeButtons[0].className).toContain('liked');
    });
  });

  it('shows a paging sentinel below the last loaded clip', async () => {
    const { container } = renderAppAt('/clips');

    await screen.findAllByText(/koh rong dawn swim/i);
    // With the no-op IntersectionObserver stub the sentinel keeps showing
    // the loading skeleton (next page not yet triggered).
    expect(container.querySelectorAll('.clip-skeleton.mini').length).toBeGreaterThan(0);
  });
});
