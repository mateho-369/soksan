import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Map, Plus, X } from 'lucide-react';
import { apiFetch } from '../../lib/http';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Post, Trip } from '../../types';

/**
 * Phase 6 — "Add to trip" picker. Lists the traveler's trip lists, lets
 * them create a new one inline, and adds the post (published posts only —
 * enforced by TripService). Every list is shareable via its slug link.
 */
export default function TripPicker({ post, onClose }: { post: Post; onClose: () => void }) {
  const { t } = useLanguage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadTrips = useCallback(async () => {
    const res = await apiFetch('/trips/mine');
    if (res.ok) setTrips(await res.json());
  }, []);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const addTo = async (tripId: number) => {
    setBusy(true);
    setError('');
    const res = await apiFetch(`/trips/${tripId}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: post.id }),
    });
    setBusy(false);
    if (res.ok) {
      setNotice(t('trips.addedNotice'));
      await loadTrips();
    } else {
      setError(t('trips.addFailed'));
    }
  };

  const createAndAdd = async () => {
    const title = newTitle.trim();
    if (title.length < 2) return;
    setBusy(true);
    setError('');
    const createRes = await apiFetch('/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!createRes.ok) {
      setBusy(false);
      setError(t('trips.createFailed'));
      return;
    }
    const trip = (await createRes.json()) as Trip;
    setNewTitle('');
    await addTo(trip.id);
  };

  return (
    <div className="trip-picker-backdrop" onClick={onClose}>
      <div
        className="trip-picker"
        role="dialog"
        aria-label={t('trips.pickerTitle')}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>
            <Map size={17} /> {t('trips.pickerTitle')}
          </h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t('common.close')}>
            <X size={17} />
          </button>
        </header>
        <p className="trip-picker-place">{post.location_name} · {post.province}</p>

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

        <ul className="trip-picker-list">
          {trips.map((trip) => (
            <li key={trip.id}>
              <div>
                <strong>{trip.title}</strong>
                <small>
                  {trip.items_count} {t('trips.stops')} ·{' '}
                  <Link to={`/trip/${trip.slug}`} onClick={onClose}>
                    {t('trips.shareLabel')}
                  </Link>
                </small>
              </div>
              <button type="button" disabled={busy} onClick={() => void addTo(trip.id)}>
                <Plus size={14} /> {t('trips.addHere')}
              </button>
            </li>
          ))}
          {trips.length === 0 && <li className="trip-picker-empty">{t('trips.noneYet')}</li>}
        </ul>

        <div className="trip-picker-create">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('trips.newPlaceholder')}
            aria-label={t('trips.newPlaceholder')}
          />
          <button type="button" disabled={busy || newTitle.trim().length < 2} onClick={() => void createAndAdd()}>
            {t('trips.createAndAdd')}
          </button>
        </div>
      </div>
    </div>
  );
}
