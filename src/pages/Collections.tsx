import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderHeart } from 'lucide-react';
import { apiFetch } from '../lib/http';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState } from '../components/States';
import type { Collection } from '../types';
import '../styles/community.css';

/** Phase 7 — public Collections: browse everyone's curated places. */
export default function Collections() {
  const { user, requireAuth } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/collections');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!requireAuth(navigate)) return;
    const res = await apiFetch('/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (res.ok) {
      setTitle('');
      await load();
    }
  };

  return (
    <div className="collections-page">
      <div className="trips-heading">
        <span className="eyebrow">
          <FolderHeart size={14} /> {t('collections.eyebrow')}
        </span>
        <h1>{t('collections.title')}</h1>
        <p>{t('collections.subtitle')}</p>
      </div>

      {user && (
        <div className="collections-new">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('collections.newPlaceholder')}
            aria-label={t('collections.newPlaceholder')}
          />
          <button type="button" disabled={title.trim().length < 2} onClick={() => void create()}>
            {t('collections.create')}
          </button>
        </div>
      )}

      {loading ? (
        <LoadingState compact />
      ) : items.length === 0 ? (
        <p className="trips-empty-note">{t('collections.empty')}</p>
      ) : (
        <div className="collections-grid">
          {items.map((collection) => (
            <Link key={collection.id} className="collection-card" to={`/collection/${collection.slug}`}>
              <strong>{collection.title}</strong>
              {collection.description && <small>{collection.description}</small>}
              <small>
                {collection.posts_count} {t('collections.places')} · {t('collections.by')}{' '}
                {collection.owner?.name}
              </small>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
