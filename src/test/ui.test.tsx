import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LikeButton from '../ui/LikeButton';
import AnimatedNumber from '../ui/AnimatedNumber';
import StreakChip from '../ui/StreakChip';
import { useStreak } from '../ui/useStreak';
import { GEM_THRESHOLD, useGemMoment } from '../ui/useGemMoment';
import { GemToast } from '../ui/GemMoment';

describe('shared dopamine UI', () => {
  it('LikeButton toggles and shows the rolling count', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<LikeButton liked={false} count={12} onToggle={onToggle} label="Like" />);

    await user.click(screen.getByRole('button', { name: 'Like' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('AnimatedNumber settles on the target value without layout-shifting markup', async () => {
    const { rerender } = render(<AnimatedNumber value={5} />);
    rerender(<AnimatedNumber value={34} />);

    await waitFor(() => {
      expect(screen.getByText('34')).toBeInTheDocument();
    });
    expect(screen.getByText('34').className).toContain('num-roll');
  });

  it('StreakChip counts consecutive days from localStorage', () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    localStorage.setItem('soksan-streak', JSON.stringify({ count: 3, last: todayIso }));

    function Probe() {
      const streak = useStreak();
      return <span data-testid="streak">{streak.count}</span>;
    }
    render(
      <>
        <Probe />
        <StreakChip />
      </>,
    );

    expect(screen.getByTestId('streak')).toHaveTextContent('3');
    // Same-day open does not bump the streak.
    expect(screen.getByTestId('streak')).toHaveTextContent('3');
  });

  it('gem moment celebrates once above the threshold', async () => {
    const user = userEvent.setup();
    localStorage.removeItem('soksan-gem-celebrated');

    function Probe() {
      const { moment, celebrateIfNew } = useGemMoment();
      return (
        <>
          <button onClick={() => celebrateIfNew(77, 'Ream Coastal Trail', GEM_THRESHOLD)}>
            trigger
          </button>
          <GemToast moment={moment} onDismiss={() => {}} />
        </>
      );
    }
    render(<Probe />);

    await user.click(screen.getByRole('button', { name: 'trigger' }));
    expect(await screen.findByText(/hidden gem confirmed/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('soksan-gem-celebrated') || '[]')).toContain(77);
  });
});
