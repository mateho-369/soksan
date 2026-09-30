import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { loginAsDemoUser, renderAppAt } from './render';

describe('creating a post', () => {
  it('shows a login call-to-action instead of the composer for guests', async () => {
    const user = userEvent.setup();
    renderAppAt('/');

    expect(await screen.findByText(/log in to share your places/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /log in or join free/i }));
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('publishes a new place to the feed for a signed-in user', async () => {
    const user = userEvent.setup();
    loginAsDemoUser();
    renderAppAt('/');

    // Composer opens for an authenticated user. (Generous timeout: under a
    // full-suite parallel run the first hydrate can exceed the 1s default.)
    await user.click(await screen.findByRole('button', { name: /share freely/i }, { timeout: 6000 }));

    await user.type(
      screen.getByPlaceholderText(/tell people what makes this place worth finding/i),
      'Cardamom forest morning — mist pools in every valley below the lookout.',
    );
    await user.type(screen.getByPlaceholderText(/place, venue, or event name/i), 'Areng Valley Lookout');
    await user.selectOptions(screen.getByLabelText(/choose province/i), 'Kampot');

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    const photo = new File(['fake-image-bytes'], 'lookout.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput as HTMLElement, photo);

    const publishButton = await screen.findByRole('button', { name: /post free/i });
    await waitFor(() => expect(publishButton).toBeEnabled());
    await user.click(publishButton);

    // The new story appears at the top of the feed, authored by the demo user.
    expect(await screen.findByText(/areng valley lookout/i, {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getAllByText(/cardamom forest morning/i).length).toBeGreaterThan(0);
  });
});
