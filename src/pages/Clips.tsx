import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  BadgeCheck,
  MapPin,
  Music2,
  Heart,
  MessageCircle,
  Send,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState, ErrorState } from '../components/States';
import CommentDrawer from '../components/CommentDrawer';
import type { Post } from '../types';

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

export default function Clips() {
  const { language, t } = useLanguage();
  const [clips, setClips] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [commentPostId, setCommentPostId] = useState<number | null>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/posts?format=clips');
      if (!res.ok) throw new Error('Could not load clips');
      const data = await res.json();
      setClips(data);
      setActiveId(data[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load clips');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
            const id = Number((entry.target as HTMLElement).dataset.post);
            setActiveId(id);
          }
        }),
      { threshold: [0.7] },
    );
    document.querySelectorAll('.clip-item').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [clips]);

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (!video) return;
      if (Number(id) === activeId) video.play().catch(() => {});
      else video.pause();
    });
  }, [activeId]);

  const interact = async (postId: number, action: 'like' | 'share') => {
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
              like_count: action === 'like' ? item.like_count + (item.is_liked ? -1 : 1) : item.like_count,
              share_count: action === 'share' ? item.share_count + 1 : item.share_count,
            },
      ),
    );
    await fetch('/api/posts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId, action }),
    });
  };

  const toggleFollow = async (profileId: number) => {
    setClips((list) =>
      list.map((item) =>
        item.author.id === profileId
          ? { ...item, author: { ...item.author, is_following: !item.author.is_following } }
          : item,
      ),
    );
    await fetch('/api/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId }),
    });
  };

  const enterFullscreen = async (postId: number) => {
    const video = videoRefs.current[postId] as FullscreenVideo | null;
    if (!video) return;
    try {
      if (video.requestFullscreen) await video.requestFullscreen();
      else video.webkitEnterFullscreen?.();
    } catch {
      /* fullscreen unsupported */
    }
  };

  const commentPost = clips.find((item) => item.id === commentPostId) || null;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="clips-page">
      <header className="clips-top">
        <strong>{t('clips.title')}</strong>
        <span>{t('clips.subtitle')}</span>
      </header>
      {clips.length === 0 ? (
        <div className="empty-clips">
          <Play />
          <h2>{t('clips.empty')}</h2>
          <p>{t('clips.emptyHelp')}</p>
        </div>
      ) : (
        <section className="clips-scroll">
          {clips.map((clip) => {
            const video = clip.media.find((item) => item.media_type === 'video') || { media_url: clip.media_url };
            const isActive = activeId === clip.id;
            return (
              <article key={clip.id} className="clip-item" data-post={clip.id}>
                <video
                  ref={(element) => {
                    videoRefs.current[clip.id] = element;
                  }}
                  src={video.media_url}
                  loop
                  muted={muted}
                  playsInline
                  preload="metadata"
                  onClick={() => {
                    const element = videoRefs.current[clip.id];
                    if (!element) return;
                    if (element.paused) element.play();
                    else element.pause();
                  }}
                />
                <div className="clip-shade" />
                <div className="clip-player-tools">
                  <button className="clip-sound" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Unmute' : 'Mute'}>
                    {muted ? <VolumeX /> : <Volume2 />}
                  </button>
                  <button className="clip-expand" onClick={() => enterFullscreen(clip.id)} aria-label="Play fullscreen">
                    <Maximize2 />
                  </button>
                </div>
                {!isActive && (
                  <div className="clip-paused">
                    <Pause />
                  </div>
                )}
                <div className="clip-copy">
                  <div className="clip-author">
                    <img src={clip.author.avatar_url} alt="" />
                    <strong>
                      {clip.author.name}
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
                  </span>
                  <small>
                    <Music2 /> Original sounds · SokSan Cambodia
                  </small>
                </div>
                <div className="clip-actions">
                  <button className={clip.is_liked ? 'liked' : ''} onClick={() => interact(clip.id, 'like')}>
                    <span>
                      <Heart fill={clip.is_liked ? 'currentColor' : 'none'} />
                    </span>
                    <b>{clip.like_count}</b>
                  </button>
                  <button onClick={() => setCommentPostId(clip.id)}>
                    <span>
                      <MessageCircle />
                    </span>
                    <b>{clip.comment_count}</b>
                  </button>
                  <button onClick={() => interact(clip.id, 'share')}>
                    <span>
                      <Send />
                    </span>
                    <b>{clip.share_count}</b>
                  </button>
                  <button className="clip-avatar" onClick={() => toggleFollow(clip.author.id)}>
                    <img src={clip.author.avatar_url} alt="" />
                    <i>+</i>
                  </button>
                </div>
                <div className="clip-progress">
                  <span />
                </div>
              </article>
            );
          })}
        </section>
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
