import { useEffect, useState } from 'react';

const STORAGE_KEY = 'soksan-streak';

export interface StreakState {
  count: number;
  last: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

function readStreak(): StreakState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StreakState;
  } catch {
    /* private mode etc. — streaks are cosmetic, never blocking */
  }
  return { count: 0, last: '' };
}

function resolveStreak(): StreakState & { isNewToday: boolean } {
  const stored = readStreak();
  const now = today();

  if (stored.last === now) {
    return { ...stored, isNewToday: false };
  }

  return {
    count: stored.last === yesterday() ? stored.count + 1 : 1,
    last: now,
    isNewToday: true,
  };
}

/**
 * Daily-open streak: +1 for each consecutive day the app is opened.
 * Purely motivational — lives in localStorage, no server involved.
 */
export function useStreak(): StreakState & { isNewToday: boolean } {
  const [state] = useState<StreakState & { isNewToday: boolean }>(resolveStreak);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ count: state.count, last: state.last }),
      );
    } catch {
      /* still show the streak even if it cannot persist */
    }
  }, [state.count, state.last]);

  return state;
}
