/**
 * Map configuration — THE single source of truth for basemap tiles.
 *
 * Phase 2 decision (confirmed): public map rendering uses **OpenFreeMap**
 * (free, no API key, OpenStreetMap data). It must NEVER use Google Maps
 * rendering — that is a cost risk and off-limits for public tiles.
 *
 * ── Swapping to self-hosted PMTiles later ──────────────────────────────
 * Everything in the app reads tiles through `MAP_STYLE_URL` below. To move
 * to self-hosted vector tiles you change ONE thing in this file:
 *
 *   1. `npm i pmtiles` and register the protocol once at app boot:
 *        import { Protocol } from 'pmtiles';
 *        new Protocol().addTo(maplibregl);   // in SokSanMap.tsx boot path
 *   2. Point `MAP_STYLE_URL` at your own style JSON whose `sources` use
 *        "url": "pmtiles://https://cdn.soksan.app/cambodia.pmtiles"
 *
 * No component, page, or test touches tile URLs directly — so the swap is
 * a config change, not a refactor.
 */

export interface MapPinData {
  id: string | number;
  lat: number;
  lng: number;
  label: string;
  /** Emoji glyph rendered inside the pin (category icon). */
  icon?: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** OpenFreeMap public style — free tier, no key required. */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';

/** Rough center of Cambodia (Phnom Penh), [lng, lat] as MapLibre expects. */
export const CAMBODIA_CENTER: [number, number] = [104.99, 11.55];

/** Default zoom for the national view; clamped so users stay on-country. */
export const CAMBODIA_ZOOM = 6.4;
export const CAMBODIA_MIN_ZOOM = 5;
export const CAMBODIA_MAX_ZOOM = 18;

/**
 * Hard bounding box around the launch region. Keeps the demo map honest:
 * panning cannot wander off into a blank world while we only curate
 * Cambodian places.
 */
export const CAMBODIA_BOUNDS: [[number, number], [number, number]] = [
  [101.8, 9.4],
  [108.2, 14.9],
];

/** Attribution shown on every map (required by OpenFreeMap/OSM). */
export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" rel="noopener">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> contributors';

/**
 * Cambodia-wide sanity check for manually dropped pins. Anything outside
 * this envelope is almost certainly a fat-finger drop on the world map.
 */
export function isInsideCambodia(point: LatLng): boolean {
  const [[minLng, minLat], [maxLng, maxLat]] = CAMBODIA_BOUNDS;
  return point.lng >= minLng && point.lng <= maxLng && point.lat >= minLat && point.lat <= maxLat;
}
