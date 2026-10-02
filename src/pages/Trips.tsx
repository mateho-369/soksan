import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Map, Share2, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/http';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState } from '../components/States';
import type { Trip } from '../types';
import '../styles/discovery.css';

/** Phase 6 — Trip Planner: the traveler's own lists, each shareable. */
export default function Trips() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/trips/mine');
    if (res.ok) setTrips(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void load();
    else setLoading(false);
  }, [user, load]);

  const share = async (trip: Trip) => {
    const url = `${window.location.origin}/trip/${trip.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(trip.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable — the link is still visible on the trip page */
    }
  };

  const remove = async (trip: Trip) => {
    const res = await apiFetch(`/trips/${trip.id}`, { method: 'DELETE' });
    if (res.ok) await load();
  };

  if (!user) {
    return (
      <div className="trips-page">
        <div className="trips-empty">
          <Map size={26} />
          <h1>{t('trips.title')}</h1>
          <p>{t('trips.signInPrompt')}</p>
          <Link className="trips-cta" to="/login">
            {t('auth.loginAction')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="trips-page">
      <div className="trips-heading">
        <span className="eyebrow">
          <Map size={14} /> {t('trips.eyebrow')}
        </span>
        <h1>{t('trips.title')}</h1>
        <p>{t('trips.subtitle')}</p>
      </div>

      {loading ? (
        <LoadingState compact />
      ) : trips.length === 0 ? (
        <p className="trips-empty-note">{t('trips.empty')}</p>
      ) : (
        <ul className="trips-list">
          {trips.map((trip) => (
            <li key={trip.id} className="trip-card">
              <div>
                <Link to={`/trip/${trip.slug}`}>
                  <strong>{trip.title}</strong>
                </Link>
                <small>
                  {trip.items_count} {t('trips.stops')}
                  {trip.is_public ? '' : ` · ${t('trips.privateTag')}`}
                </small>
              </div>
              <div className="trip-card-actions">
                <button type="button" onClick={() => void share(trip)}>
                  <Share2 size={14} /> {copied === trip.id ? t('trips.copied') : t('trips.share')}
                </button>
                <button type="button" className="danger" onClick={() => void remove(trip)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
