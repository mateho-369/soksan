import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, MessageCircle, MapPin, Share2, Eye } from 'lucide-react';
import { apiFetch } from '../lib/http';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState } from '../components/States';
import ShareCard from '../components/ShareCard';
import type { Post } from '../types';
import '../styles/growth.css';

/**
 * Phase 8 — public landing page for a shared post. Anyone with the link
 * sees the story (published posts only); no account required.
 */
export default function PostPublic() {
  const { id = '' } = useParams();
  const { t, language } = useLanguage();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    void apiFetch(`/posts/${id}`)
      .then(async (res) => {
        if (!alive) return;
        if (res.ok) setPost(await res.json());
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="post-public-page">
      {loading ? (
        <LoadingState compact />
      ) : !post ? (
        <div className="post-public-missing">
          <h1>{t('share.notFound')}</h1>
          <Link to="/">{t('share.backHome')}</Link>
        </div>
      ) : (
        <article className="post-public-card">
          <div className="post-public-media">
            <img src={post.media_url} alt={post.location_name} />
          </div>
          <div className="post-public-body">
            <span className="eyebrow">
              <MapPin size={13} /> {post.location_name}, {post.province}
            </span>
            <h1>{language === 'kh' ? post.caption_kh : post.caption_en}</h1>
            <div className="post-public-author">
              <img src={post.author.avatar_url} alt="" />
              <div>
                <strong>{post.author.name}</strong>
                <small>{new Date(post.created_at).toLocaleDateString()}</small>
              </div>
            </div>
            <ul className="post-public-stats">
              <li>
                <Heart size={14} /> {post.like_count}
              </li>
              <li>
                <MessageCircle size={14} /> {post.comment_count}
              </li>
              <li>
                <Eye size={14} /> {post.view_count ?? 0}
              </li>
            </ul>
            <div className="post-public-actions">
              <button type="button" className="share-primary" onClick={() => setSharing(true)}>
                <Share2 size={15} /> {t('share.openCard')}
              </button>
              <Link to="/">{t('share.exploreMore')}</Link>
            </div>
          </div>
        </article>
      )}
      {post && sharing && <ShareCard post={post} onClose={() => setSharing(false)} />}
    </div>
  );
}
