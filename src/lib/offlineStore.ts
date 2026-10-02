// Phase 6 — offline save. Posts the traveler explicitly keeps on-device so
// they survive losing connectivity. localStorage keeps the demo seam simple
// and inspectable; the production app swaps this module for IndexedDB + a
// Cloudflare R2 media cache behind the same four functions.
import type { Post } from '../types';

export interface OfflineEntry {
  post: Post;
  saved_at: string;
}

const KEY = 'soksan-offline-posts';

function readStore(): OfflineEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OfflineEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStore(entries: OfflineEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* quota exceeded — the rest of the app keeps working */
  }
}

/** Posts saved for offline, newest-save first. */
export function offlineEntries(): OfflineEntry[] {
  return readStore().sort((a, b) => b.saved_at.localeCompare(a.saved_at));
}

export function isSavedOffline(postId: number): boolean {
  return readStore().some((entry) => entry.post.id === postId);
}

/** Add a post to the offline shelf. Idempotent. */
export function saveOffline(post: Post): void {
  const current = readStore();
  if (current.some((entry) => entry.post.id === post.id)) return;
  current.push({ post, saved_at: new Date().toISOString() });
  writeStore(current);
}

export function removeOffline(postId: number): void {
  writeStore(readStore().filter((entry) => entry.post.id !== postId));
}
