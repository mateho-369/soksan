import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { installApi } from '../lib/api';

// Full-suite runs execute many jsdom workers in parallel; the 1s default
// for findBy*/waitFor is too tight under that load (the demo seam also adds
// a small simulated latency per request). 4s absorbs the spikes without
// hiding real failures.
configure({ asyncUtilTimeout: 4000 });

// jsdom lacks a few browser APIs the app touches; provide minimal stubs
// so components run exactly as they do in a browser.
if (typeof window.fetch !== 'function') {
  window.fetch = (() => Promise.reject(new Error('network disabled in tests'))) as typeof fetch;
}
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
// jsdom has no IntersectionObserver; the Clips feed observes slides and a
// scroll sentinel, so provide a no-op stub that never reports intersections.
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}
if (!window.scrollTo) window.scrollTo = () => {};
// jsdom does not implement Element.scrollIntoView; the Messages chat uses it
// to auto-scroll to the newest message. Provide a no-op so the page works.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
// jsdom/vitest stubs cannot build object URLs from jsdom File objects, so
// replace them unconditionally with deterministic no-ops.
URL.createObjectURL = () => 'blob:mock-object-url';
URL.revokeObjectURL = () => {};

// jsdom does not implement media playback.
Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: () => Promise.resolve(),
});
Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: () => {},
});

// The in-browser demo backend handles every /api request.
installApi();

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
  vi.restoreAllMocks();
});
