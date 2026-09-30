import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/http';
import { useLanguage } from '../contexts/LanguageContext';
import type { Post } from '../types';

interface CurrentGem {
  week_start: string;
  note: string | null;
  post: Post;
}

interface CurrentGemResponse {
  current: (Omit<CurrentGem, 'post'> & { post: Post | null }) | null;
}

/**
 * Phase 5/8 — "Hidden Gem of the Week" display. Editorial pick chosen by
 * admins (never score-derived); this banner just surfaces it on the feed.
 */
export default function HiddenGemBanner() {
  const { t, language } = useLanguage();
  const [gem, setGem] = useState<CurrentGem | null>(null);

  useEffect(() => {
    let alive = true;
    void apiFetch('/hidden-gem/current')
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as CurrentGemResponse;
        const current = data?.current;
        if (alive && current?.post) setGem({ ...current, post: current.post });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!gem) return null;

  return (
    <div className="hidden-gem-banner" role="note">
      <span className="gem-icon" aria-hidden>💎</span>
      <div>
        <strong>{t('social.hiddenGemTitle')}</strong>
        <small>
          {language === 'kh' ? gem.post.caption_kh : gem.post.caption_en} · {gem.post.location_name}
          {gem.note ? ` — ${gem.note}` : ''}
        </small>
      </div>
    </div>
  );
}
