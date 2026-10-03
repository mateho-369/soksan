import { useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import { drawSharePoster } from '../lib/sharePoster';
import { useLanguage } from '../contexts/LanguageContext';
import type { Post } from '../types';
import '../styles/growth.css';

/**
 * Phase 8 — branded share postcard. A visual card in brand colors with a
 * deep link; copy the link or download the PNG. No tracking pixels, ever.
 */
export default function ShareCard({ post, onClose }: { post: Post; onClose: () => void }) {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const link = `${window.location.origin}/post/${post.id}`;
  const caption = language === 'kh' ? post.caption_kh : post.caption_en;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the link is visible in the card */
    }
  };

  const download = async () => {
    setDownloading(true);
    const dataUrl = await drawSharePoster(post, caption, post.author.name);
    setDownloading(false);
    if (!dataUrl) return;
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `soksan-${post.id}.png`;
    anchor.click();
  };

  return (
    <div className="share-card-backdrop" onClick={onClose}>
      <div
        className="share-card"
        role="dialog"
        aria-label={t('share.title')}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{t('share.title')}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t('common.close')}>
            <X size={17} />
          </button>
        </header>

        {/* The postcard itself — brand colors, no third-party pixels. */}
        <div className="postcard">
          <div className="postcard-band">
            <strong>SokSan Network</strong>
            <span>សុខសាន្ត · {t('share.tagline')}</span>
          </div>
          <div className="postcard-media">
            {post.media_url && <img src={post.media_url} alt="" />}
          </div>
          <div className="postcard-body">
            <strong>{post.location_name}</strong>
            <p>{caption.length > 110 ? `${caption.slice(0, 110)}…` : caption}</p>
            <small>
              {post.author.name} · {post.province}
            </small>
            <code>{link}</code>
          </div>
        </div>

        <div className="share-card-actions">
          <button type="button" onClick={() => void copy()}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? t('share.copied') : t('share.copyLink')}
          </button>
          <button type="button" disabled={downloading} onClick={() => void download()}>
            <Download size={15} /> {downloading ? t('share.preparing') : t('share.download')}
          </button>
        </div>
        <small className="share-card-note">{t('share.badgeNote')}</small>
      </div>
    </div>
  );
}
