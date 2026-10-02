/**
 * Deterministic in-memory stand-in for maplibre-gl (vitest only — aliased in
 * vitest.config.ts). jsdom has no WebGL, so the real library cannot boot in
 * tests. The mock keeps SokSanMap's contract: markers are real DOM buttons
 * appended to the map container, so Testing Library can see and click them.
 */

type Handler = (event: unknown) => void;

interface MockMapOptions {
  container: HTMLElement;
  style?: unknown;
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  maxBounds?: unknown;
  attributionControl?: unknown;
}

export class MockMap {
  static instances: MockMap[] = [];

  container: HTMLElement;
  userData: Record<string, unknown> = {};
  zoomLevel: number;
  centerValue: [number, number];
  flyToCalls: Array<{ center: [number, number]; zoom?: number }> = [];
  fitBoundsCalls: unknown[] = [];
  attributionControl: { addAttribution: (value: string) => void; attributions: string[] };

  private handlers: Record<string, Handler[]> = {};
  private removed = false;

  constructor(options: MockMapOptions) {
    this.container = options.container;
    this.zoomLevel = options.zoom ?? 6;
    this.centerValue = options.center ?? [104.99, 11.55];
    this.attributionControl = {
      attributions: [],
      addAttribution: (value: string) => this.attributionControl.attributions.push(value),
    };
    MockMap.instances.push(this);
    // Fire 'load' asynchronously, like the real map does after style load.
    queueMicrotask(() => this.emit('load', {}));
  }

  on(event: string, handler: Handler): void {
    (this.handlers[event] ||= []).push(handler);
  }

  off(event: string, handler: Handler): void {
    this.handlers[event] = (this.handlers[event] || []).filter((item) => item !== handler);
  }

  emit(event: string, payload: unknown): void {
    for (const handler of this.handlers[event] || []) handler(payload);
  }

  flyTo(options: { center: [number, number]; zoom?: number }): void {
    this.flyToCalls.push(options);
    this.centerValue = options.center;
    if (options.zoom !== undefined) this.zoomLevel = options.zoom;
  }

  jumpTo(options: { center: [number, number]; zoom?: number }): void {
    this.flyTo(options);
  }

  getZoom(): number {
    return this.zoomLevel;
  }

  fitBounds(bounds: unknown, options?: unknown): void {
    this.fitBoundsCalls.push({ bounds, options });
  }

  getContainer(): HTMLElement {
    return this.container;
  }

  remove(): void {
    this.removed = true;
    this.container.innerHTML = '';
  }

  get isRemoved(): boolean {
    return this.removed;
  }
}

export class MockMarker {
  static instances: MockMarker[] = [];

  element: HTMLElement;
  lngLat: [number, number] = [0, 0];
  private attachedTo: MockMap | null = null;

  constructor(options: { element?: HTMLElement; anchor?: string }) {
    this.element = options.element ?? document.createElement('div');
    MockMarker.instances.push(this);
  }

  setLngLat(lngLat: [number, number]): this {
    this.lngLat = lngLat;
    return this;
  }

  addTo(map: MockMap): this {
    this.attachedTo = map;
    map.getContainer().appendChild(this.element);
    return this;
  }

  remove(): void {
    this.element.remove();
    this.attachedTo = null;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  get map(): MockMap | null {
    return this.attachedTo;
  }
}

export class MockLngLatBounds {
  points: Array<[number, number]> = [];

  constructor(a: [number, number], b: [number, number]) {
    this.points.push(a, b);
  }

  extend(point: [number, number]): this {
    this.points.push(point);
    return this;
  }
}

/** Test hooks — latest instances for assertions. */
export const mapMock = {
  lastMap: (): MockMap | undefined => MockMap.instances[MockMap.instances.length - 1],
  lastMarker: (): MockMarker | undefined => MockMarker.instances[MockMarker.instances.length - 1],
  reset: (): void => {
    MockMap.instances = [];
    MockMarker.instances = [];
  },
};

const maplibregl = {
  Map: MockMap,
  Marker: MockMarker,
  LngLatBounds: MockLngLatBounds,
};

export { MockMap as Map, MockMarker as Marker, MockLngLatBounds as LngLatBounds };

export default maplibregl;
