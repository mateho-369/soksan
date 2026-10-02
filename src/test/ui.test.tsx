import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LikeButton from '../ui/LikeButton';
import AnimatedNumber from '../ui/AnimatedNumber';
import StreakChip from '../ui/StreakChip';
import { useStreak } from '../ui/useStreak';
import { GEM_THRESHOLD, useGemMoment } from '../ui/useGemMoment';
import { GemToast } from '../ui/GemMoment';
import { DestinationListSkeleton } from '../ui/Skeleton';
import { RichCaption } from '../components/RichCaption';
import { MemoryRouter } from 'react-router-dom';
import { renderAppAt, loginAsDemoUser } from './render';
import { mapMock } from './maplibre-mock';

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

  it('DestinationListSkeleton renders accessible shimmer placeholders without spinners', () => {
    render(<DestinationListSkeleton count={3} />);
    const status = screen.getByRole('status', { name: 'Loading' });
    expect(status).toBeInTheDocument();
    expect(status.querySelectorAll('.destination-card-skel').length).toBe(3);
  });

  it('synchronizes html[lang="km"] and .font-kh.kh root class when toggling Khmer', async () => {
    const user = userEvent.setup();
    renderAppAt('/');

    expect(document.documentElement.lang).toBe('en');
    const khBtn = await screen.findByRole('button', { name: 'KH' });
    await user.click(khBtn);

    expect(document.documentElement.lang).toBe('km');
    expect(document.querySelector('.font-kh.kh')).not.toBeNull();
    expect(khBtn).toHaveAttribute('aria-pressed', 'true');

    const enBtn = screen.getByRole('button', { name: 'EN' });
    await user.click(enBtn);
    expect(document.documentElement.lang).toBe('en');
  });

  it('renders PostComposer live character counter and drag-and-drop dropzone when expanded', async () => {
    const user = userEvent.setup();
    loginAsDemoUser();
    renderAppAt('/');

    const openComposer = await screen.findByRole('button', { name: /share freely/i }, { timeout: 6000 });
    await user.click(openComposer);

    expect(await screen.findByText('0 / 2,200')).toBeInTheDocument();
    expect(screen.getByText(/drag & drop photos or a 30s clip here/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/tell people what makes this place worth finding/i);
    await user.type(textarea, 'Sunrise at Kampot');
    expect(screen.getByText('17 / 2,200')).toBeInTheDocument();
  });

  it('renders floating glassmorphic map controls (zoom in, zoom out, reset view) on Discover', async () => {
    const user = userEvent.setup();
    renderAppAt('/discover');

    const controls = await screen.findByRole('group', { name: 'Map controls' });
    expect(controls).toBeInTheDocument();

    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    const zoomOut = screen.getByRole('button', { name: 'Zoom out' });
    const resetView = screen.getByRole('button', { name: 'Reset Cambodia view' });

    const beforeCalls = mapMock.lastMap()?.flyToCalls.length ?? 0;
    await user.click(zoomIn);
    expect((mapMock.lastMap()?.flyToCalls.length ?? 0)).toBeGreaterThan(beforeCalls);

    await user.click(zoomOut);
    await user.click(resetView);
    expect((mapMock.lastMap()?.flyToCalls.length ?? 0)).toBeGreaterThanOrEqual(beforeCalls + 3);
  });

  it('RichCaption parses #hashtags and @mentions into clickable Link elements', () => {
    render(
      <MemoryRouter>
        <RichCaption
          text="Morning coffee with @vannak.coffee in #MondulkiriMist"
          hashtags="#KampotPepper #KohRong"
        />
      </MemoryRouter>,
    );

    const mentionLink = screen.getByRole('link', { name: '@vannak.coffee' });
    expect(mentionLink).toHaveAttribute('href', '/discover?q=vannak.coffee&tab=users');

    const inlineHashtag = screen.getByRole('link', { name: '#MondulkiriMist' });
    expect(inlineHashtag).toHaveAttribute('href', '/discover?q=MondulkiriMist&tab=tags');

    const pillHashtag = screen.getByRole('link', { name: '#KampotPepper' });
    expect(pillHashtag).toHaveAttribute('href', '/discover?q=KampotPepper&tab=tags');
  });

  it('renders 1-up snap-scrolling feed and right sidebar widgets (Suggested Profiles & Trending Tags)', async () => {
    renderAppAt('/');

    expect(await screen.findByText(/sand path that ends where the fishing boats rest/i)).toBeInTheDocument();
    expect(screen.getByText(/suggested profiles to follow/i)).toBeInTheDocument();
    expect(screen.getByText(/trending tags/i)).toBeInTheDocument();

    const feedSection = document.querySelector('.facebook-feed');
    expect(feedSection?.className).toContain('snap-y');
    expect(feedSection?.className).toContain('snap-mandatory');
  });

  it('switches search engine tabs (Locations, Users, Tags, Map) on Discover and renders Settings SaaS dashboard', async () => {
    const user = userEvent.setup();
    renderAppAt('/discover');

    const usersTab = await screen.findByRole('tab', { name: /users/i });
    await user.click(usersTab);
    expect(await screen.findByLabelText('Matching users')).toBeInTheDocument();

    const tagsTab = screen.getByRole('tab', { name: /tags/i });
    await user.click(tagsTab);
    expect(await screen.findByLabelText('Matching hashtags')).toBeInTheDocument();

    renderAppAt('/settings');
    expect(await screen.findByRole('heading', { name: /settings & preferences/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/preferences saved/i)).toBeInTheDocument();
  });
});
