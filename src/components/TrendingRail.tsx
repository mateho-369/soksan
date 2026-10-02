import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { apiFetch } from '../lib/http';
import { useLanguage } from '../contexts/LanguageContext';
import type { Post } from '../types';
import '../styles/discovery.css';

/**
 * Phase 6 — "Trending Now": recency-weighted hot posts (3-day half-life in
 * the demo seam, TrendingService in the backend). Read-only — it never
 * writes ranking state and never mixes with partner placements.
 */
export default function TrendingRail() {
  const { t, language } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    let alive = true;
    void apiFetch('/trending')
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { posts: Post[] };
        if (alive && Array.isArray(data.posts)) setPosts(data.posts);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="trending-rail" aria-label={t('trending.title')}>
      <header>
        <Flame size={15} />
        <strong>{t('trending.title')}</strong>
        <small>{t('trending.subtitle')}</small>
      </header>
      <ol>
        {posts.slice(0, 8).map((post, index) => (
          <li key={post.id} className="trending-card">
            {post.media_url && <img src={post.media_url} alt="" loading="lazy" />}
            <div>
              <span className="trending-rank">#{index + 1}</span>
              <strong>{post.location_name}</strong>
              <small>
                {post.province} · ♥ {post.like_count} · 💬 {post.comment_count}
              </small>
              <em>{language === 'kh' ? post.caption_kh : post.caption_en}</em>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
