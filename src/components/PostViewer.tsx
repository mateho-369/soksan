import { apiFetch } from '../lib/http';
import { useCallback, useEffect, useRef, useState, type FormEvent, type TouchEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Maximize2,
  Minimize2,
  Play,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  MapPin,
  MessageCircle,
  Share2,
  Ellipsis,
  Volume2,
  VolumeX,
  Smile,
  Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from './States';
import LikeButton from '../ui/LikeButton';
import AnimatedNumber from '../ui/AnimatedNumber';
import type { Post, Comment, CommentAsset, MediaItem } from '../types';

interface PostViewerProps {
  post: Post | null;
  onClose: () => void;
  onInteract: (id: number, action: 'like' | 'share') => void;
  onFollow: (profileId: number) => void;
  onComment?: () => void;
  initialCommentsOpen?: boolean;
}

export default function PostViewer({
  post,
  onClose,
  onInteract,
  onFollow,
  onComment,
  initialCommentsOpen = false,
}: PostViewerProps) {
  const { language, t } = useLanguage();
  const { requireAuth } = useAuth();
  const navigate = useNavigate();
  const [mediaIndex, setMediaIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(initialCommentsOpen);
  const [comments, setComments] = useState<Comment[]>([]);
  const [assets, setAssets] = useState<CommentAsset[]>([]);
  const [draft, setDraft] = useState('');
  const [picker, setPicker] = useState<'emoji' | 'gif' | null>(null);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceLandscape, setDeviceLandscape] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaTouchRef = useRef<{ x: number; y: number } | null>(null);
  const drawerTouchRef = useRef<{ x: number; y: number } | null>(null);
  const chromeTimerRef = useRef<number | null>(null);

  const media: MediaItem[] = post
    ? post.media.length
      ? post.media
      : [
          {
            id: 0,
            post_id: post.id,
            media_url: post.media_url,
            media_type: post.media_type === 'video' ? 'video' : 'image',
            sort_order: 0,
            duration_seconds: null,
          },
        ]
    : [];
  const current = media[Math.min(mediaIndex, Math.max(0, media.length - 1))];

  const loadComments = useCallback(async () => {
    if (!post) return;
    setLoadingComments(true);
    try {
      const res = await apiFetch(`/comments?post_id=${post.id}`);
      if (!res.ok) throw new Error('Could not load comments');
      const data = await res.json();
      setComments(data.comments);
      setAssets(data.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load comments');
    } finally {
      setLoadingComments(false);
    }
  }, [post]);

  useEffect(() => {
    setMediaIndex(0);
    setPicker(null);
    setDraft('');
    setCommentsOpen(initialCommentsOpen);
    setPaused(false);
    setMuted(true);
    setChromeVisible(true);
  }, [post?.id, initialCommentsOpen]);

  useEffect(() => {
    if (commentsOpen) loadComments();
  }, [commentsOpen, loadComments]);

  useEffect(() => {
    if (!post) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (commentsOpen) setCommentsOpen(false);
        else onClose();
      }
      if (!commentsOpen && event.key === 'ArrowRight') setMediaIndex((i) => Math.min(i + 1, media.length - 1));
      if (!commentsOpen && event.key === 'ArrowLeft') setMediaIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [post, commentsOpen, media.length, onClose]);

  useEffect(() => {
    setOrientation('landscape');
    setPaused(false);
  }, [current?.media_url]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreen = document.fullscreenElement === containerRef.current;
      setIsFullscreen(fullscreen);
      setChromeVisible(true);
    };
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    const onOrientationChange = () => {
      setDeviceLandscape(mediaQuery.matches);
      setChromeVisible(true);
    };
    onFullscreenChange();
    onOrientationChange();
    document.addEventListener('fullscreenchange', onFullscreenChange);
    mediaQuery.addEventListener('change', onOrientationChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      mediaQuery.removeEventListener('change', onOrientationChange);
    };
  }, []);

  useEffect(() => {
    if (chromeTimerRef.current) window.clearTimeout(chromeTimerRef.current);
    if ((isFullscreen || deviceLandscape) && !commentsOpen && !paused) {
      chromeTimerRef.current = window.setTimeout(() => setChromeVisible(false), 2800);
    } else {
      setChromeVisible(true);
    }
    return () => {
      if (chromeTimerRef.current) window.clearTimeout(chromeTimerRef.current);
    };
  }, [isFullscreen, deviceLandscape, commentsOpen, paused, mediaIndex]);

  const detectOrientation = (width: number, height: number) =>
    setOrientation(height > width * 1.08 ? 'portrait' : 'landscape');

  const goPrev = () => setMediaIndex((i) => Math.max(0, i - 1));
  const goNext = () => setMediaIndex((i) => Math.min(media.length - 1, i + 1));

  const onMediaTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    mediaTouchRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onMediaTouchEnd = (event: TouchEvent) => {
    if (!mediaTouchRef.current) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - mediaTouchRef.current.x;
    const dy = touch.clientY - mediaTouchRef.current.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }
    mediaTouchRef.current = null;
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const showChrome = () => {
    setChromeVisible(true);
    if (chromeTimerRef.current) window.clearTimeout(chromeTimerRef.current);
    if ((isFullscreen || deviceLandscape) && !commentsOpen && !paused) {
      chromeTimerRef.current = window.setTimeout(() => setChromeVisible(false), 2800);
    }
  };

  const onVideoClick = () => {
    if (!chromeVisible) {
      showChrome();
      return;
    }
    if (isVideo && orientation === 'portrait') togglePlay();
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current?.requestFullscreen();
    } catch {
      /* fullscreen unsupported */
    }
  };

  const onDrawerTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    drawerTouchRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onDrawerTouchEnd = (event: TouchEvent) => {
    if (!drawerTouchRef.current) return;
    const touch = event.changedTouches[0];
    const dy = touch.clientY - drawerTouchRef.current.y;
    const dx = touch.clientX - drawerTouchRef.current.x;
    if (dy > 70 && Math.abs(dy) > Math.abs(dx)) setCommentsOpen(false);
    drawerTouchRef.current = null;
  };

  const submitComment = async (event?: FormEvent, asset?: CommentAsset) => {
    event?.preventDefault();
    if (!post || (!draft.trim() && !asset)) return;
    if (!requireAuth(navigate)) return;
    setSending(true);
    setError('');
    try {
      const res = await apiFetch('/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id, body: draft, asset_id: asset?.id || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Comment failed');
      setDraft('');
      setPicker(null);
      await loadComments();
      onComment?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comment failed');
    } finally {
      setSending(false);
    }
  };

  const toggleCommentLike = async (id: number) => {
    if (!requireAuth(navigate)) return;
    setComments((list) =>
      list.map((comment) =>
        comment.id === id
          ? {
              ...comment,
              is_liked: !comment.is_liked,
              like_count: Math.max(0, comment.like_count + (comment.is_liked ? -1 : 1)),
            }
          : comment,
      ),
    );
    await apiFetch('/comments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadComments();
  };

  if (!post || !current) return null;

  const caption = language === 'kh' ? post.caption_kh : post.caption_en;
  const isVideo = current.media_type === 'video';

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className={`post-viewer media-only-viewer ${orientation} ${isVideo ? 'showing-video' : 'showing-photo'} ${
          isFullscreen ? 'is-fullscreen' : ''
        } ${deviceLandscape ? 'device-landscape' : ''} ${chromeVisible ? 'chrome-visible' : 'chrome-hidden'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onPointerMove={showChrome}
      >
        <button className="viewer-close viewer-chrome" onClick={onClose} aria-label="Close viewer">
          <X />
        </button>
        <button
          className="viewer-fullscreen viewer-chrome"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 /> : <Maximize2 />}
        </button>

        <section className="viewer-media-stage" onTouchStart={onMediaTouchStart} onTouchEnd={onMediaTouchEnd}>
          {isVideo ? (
            <video
              key={current.media_url}
              ref={videoRef}
              src={current.media_url}
              autoPlay
              muted={muted}
              controls={orientation === 'landscape'}
              playsInline
              onLoadedMetadata={(event) =>
                detectOrientation(event.currentTarget.videoWidth, event.currentTarget.videoHeight)
              }
              onPlay={() => setPaused(false)}
              onPause={() => setPaused(true)}
              onClick={onVideoClick}
            />
          ) : (
            <img
              key={current.media_url}
              src={current.media_url}
              alt={post.location_name}
              onLoad={(event) =>
                detectOrientation(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
              }
              onClick={showChrome}
            />
          )}
          <div className="viewer-media-shade" />
          {isVideo && orientation === 'portrait' && paused && (
            <button className="viewer-play viewer-chrome" onClick={togglePlay}>
              <Play fill="currentColor" />
            </button>
          )}
          {media.length > 1 && (
            <>
              <button className="viewer-prev viewer-chrome" disabled={mediaIndex === 0} onClick={goPrev}>
                <ChevronLeft />
              </button>
              <button
                className="viewer-next viewer-chrome"
                disabled={mediaIndex === media.length - 1}
                onClick={goNext}
              >
                <ChevronRight />
              </button>
              <div className="viewer-dots viewer-chrome">
                {media.map((item, index) => (
                  <button
                    key={item.id}
                    className={mediaIndex === index ? 'active' : ''}
                    onClick={() => setMediaIndex(index)}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        <div className="viewer-meta-overlay viewer-chrome">
          <div className="viewer-overlay-author">
            <img src={post.author.avatar_url} alt="" />
            <div>
              <strong>
                {language === 'kh' && post.author.name_kh ? post.author.name_kh : post.author.name}
                {post.author.verified && <BadgeCheck />}
              </strong>
              <span>
                <MapPin /> {post.location_name}, {post.province}
              </span>
            </div>
            <button className={post.author.is_following ? 'following' : ''} onClick={() => onFollow(post.author.id)}>
              {post.author.is_following ? t('social.following') : t('social.follow')}
            </button>
          </div>
          <p>{caption}</p>
          <span>{post.hashtags}</span>
        </div>

        <div className="viewer-floating-actions viewer-chrome">
          {isVideo && orientation === 'portrait' && (
            <button onClick={() => setMuted((value) => !value)}>
              <span>{muted ? <VolumeX /> : <Volume2 />}</span>
              <b>{muted ? 'Sound' : 'On'}</b>
            </button>
          )}
          <LikeButton
            liked={Boolean(post.is_liked)}
            count={post.like_count}
            onToggle={() => onInteract(post.id, 'like')}
            variant="rail"
            size="lg"
            label={t('social.like')}
          />
          <button onClick={() => setCommentsOpen(true)} aria-label={t('social.comment')}>
            <span>
              <MessageCircle />
            </span>
            <b>
              <AnimatedNumber value={post.comment_count} />
            </b>
          </button>
          <button onClick={() => onInteract(post.id, 'share')} aria-label={t('social.share')}>
            <span>
              <Share2 />
            </span>
            <b>
              <AnimatedNumber value={post.share_count} />
            </b>
          </button>
          <button>
            <span>
              <Ellipsis />
            </span>
          </button>
        </div>

        {commentsOpen && (
          <button className="comment-drawer-backdrop" onClick={() => setCommentsOpen(false)} aria-label="Close comments" />
        )}
        <aside
          className={`viewer-comment-drawer ${commentsOpen ? 'open' : ''}`}
          onTouchStart={onDrawerTouchStart}
          onTouchEnd={onDrawerTouchEnd}
        >
          <header>
            <span className="comment-swipe-handle" />
            <div>
              <strong>{t('social.comments')}</strong>
              <span>{post.comment_count} community thoughts</span>
            </div>
            <button onClick={() => setCommentsOpen(false)} aria-label="Close comments">
              <X />
            </button>
          </header>
          <div className="viewer-comments">
            {loadingComments ? (
              <LoadingState compact />
            ) : comments.length === 0 ? (
              <div className="no-comments">
                <MessageCircle />
                <strong>{t('social.firstComment')}</strong>
              </div>
            ) : (
              comments.map((comment) => (
                <article key={comment.id}>
                  <img src={comment.avatar_url} alt="" />
                  <div>
                    <strong>{comment.author_name}</strong>
                    {comment.body && <p>{comment.body}</p>}
                    {comment.comment_type === 'emoji' && <div className="comment-emoji">{comment.asset_value}</div>}
                    {comment.comment_type === 'gif' && comment.asset_url && (
                      <img className="comment-gif" src={comment.asset_url} alt="GIF reaction" />
                    )}
                    <span>
                      {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <LikeButton
                        liked={Boolean(comment.is_liked)}
                        count={comment.like_count > 0 ? comment.like_count : undefined}
                        onToggle={() => toggleCommentLike(comment.id)}
                        variant="plain"
                        size="sm"
                        label="Like comment"
                      />
                      <button>Reply</button>
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
          {error && <div className="viewer-error">{error}</div>}
          <form className="comment-composer" onSubmit={submitComment}>
            <img src="/images/traveler-dara.jpg" alt="" />
            <div>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t('social.commentPlaceholder')}
              />
              <button type="button" onClick={() => setPicker((value) => (value === 'emoji' ? null : 'emoji'))}>
                <Smile />
              </button>
              <button
                type="button"
                className="gif-button"
                onClick={() => setPicker((value) => (value === 'gif' ? null : 'gif'))}
              >
                GIF
              </button>
              <button type="submit" disabled={sending || !draft.trim()}>
                <Send />
              </button>
              {picker && (
                <div className={`asset-picker ${picker}`}>
                  {assets
                    .filter((asset) => asset.asset_type === picker)
                    .map((asset) => (
                      <button key={asset.id} type="button" onClick={() => submitComment(undefined, asset)}>
                        {asset.asset_type === 'emoji' ? (
                          <span>{asset.asset_value}</span>
                        ) : (
                          <img src={asset.asset_url || ''} alt={asset.label} />
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </form>
        </aside>
      </motion.div>
    </AnimatePresence>
  );
}
