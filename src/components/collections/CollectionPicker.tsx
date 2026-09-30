import { useCallback, useEffect, useState } from 'react';
import { FolderHeart, Plus, X } from 'lucide-react';
import { apiFetch } from '../../lib/http';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Collection, Post } from '../../types';
import '../../styles/community.css';

/**
 * Phase 7 — "Collect" picker. Public collections only contain published
 * posts (enforced by CollectionService); owners manage their own lists.
 */
export default function CollectionPicker({ post, onClose }: { post: Post; onClose: () => void }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<Collection[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await apiFetch('/collections/mine');
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addTo = async (collectionId: number) => {
    setBusy(true);
    setError('');
    const res = await apiFetch(`/collections/${collectionId}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: post.id }),
    });
    setBusy(false);
    if (res.ok) {
      setNotice(t('collections.addedNotice'));
      await load();
    } else {
      setError(t('collections.addFailed'));
    }
  };

  const createAndAdd = async () => {
    const title = newTitle.trim();
    if (title.length < 2) return;
    setBusy(true);
    setError('');
    const res = await apiFetch('/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      setBusy(false);
      setError(t('collections.createFailed'));
      return;
    }
    const created = (await res.json()) as Collection;
    setNewTitle('');
    await addTo(created.id);
  };

  return (
    <div className="collection-picker-backdrop" onClick={onClose}>
      <div
        className="collection-picker"
        role="dialog"
        aria-label={t('collections.pickerTitle')}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>
            <FolderHeart size={17} /> {t('collections.pickerTitle')}
          </h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t('common.close')}>
            <X size={17} />
          </button>
        </header>

        {notice && (
          <p className="trip-notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="trip-error" role="alert">
            {error}
          </p>
        )}

        <ul className="collection-picker-list">
          {items.map((collection) => (
            <li key={collection.id}>
              <div>
                <strong>{collection.title}</strong>
                <small>
                  {collection.posts_count} {t('collections.places')}
                </small>
              </div>
              <button type="button" disabled={busy} onClick={() => void addTo(collection.id)}>
                <Plus size={14} /> {t('collections.addHere')}
              </button>
            </li>
          ))}
          {items.length === 0 && <li>{t('collections.noneYet')}</li>}
        </ul>

        <div className="collection-picker-create">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('collections.newPlaceholder')}
            aria-label={t('collections.newPlaceholder')}
          />
          <button type="button" disabled={busy || newTitle.trim().length < 2} onClick={() => void createAndAdd()}>
            {t('collections.createAndAdd')}
          </button>
        </div>
      </div>
    </div>
  );
}
