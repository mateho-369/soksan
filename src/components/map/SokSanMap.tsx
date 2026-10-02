import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker, LngLatBounds } from 'maplibre-gl';
import { Compass, Minus, Plus } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  CAMBODIA_BOUNDS,
  CAMBODIA_CENTER,
  CAMBODIA_MAX_ZOOM,
  CAMBODIA_MIN_ZOOM,
  CAMBODIA_ZOOM,
  MAP_ATTRIBUTION,
  MAP_STYLE_URL,
  type LatLng,
  type MapPinData,
} from '../../lib/mapConfig';
import '../../styles/map.css';

export interface SokSanMapProps {
  pins?: MapPinData[];
  selectedId?: string | number | null;
  onPinClick?: (id: string | number) => void;
  /** Pick mode: clicking the map reports coordinates (manual pin drop). */
  onPick?: (point: LatLng) => void;
  pickedPoint?: LatLng | null;
  /** Imperative-ish re-centering: bump `token` to fly here again. */
  focus?: (LatLng & { token: number }) | null;
  center?: [number, number];
  zoom?: number;
  /** Fit the viewport to the pins once they arrive. Default true. */
  fitToPins?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** True when the user asked the OS for less motion. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * SokSan's one map component. Every map in the app (Discover, place picker,
 * later the business dashboard) renders through here, so tile source,
 * bounds, and attribution are decided in ONE place (src/lib/mapConfig.ts).
 */
export default function SokSanMap({
  pins = [],
  selectedId = null,
  onPinClick,
  onPick,
  pickedPoint = null,
  focus = null,
  center = CAMBODIA_CENTER,
  zoom = CAMBODIA_ZOOM,
  fitToPins = true,
  className = '',
  ariaLabel = 'Map of Cambodia',
}: SokSanMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string | number, Marker>>(new Map());
  const pickedMarkerRef = useRef<Marker | null>(null);
  const fittedRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // ── create the map once ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const markers = markersRef.current;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center,
      zoom,
      minZoom: CAMBODIA_MIN_ZOOM,
      maxZoom: CAMBODIA_MAX_ZOOM,
      maxBounds: CAMBODIA_BOUNDS,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.on('load', () => setStatus('ready'));
    map.on('error', () => setStatus((current) => (current === 'ready' ? current : 'error')));
    return () => {
      markers.forEach((marker) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; re-mounting happens only via `key` upstream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── attribution is mandatory for OpenFreeMap/OSM data ─────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const control = (map as unknown as { attributionControl?: { addAttribution?: (value: string) => void } })
      .attributionControl;
    control?.addAttribution?.(MAP_ATTRIBUTION);
  }, [status]);

  // ── click-to-pick (manual pin path) ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!onPick) return;
    const handler = (event: { lngLat: { lat: number; lng: number } }) => {
      onPick({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    };
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [onPick, status]);

  // ── render pins as accessible DOM markers ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;

    // Drop markers that disappeared from the data.
    for (const [id, marker] of markersRef.current) {
      if (!pins.some((pin) => pin.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const pin of pins) {
      let marker = markersRef.current.get(pin.id);
      if (!marker) {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'soksan-marker';
        element.setAttribute('aria-label', pin.label);
        element.innerHTML = `<span aria-hidden="true"><em>${pin.icon || '📍'}</em></span><i></i>`;
        element.addEventListener('click', (event) => {
          event.stopPropagation();
          onPinClick?.(pin.id);
        });
        marker = new Marker({ element, anchor: 'bottom' }).setLngLat([pin.lng, pin.lat]);
        marker.addTo(map);
        markersRef.current.set(pin.id, marker);
      } else {
        marker.setLngLat([pin.lng, pin.lat]);
      }
      const element = marker.getElement();
      element.classList.toggle('selected', pin.id === selectedId);
    }

    // Frame the pins once they first appear.
    if (fitToPins && pins.length > 1 && !fittedRef.current) {
      fittedRef.current = true;
      const bounds = pins.reduce(
        (acc, pin) => acc.extend([pin.lng, pin.lat] as [number, number]),
        new LngLatBounds([pins[0].lng, pins[0].lat], [pins[0].lng, pins[0].lat]),
      );
      map.fitBounds(bounds, { padding: 56, duration: prefersReducedMotion() ? 0 : 900 });
    }
  }, [pins, selectedId, status, fitToPins, onPinClick]);

  // ── fly to the selected pin ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready' || selectedId == null) return;
    const pin = pins.find((item) => item.id === selectedId);
    if (!pin) return;
    if (prefersReducedMotion()) {
      map.jumpTo({ center: [pin.lng, pin.lat], zoom: Math.max(map.getZoom(), 11) });
    } else {
      map.flyTo({ center: [pin.lng, pin.lat], zoom: Math.max(map.getZoom(), 11), duration: 700 });
    }
  }, [selectedId, status, pins]);

  // ── external re-center request (e.g. "Near me") ───────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready' || !focus) return;
    const target: [number, number] = [focus.lng, focus.lat];
    if (prefersReducedMotion()) {
      map.jumpTo({ center: target, zoom: 12 });
    } else {
      map.flyTo({ center: target, zoom: 12, duration: 800 });
    }
  }, [focus, status]);

  // ── picked-point marker (manual pin) ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    pickedMarkerRef.current?.remove();
    pickedMarkerRef.current = null;
    if (!pickedPoint) return;
    const element = document.createElement('div');
    element.className = 'soksan-picked-pin';
    element.setAttribute('aria-hidden', 'true');
    pickedMarkerRef.current = new Marker({ element, anchor: 'bottom' })
      .setLngLat([pickedPoint.lng, pickedPoint.lat])
      .addTo(map);
  }, [pickedPoint, status]);

  const adjustZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    const nextZoom = Math.min(CAMBODIA_MAX_ZOOM, Math.max(CAMBODIA_MIN_ZOOM, map.getZoom() + delta));
    const currentCenter = (map as unknown as { getCenter?: () => { lng: number; lat: number } }).getCenter?.();
    const targetCenter: [number, number] = currentCenter
      ? [currentCenter.lng, currentCenter.lat]
      : center;
    map.jumpTo({ center: targetCenter, zoom: nextZoom });
  };

  const resetView = () => {
    const map = mapRef.current;
    if (!map) return;
    if (prefersReducedMotion()) {
      map.jumpTo({ center: CAMBODIA_CENTER, zoom: CAMBODIA_ZOOM });
    } else {
      map.flyTo({ center: CAMBODIA_CENTER, zoom: CAMBODIA_ZOOM, duration: 650 });
    }
  };

  return (
    <div className={`soksan-map-shell ${className}`}>
      <div ref={containerRef} className="soksan-map-canvas" role="application" aria-label={ariaLabel} />

      <div className="soksan-map-controls" role="group" aria-label="Map controls">
        <button
          type="button"
          className="soksan-map-fab"
          onClick={() => adjustZoom(1)}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          className="soksan-map-fab"
          onClick={() => adjustZoom(-1)}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          className="soksan-map-fab"
          onClick={resetView}
          aria-label="Reset Cambodia view"
          title="Reset Cambodia view"
        >
          <Compass size={18} />
        </button>
      </div>

      {status === 'loading' && (
        <div className="soksan-map-status skel" role="status">
          <span className="soksan-map-status-pill">Loading map…</span>
        </div>
      )}
      {status === 'error' && (
        <div className="soksan-map-status error" role="alert">
          <span className="soksan-map-status-pill">
            The map could not load. Check your connection and try again.
          </span>
        </div>
      )}
    </div>
  );
}
