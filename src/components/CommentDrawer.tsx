import { useCallback, useEffect, useRef, useState, type FormEvent, type TouchEvent } from 'react';
import { X, MessageCircle, Smile, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState } from './States';
import type { Post, Comment, CommentAsset } from '../types';

interface CommentDrawerProps {
  post: Post | null;
  open: boolean;
  onClose: () => void;
  onComment?: (postId: number) => void;
}

export default function CommentDrawer({ post, open, onClose, onComment }: CommentDrawerProps) {
  const { t } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [assets, setAssets] = useState<CommentAsset[]>([]);
  const [draft, setDraft] = useState('');
  const [picker, setPicker] = useState<'emoji' | 'gif' | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const loadComments = useCallback(async () => {
    if (!post) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?post_id=${post.id}`);
      if (!res.ok) throw new Error('Could not load comments');
      const data = await res.json();
      setComments(data.comments);
      setAssets(data.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load comments');
    } finally {
      setLoading(false);
    }
  }, [post]);

  useEffect(() => {
    if (open) loadComments();
    else {
      setPicker(null);
      setDraft('');
    }
  }, [open, loadComments]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const submit = async (event?: FormEvent, asset?: CommentAsset) => {
    event?.preventDefault();
    if (!post || (!draft.trim() && !asset)) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id, body: draft, asset_id: asset?.id || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Comment failed');
      setDraft('');
      setPicker(null);
      await loadComments();
      onComment?.(post.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comment failed');
    } finally {
      setSending(false);
    }
  };

  const toggleLike = async (id: number) => {
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
    await fetch('/api/comments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadComments();
  };

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!touchRef.current) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchRef.current.x;
    const dy = touch.clientY - touchRef.current.y;
    if (dy > 70 && Math.abs(dy) > Math.abs(dx)) onClose();
    touchRef.current = null;
  };

  if (!post) return null;

  return (
    <>
      {open && (
        <button className="comment-drawer-backdrop clip-comment-backdrop" onClick={onClose} aria-label="Close comments" />
      )}
      <aside
        className={`viewer-comment-drawer clip-comment-drawer ${open ? 'open' : ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-hidden={!open}
      >
        <header>
          <span className="comment-swipe-handle" />
          <div>
            <strong>{t('social.comments')}</strong>
            <span>{post.comment_count} community thoughts</span>
          </div>
          <button onClick={onClose} aria-label="Close comments">
            <X />
          </button>
        </header>
        <div className="viewer-comments">
          {loading ? (
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
                    <button className={comment.is_liked ? 'liked' : ''} onClick={() => toggleLike(comment.id)}>
                      Like {comment.like_count > 0 && comment.like_count}
                    </button>
                    <button>Reply</button>
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
        {error && <div className="viewer-error">{error}</div>}
        <form className="comment-composer" onSubmit={submit}>
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
                    <button key={asset.id} type="button" onClick={() => submit(undefined, asset)}>
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
    </>
  );
}
