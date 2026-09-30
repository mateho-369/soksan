import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAppAt } from './render';

// The destination list renders twice on this page (side panel + mobile sheet),
// so assertions use *AllBy variants.

describe('discover map & places', () => {
  it('lists curated destinations with map pins', async () => {
    renderAppAt('/discover');

    expect((await screen.findAllByText('Ream Coastal Trail')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cloud Valley Coffee').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Srae Thom Floating Stay').length).toBeGreaterThan(0);
    // Card buttons plus one map pin per destination.
    expect(screen.getAllByRole('button', { name: /ream coastal trail/i }).length).toBeGreaterThanOrEqual(2);
  });

  it('filters destinations by category', async () => {
    const user = userEvent.setup();
    renderAppAt('/discover');

    await screen.findAllByText('Ream Coastal Trail');
    await user.selectOptions(screen.getByLabelText(/filter places/i), 'aesthetic-cafes');

    await waitFor(() => {
      expect(screen.getAllByText('Cloud Valley Coffee').length).toBeGreaterThan(0);
      expect(screen.queryAllByText('Ream Coastal Trail')).toHaveLength(0);
    });
  });

  it('shows an empty state when a search matches nothing', async () => {
    renderAppAt('/discover?q=zzz-not-a-place');
    expect((await screen.findAllByText(/no places found/i)).length).toBeGreaterThan(0);
  });
});
