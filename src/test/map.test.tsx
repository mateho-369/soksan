import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import SokSanMap from '../components/map/SokSanMap';
import PlacePicker from '../components/map/PlacePicker';
import { LanguageProvider } from '../contexts/LanguageContext';
import { MAP_STYLE_URL, isInsideCambodia } from '../lib/mapConfig';
import { MockMap, mapMock } from './maplibre-mock';

/**
 * Phase 2 — map layer tests. maplibre-gl is aliased to an in-memory mock
 * (jsdom has no WebGL); markers are still real DOM buttons, so interaction
 * tests exercise the same elements a browser user would click.
 */
const pins = [
  { id: 1, lat: 10.582, lng: 103.62, label: 'Ream Coastal Trail', icon: '💎' },
  { id: 2, lat: 12.449, lng: 107.192, label: 'Cloud Valley Coffee', icon: '☕' },
];

beforeEach(() => {
  mapMock.reset();
});

describe('map config', () => {
  it('uses OpenFreeMap tiles (never Google) and a sane Cambodia envelope', () => {
    expect(MAP_STYLE_URL).toContain('openfreemap.org');
    expect(MAP_STYLE_URL.toLowerCase()).not.toContain('google');
    expect(isInsideCambodia({ lat: 11.575, lng: 104.926 })).toBe(true); // Phnom Penh
    expect(isInsideCambodia({ lat: 13.7563, lng: 100.5018 })).toBe(false); // Bangkok
    expect(isInsideCambodia({ lat: 48.8566, lng: 2.3522 })).toBe(false); // Paris
  });
});

describe('SokSanMap', () => {
  it('renders one accessible marker per pin and reports clicks', async () => {
    const user = userEvent.setup();
    const clicked: Array<string | number> = [];
    render(<SokSanMap pins={pins} onPinClick={(id) => clicked.push(id)} />);

    const ream = await screen.findByRole('button', { name: 'Ream Coastal Trail' });
    expect(screen.getByRole('button', { name: 'Cloud Valley Coffee' })).toBeInTheDocument();

    await user.click(ream);
    expect(clicked).toEqual([1]);

    // Pins frame the viewport once on first render.
    const map = mapMock.lastMap();
    expect(map?.fitBoundsCalls.length).toBe(1);
  });

  it('flies to the selected pin and marks it selected', async () => {
    render(<SokSanMap pins={pins} selectedId={2} />);

    await screen.findByRole('button', { name: 'Cloud Valley Coffee' });
    await waitFor(() => {
      const map = mapMock.lastMap();
      expect(map?.flyToCalls.length).toBeGreaterThan(0);
      expect(map?.flyToCalls[0].center).toEqual([107.192, 12.449]);
    });
    await waitFor(() => {
      const marker = [...document.querySelectorAll('.soksan-marker')].find((el) =>
        el.classList.contains('selected'),
      );
      expect(marker).toBeTruthy();
    });
  });

  it('supports click-to-pick for the manual pin path', async () => {
    const picked: Array<{ lat: number; lng: number }> = [];
    render(<SokSanMap onPick={(point) => picked.push(point)} fitToPins={false} />);

    await waitFor(() => expect(mapMock.lastMap()).toBeTruthy());
    const map = mapMock.lastMap() as InstanceType<typeof MockMap>;
    await waitFor(() => {
      map.emit('click', { lngLat: { lat: 11.575, lng: 104.926 } });
      expect(picked).toEqual([{ lat: 11.575, lng: 104.926 }]);
    });
  });
});

describe('PlacePicker (manual pin path)', () => {
  it('drops a pin on map click and confirms it', async () => {
    const user = userEvent.setup();
    let confirmed: { lat: number; lng: number } | null = null;
    render(
      <LanguageProvider>
        <PlacePicker
          onConfirm={(point) => {
            confirmed = point;
          }}
          onClose={() => {}}
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole('dialog', { name: /pin your spot/i })).toBeInTheDocument();
    // Confirm is disabled until a pin exists.
    expect(screen.getByRole('button', { name: /use this location/i })).toBeDisabled();

    const map = mapMock.lastMap() as InstanceType<typeof MockMap>;
    await waitFor(() => {
      map.emit('click', { lngLat: { lat: 12.45, lng: 107.19 } });
      expect(screen.getByText(/12\.45000, 107\.19000/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /use this location/i }));
    expect(confirmed).toEqual({ lat: 12.45, lng: 107.19 });
  });

  it('rejects pins dropped outside Cambodia', async () => {
    render(
      <LanguageProvider>
        <PlacePicker onConfirm={() => {}} onClose={() => {}} />
      </LanguageProvider>,
    );

    const map = mapMock.lastMap() as InstanceType<typeof MockMap>;
    await waitFor(() => {
      map.emit('click', { lngLat: { lat: 48.8566, lng: 2.3522 } });
      expect(screen.getByText(/outside cambodia/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /use this location/i })).toBeDisabled();
  });
});
