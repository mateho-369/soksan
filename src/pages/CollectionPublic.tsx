import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FolderHeart, MapPin } from 'lucide-react';
import { apiFetch } from '../lib/http';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState } from '../components/States';
import type { Collection } from '../types';
import '../styles/community.css';

/** Phase 7 — public read view of one collection. */
export default function CollectionPublic() {
  const { slug = '' } = useParams();
  const { t, language } = useLanguage();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    void apiFetch(`/collections/${slug}`)
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setCollection(await res.json());
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <div className="collections-page">
      {loading ? (
        <LoadingState compact />
      ) : notFound || !collection ? (
        <div className="trips-empty">
          <FolderHeart size={26} />
          <h1>{t('collections.notFound')}</h1>
        </div>
      ) : (
        <>
          <div className="trips-heading">
            <span className="eyebrow">
              <FolderHeart size={14} /> {t('collections.sharedEyebrow')}
            </span>
            <h1>{collection.title}</h1>
            {collection.description && <p>{collection.description}</p>}
            <small>
              {t('collections.by')} {collection.owner?.name} · {collection.posts_count}{' '}
              {t('collections.places')}
            </small>
          </div>

          {collection.items && collection.items.length === 0 && (
            <p className="trips-empty-note">{t('collections.noPlaces')}</p>
          )}

          <ol className="trip-stops">
            {(collection.items || []).map((item, index) => (
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
