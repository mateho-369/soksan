import { useState } from 'react';
import { HardDriveDownload, Trash2, WifiOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { offlineEntries, removeOffline } from '../lib/offlineStore';
import '../styles/discovery.css';

/**
 * Phase 6 — offline shelf. Everything here was saved explicitly by the
 * traveler and is rendered from on-device storage only: no network call,
 * so the page keeps working with zero connectivity.
 */
export default function OfflineLibrary() {
  const { t, language } = useLanguage();
  const [entries, setEntries] = useState(offlineEntries);

  const drop = (postId: number) => {
    removeOffline(postId);
    setEntries(offlineEntries());
  };

  return (
    <div className="trips-page offline-page">
      <div className="trips-heading">
        <span className="eyebrow">
          <HardDriveDownload size={14} /> {t('offline.eyebrow')}
        </span>
        <h1>{t('offline.title')}</h1>
        <p>{t('offline.subtitle')}</p>
      </div>

      {entries.length === 0 ? (
        <div className="trips-empty">
          <WifiOff size={26} />
          <p>{t('offline.empty')}</p>
        </div>
      ) : (
        <ul className="offline-list">
          {entries.map(({ post, saved_at }) => (
            <li key={post.id} className="offline-card">
              <img src={post.media_url} alt="" loading="lazy" />
              <div>
                <strong>{post.location_name}</strong>
                <small>
                  {post.province} · {t('offline.savedAt')}{' '}
                  {new Date(saved_at).toLocaleDateString()}
                </small>
                <p>{language === 'kh' ? post.caption_kh : post.caption_en}</p>
              </div>
              <button
                type="button"
                className="danger"
                onClick={() => drop(post.id)}
                aria-label={t('offline.remove')}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
