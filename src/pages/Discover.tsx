import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navigation, Search, ChevronDown, Star, MapPin, LocateFixed, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState, ErrorState } from '../components/States';
import type { Destination, Category } from '../types';

export default function Discover() {
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const query = searchParams.get('q') || '';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (query) params.set('search', query);
      const [destinationsRes, categoriesRes] = await Promise.all([
        fetch(`/api/destinations?${params}`),
        fetch('/api/categories'),
      ]);
      if (!destinationsRes.ok || !categoriesRes.ok) throw new Error('The map could not find its way.');
      const [destinationsData, categoriesData] = await Promise.all([destinationsRes.json(), categoriesRes.json()]);
      setDestinations(destinationsData);
      setCategories(categoriesData);
      if (destinationsData.length) {
        setSelectedId((current) =>
          current && destinationsData.some((d: Destination) => d.id === current) ? current : destinationsData[0].id,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load map');
    } finally {
      setLoading(false);
    }
  }, [query, category]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(() => destinations.find((d) => d.id === selectedId), [destinations, selectedId]);

  const DestinationList = () => (
    <div className="destination-list">
      {destinations.map((destination, index) => (
        <motion.button
          key={destination.id}
          className={`destination-card ${selectedId === destination.id ? 'selected' : ''}`}
          onClick={() => {
            setSelectedId(destination.id);
            setSheetOpen(false);
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <img src={destination.image_url} alt={destination.name} />
          <div className="destination-card-body">
            <div className="destination-meta">
              <span>
                {destination.category_icon} {destination.category.replace('-', ' ')}
              </span>
              <span>
                <Star size={13} fill="currentColor" /> {destination.rating}
              </span>
            </div>
            <h3>{language === 'kh' ? destination.name_kh : destination.name}</h3>
            <p>{language === 'kh' ? destination.description_kh : destination.description_en}</p>
            <div className="destination-footer">
              <span>
                <MapPin size={13} />
                {destination.province}
              </span>
              <strong>
                ${destination.budget_min} – ${destination.budget_max}
              </strong>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );

  return (
    <div className="discover-page">
      <aside className="discover-panel">
        <div className="discover-heading">
          <span className="eyebrow">
            <Navigation size={14} /> Curated discovery
          </span>
          <h1>{t('discoveryTitle')}</h1>
          <p>{t('discoverySubtitle')}</p>
        </div>
        <div className="discover-filters">
          <Search size={17} />
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter places">
            <option value="">{t('allPlaces')}</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.emoji} {language === 'kh' ? item.label_kh : item.label_en}
              </option>
            ))}
          </select>
          <ChevronDown size={16} />
        </div>
        <div className="result-count">
          <strong>{destinations.length}</strong> {t('nearby')}
          <span>{t('budget')} · USD</span>
        </div>
        {loading ? <LoadingState compact /> : error ? <ErrorState message={error} onRetry={load} /> : <DestinationList />}
      </aside>

      <section className="map-stage">
        <div className="map-topography" />
        <div className="map-label label-north">Preah Vihear</div>
        <div className="map-label label-center">Tonlé Sap</div>
        <div className="map-label label-east">Mondulkiri</div>
        <div className="map-label label-south">Gulf of Thailand</div>
        {destinations.map((destination) => (
          <button
            key={destination.id}
            className={`map-pin ${selectedId === destination.id ? 'selected' : ''}`}
            style={{ left: `${destination.map_x}%`, top: `${destination.map_y}%` }}
            onClick={() => setSelectedId(destination.id)}
            aria-label={destination.name}
          >
            <span>{destination.category_icon}</span>
            <i />
          </button>
        ))}
        <button className="locate-button">
          <LocateFixed size={19} /> <span>Near me</span>
        </button>
        {selected && (
          <motion.article
            key={selected.id}
            className="map-preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <img src={selected.image_url} alt="" />
            <div>
              <span>
                <Star size={13} fill="currentColor" /> {selected.rating} · {selected.reviews} reviews
              </span>
              <h3>{language === 'kh' ? selected.name_kh : selected.name}</h3>
              <p>
                {selected.province} · ${selected.budget_min}–${selected.budget_max}
              </p>
            </div>
            <button aria-label="Close" onClick={() => setSelectedId(null)}>
              <X size={17} />
            </button>
          </motion.article>
        )}
        <button className="mobile-sheet-trigger" onClick={() => setSheetOpen(true)}>
          <span />
          <strong>
            {destinations.length} {t('nearby')}
          </strong>
          <small>Swipe up to explore</small>
        </button>
        <div className={`mobile-destination-sheet ${sheetOpen ? 'open' : ''}`}>
          <button className="sheet-handle" onClick={() => setSheetOpen(false)}>
            <span />
          </button>
          <div className="sheet-title">
            <div>
              <strong>{t('discoveryTitle')}</strong>
              <small>
                {destinations.length} {t('nearby')}
              </small>
            </div>
            <button onClick={() => setSheetOpen(false)}>
              <X />
            </button>
          </div>
          {loading ? <LoadingState compact /> : <DestinationList />}
        </div>
      </section>
    </div>
  );
}
