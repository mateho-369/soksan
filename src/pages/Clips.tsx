import { apiFetch } from '../lib/http';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Bookmark,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Music2,
  Play,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { ErrorState } from '../components/States';
import CommentDrawer from '../components/CommentDrawer';
import LikeButton from '../ui/LikeButton';
import AnimatedNumber from '../ui/AnimatedNumber';
import type { Post } from '../types';

const CLIP_PAGE_SIZE = 3;

interface NavigatorConnection {
  effectiveType?: string;
  saveData?: boolean;
}

/** Rural/slow networks: skip autoplay and heavy preloading. */
function isSlowConnection(): boolean {
  const connection = (navigator as unknown as { connection?: NavigatorConnection }).connection;
  return Boolean(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || '')));
}

const formatCount = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

export default function Clips() {
  const { language, t } = useLanguage();
  const { requireAuth } = useAuth();
  const navigate = useNavigate();

  const [clips, setClips] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [muted, setMuted] = useState(true); // muted-by-default autoplay policy
  const [commentPostId, setCommentPostId] = useState<number | null>(null);
  const [burstId, setBurstId] = useState<number | null>(null);
  const [videoErrors, setVideoErrors] = useState<Record<number, boolean>>({});
  // Connection quality is sampled once per mount; it never changes mid-session.
  const [dataSaver] = useState(isSlowConnection);

  const pageRef = useRef(1);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // A plain (memoized) element registry — not a ref — so callback refs can
  // register videos without touching ref state during render.
  const videoEls = useMemo(() => ({}) as Record<number, HTMLVideoElement | null>, []);
  const viewedRef = useRef<Set<number>>(new Set());
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);

  const fetchPage = useCallback(async (page: number): Promise<Post[]> => {
    const res = await apiFetch(`/posts?format=clips&page=${page}`);
    if (!res.ok) throw new Error('Could not load clips');
    return res.json();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPage(1);
      pageRef.current = 1;
      setClips(data);
      setActiveId(data[0]?.id ?? null);
      setEnded(data.length < CLIP_PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load clips');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    load();
  }, [load]);

  // Infinite scroll: fetch the next page when the sentinel becomes visible.
  const loadMore = useCallback(async () => {
    if (loadingMore || ended) return;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const data = await fetchPage(next);
      pageRef.current = next;
      setClips((list) => [...list, ...data]);
      if (data.length < CLIP_PAGE_SIZE) setEnded(true);
    } catch {
      /* stay silent — the sentinel remains and the user can scroll again */
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, loadingMore, ended]);

  // One video "in view" at a time; count a view once per clip.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;
          const id = Number((entry.target as HTMLElement).dataset.slide);
          setActiveId(id);
          if (!viewedRef.current.has(id)) {
            viewedRef.current.add(id);
            apiFetch('/posts', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, action: 'view' }),
            }).catch(() => {});
          }
        }),
      { root: stage, threshold: [0.6] },
    );
    stage.querySelectorAll('[data-slide]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [clips]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && loadMore()),
      { root: stageRef.current, threshold: [0.1] },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Autoplay only the active clip; preload the next 1–2; unload the rest.
  useEffect(() => {
    const activeIndex = clips.findIndex((clip) => clip.id === activeId);
    clips.forEach((clip, index) => {
      const video = videoEls[clip.id];
      if (!video) return;
      if (clip.id === activeId) {
        if (dataSaver) video.pause();
        else video.play().catch(() => {});
        video.preload = 'auto';
      } else {
        video.pause();
        const distance = activeIndex === -1 ? 99 : index - activeIndex;
        video.preload = distance >= 1 && distance <= 2 ? 'auto' : 'none';
      }
    });
  }, [activeId, clips, dataSaver, videoEls]);

  useEffect(() => () => {
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
  }, []);

  const interact = async (postId: number, action: 'like' | 'share' | 'save') => {
    if (!requireAuth(navigate)) return;
    const clip = clips.find((item) => item.id === postId);
    if (action === 'share' && clip) {
      if (navigator.share) {
        await navigator
          .share({ title: clip.location_name, text: clip.caption_en, url: window.location.href })
          .catch(() => {});
      } else {
        await navigator.clipboard?.writeText(window.location.href);
      }
    }
    setClips((list) =>
      list.map((item) =>
        item.id !== postId
          ? item
          : {
              ...item,
              is_liked: action === 'like' ? !item.is_liked : item.is_liked,
              is_saved: action === 'save' ? !item.is_saved : item.is_saved,
              like_count: action === 'like' ? Math.max(0, item.like_count + (item.is_liked ? -1 : 1)) : item.like_count,
              share_count: action === 'share' ? item.share_count + 1 : item.share_count,
            },
      ),
    );
    await apiFetch('/posts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId, action }),
    });
  };

  const toggleFollow = async (profileId: number) => {
    if (!requireAuth(navigate)) return;
    setClips((list) =>
      list.map((item) =>
        item.author.id === profileId
          ? { ...item, author: { ...item.author, is_following: !item.author.is_following } }
          : item,
      ),
    );
    await apiFetch('/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId }),
    });
  };

  const togglePlay = (postId: number) => {
    const video = videoEls[postId];
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  // TikTok tap model: single tap toggles play, a second tap within 300ms likes.
  const handleTap = (clip: Post) => {
    const now = Date.now();
    const last = lastTapRef.current;
    lastTapRef.current = now;
    if (now - last < 300) {
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
      if (!clip.is_liked) void interact(clip.id, 'like');
      setBurstId(clip.id);
      window.setTimeout(() => setBurstId((current) => (current === clip.id ? null : current)), 650);
      return;
    }
    tapTimerRef.current = window.setTimeout(() => togglePlay(clip.id), 300);
  };

  const retryVideo = (postId: number) => {
    const video = videoEls[postId];
    setVideoErrors((state) => ({ ...state, [postId]: false }));
    video?.load();
    video?.play().catch(() => {});
  };

  const commentPost = clips.find((item) => item.id === commentPostId) || null;

  if (loading) {
    return (
      <div className="clips-page-v2">
        <div className="clip-skeleton" aria-busy="true">
          <div className="clip-skeleton-side">
            {[0, 1, 2, 3].map((index) => (
              <span key={index} />
            ))}
          </div>
          <div className="clip-skeleton-bottom">
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="clips-page-v2">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="clips-page-v2">
      {clips.length === 0 ? (
        <div className="empty-clips">
          <Play />
          <h2>{t('clips.empty')}</h2>
          <p>{t('clips.emptyHelp')}</p>
        </div>
      ) : (
        <div className="clips-stage" ref={stageRef}>
          {clips.map((clip) => {
            const video = clip.media.find((item) => item.media_type === 'video') || { media_url: clip.media_url };
            const isActive = activeId === clip.id;
            const failed = videoErrors[clip.id];
            return (
              <article key={clip.id} className={`clip-slide ${isActive ? 'active' : ''}`} data-slide={clip.id}>
                <video
                  ref={(element) => {
                    videoEls[clip.id] = element;
                  }}
                  src={video.media_url}
                  loop
                  muted={muted}
                  playsInline
                  preload="metadata"
                  onError={() => setVideoErrors((state) => ({ ...state, [clip.id]: true }))}
                />
                {/* Tap layer: single tap = play/pause, double tap = like. */}
                <button
                  className="clip-slide-tap"
                  aria-label={clip.location_name}
                  onClick={() => handleTap(clip)}
                />
                {failed && (
                  <button className="clip-video-fallback" onClick={() => retryVideo(clip.id)}>
                    <Play /> {t('clips.retryVideo')}
                  </button>
                )}
                <div className="clip-shade" />
                {burstId === clip.id && (
                  <div className="clip-heart-burst" aria-hidden="true">
                    <Heart fill="currentColor" />
                  </div>
                )}

                <div className="clip-player-tools">
                  <button
                    className="clip-sound"
                    onClick={() => setMuted((value) => !value)}
                    aria-label={muted ? t('clips.unmute') : t('clips.mute')}
                  >
                    {muted ? <VolumeX /> : <Volume2 />}
                  </button>
                </div>

                <div className="clip-copy">
                  <div className="clip-author">
                    <img src={clip.author.avatar_url} alt="" />
                    <strong>
                      {language === 'kh' && clip.author.name_kh ? clip.author.name_kh : clip.author.name}
                      {clip.author.verified && <BadgeCheck />}
                    </strong>
                    <button
                      className={clip.author.is_following ? 'following' : ''}
                      onClick={() => toggleFollow(clip.author.id)}
                    >
                      {clip.author.is_following ? t('social.following') : t('social.follow')}
                    </button>
                  </div>
                  <p>{language === 'kh' ? clip.caption_kh : clip.caption_en}</p>
                  <span>
                    <MapPin /> {clip.location_name}, {clip.province}
                    {typeof clip.view_count === 'number' && (
                      <em>
                        <Eye /> <AnimatedNumber value={clip.view_count} compact /> {t('clips.views')}
                      </em>
                    )}
                  </span>
                  <small>
                    <Music2 /> Original sounds · SokSan Cambodia
                  </small>
                </div>

                <div className="clip-actions">
                  <button
                    className={`clip-avatar ${clip.author.is_following ? 'following' : ''}`}
                    onClick={() => toggleFollow(clip.author.id)}
                    aria-label={t('social.follow')}
                  >
                    <img src={clip.author.avatar_url} alt="" />
                    {!clip.author.is_following && <i>+</i>}
                  </button>
                  <LikeButton
                    liked={Boolean(clip.is_liked)}
                    count={clip.like_count}
                    compact
                    onToggle={() => interact(clip.id, 'like')}
                    variant="rail"
                    size="lg"
                    label={t('social.like')}
                  />
                  <button onClick={() => setCommentPostId(clip.id)} aria-label={t('social.comment')}>
                    <span>
                      <MessageCircle />
                    </span>
                    <b>{formatCount(clip.comment_count)}</b>
                  </button>
                  <button
                    className={clip.is_saved ? 'saved' : ''}
                    onClick={() => interact(clip.id, 'save')}
                    aria-label={t('social.save')}
                  >
                    <span>
                      <Bookmark fill={clip.is_saved ? 'currentColor' : 'none'} />
                    </span>
                  </button>
                  <button onClick={() => interact(clip.id, 'share')} aria-label={t('social.share')}>
                    <span>
                      <Send />
                    </span>
                    <b>{formatCount(clip.share_count)}</b>
                  </button>
                </div>

                {dataSaver && (
                  <div className="clip-datasaver">
                    <Play /> {t('clips.dataSaverNote')}
                  </div>
                )}
              </article>
            );
          })}

          <div className="clip-sentinel" ref={sentinelRef}>
            {ended ? (
              <p>{t('clips.endMessage')}</p>
            ) : (
              <div className="clip-skeleton mini" aria-busy="true">
                <div className="clip-skeleton-side">
                  {[0, 1, 2].map((index) => (
                    <span key={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <CommentDrawer
        post={commentPost}
        open={!!commentPost}
        onClose={() => setCommentPostId(null)}
        onComment={(postId) =>
          setClips((list) =>
            list.map((item) => (item.id === postId ? { ...item, comment_count: item.comment_count + 1 } : item)),
          )
        }
      />
    </div>
  );
}
