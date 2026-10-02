import { useCallback, useState } from 'react';

const CELEBRATED_KEY = 'soksan-gem-celebrated';
/** Demo threshold — a post "confirming" its place as a hidden gem. */
export const GEM_THRESHOLD = 10;

function celebrated(): number[] {
  try {
    return JSON.parse(localStorage.getItem(CELEBRATED_KEY) || '[]') as number[];
  } catch {
    return [];
  }
}

/**
 * Light gamification: when one of the user's own posts crosses the gem
 * threshold, celebrate it once (localStorage remembers which posts already
 * had their moment). Ties into the auto-promotion story without adding any
 * backend logic.
 */
export function useGemMoment() {
  const [moment, setMoment] = useState<{ postId: number; title: string } | null>(null);

  const celebrateIfNew = useCallback((postId: number, title: string, likeCount: number) => {
    if (likeCount < GEM_THRESHOLD) return;
    const done = celebrated();
    if (done.includes(postId)) return;

    try {
      localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...done, postId]));
    } catch {
      /* cosmetic feature — storage failure must never block the UI */
    }
    setMoment({ postId, title });
    window.setTimeout(() => setMoment(null), 4200);
  }, []);

  const dismiss = useCallback(() => setMoment(null), []);

  return { moment, celebrateIfNew, dismiss };
}
