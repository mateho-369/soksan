import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Map, MapPin } from 'lucide-react';
import { apiFetch } from '../lib/http';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState } from '../components/States';
import type { Trip } from '../types';
import '../styles/discovery.css';

/**
 * Phase 6 — public share view of a trip list. Anyone with the link can
 * read a public trip; private trips 404 here.
 */
export default function TripPublic() {
  const { slug = '' } = useParams();
  const { t, language } = useLanguage();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    void apiFetch(`/trips/shared/${slug}`)
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setTrip(await res.json());
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <div className="trips-page trip-public">
      {loading ? (
        <LoadingState compact />
      ) : notFound || !trip ? (
        <div className="trips-empty">
          <Map size={26} />
          <h1>{t('trips.notFound')}</h1>
        </div>
      ) : (
        <>
          <div className="trips-heading">
            <span className="eyebrow">
              <Map size={14} /> {t('trips.sharedEyebrow')}
            </span>
            <h1>{trip.title}</h1>
            {trip.description && <p>{trip.description}</p>}
            <small>
              {t('trips.by')} {trip.owner?.name} · {trip.items_count} {t('trips.stops')}
            </small>
          </div>

          {trip.items && trip.items.length === 0 && <p className="trips-empty-note">{t('trips.noStops')}</p>}

          <ol className="trip-stops">
            {(trip.items || []).map((item, index) => (
              <li key={item.id} className="trip-stop">
                <span className="trip-stop-index">{index + 1}</span>
                <img src={item.post.media_url} alt="" loading="lazy" />
                <div>
                  <strong>{item.post.location_name}</strong>
                  <small>
                    <MapPin size={12} /> {item.post.province}
                  </small>
                  <p>{language === 'kh' ? item.post.caption_kh : item.post.caption_en}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
