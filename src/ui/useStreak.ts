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

/**
 * Daily-open streak: +1 for each consecutive day the app is opened.
 * Purely motivational — lives in localStorage, no server involved.
 */
export function useStreak(): StreakState & { isNewToday: boolean } {
  const [state, setState] = useState<StreakState & { isNewToday: boolean }>(() => ({
    ...readStreak(),
    isNewToday: false,
  }));

  useEffect(() => {
    const stored = readStreak();
    const now = today();

    if (stored.last === now) {
      setState({ ...stored, isNewToday: false });
      return;
    }

    const next: StreakState = {
      count: stored.last === yesterday() ? stored.count + 1 : 1,
      last: now,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* still show the streak even if it cannot persist */
    }
    setState({ ...next, isNewToday: true });
  }, []);

  return state;
}
