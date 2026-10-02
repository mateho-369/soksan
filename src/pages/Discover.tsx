import { apiFetch } from '../lib/http';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navigation, Search, ChevronDown, Star, MapPin, LocateFixed, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ErrorState, EmptyState } from '../components/States';
import { DestinationListSkeleton } from '../ui/Skeleton';
import SokSanMap from '../components/map/SokSanMap';
import TrendingRail from '../components/TrendingRail';
import { isInsideCambodia, type LatLng } from '../lib/mapConfig';
import type { Destination, Category } from '../types';

interface DestinationListProps {
  destinations: Destination[];
  selectedId: number | null;
  language: 'en' | 'kh';
  onSelect: (id: number) => void;
}

function DestinationList({ destinations, selectedId, language, onSelect }: DestinationListProps) {
  return (
    <div className="destination-list">
      {destinations.map((destination, index) => (
        <motion.button
          type="button"
          key={destination.id}
          className={`destination-card ${selectedId === destination.id ? 'selected' : ''}`}
          onClick={() => onSelect(destination.id)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
        >
          <img src={destination.image_url} alt={destination.name} loading="lazy" />
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
}

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
  const [focus, setFocus] = useState<(LatLng & { token: number }) | null>(null);

  const query = searchParams.get('q') || '';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (query) params.set('search', query);
      const [destinationsRes, categoriesRes] = await Promise.all([
        apiFetch(`/destinations?${params}`),
        apiFetch('/categories'),
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

  const mapPins = useMemo(
    () =>
      destinations.map((destination) => ({
        id: destination.id,
        lat: destination.lat,
        lng: destination.lng,
        label: language === 'kh' ? destination.name_kh : destination.name,
        icon: destination.category_icon,
      })),
    [destinations, language],
  );

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (!isInsideCambodia(point)) return;
        setFocus({ ...point, token: Date.now() });
      },
      () => {
        /* permission denied — leave the map where it is */
      },
    );
  };

  const destinationList = (
    <DestinationList
      destinations={destinations}
      selectedId={selectedId}
      language={language}
      onSelect={(id) => {
        setSelectedId(id);
        setSheetOpen(false);
      }}
    />
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
        {/* Phase 6 — recency-weighted hot posts, refreshed per visit. */}
        <TrendingRail />
        <div className="discover-filters">
          <Search size={17} aria-hidden="true" />
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter places">
            <option value="">{t('allPlaces')}</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.emoji} {language === 'kh' ? item.label_kh : item.label_en}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </div>
        <div className="result-count">
          <strong>{destinations.length}</strong> {t('nearby')}
          <span>{t('budget')} · USD</span>
        </div>
        {loading ? (
          <DestinationListSkeleton count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : destinations.length === 0 ? (
          <EmptyState title={t('discovery.empty')} body={t('discovery.emptyHelp')} />
        ) : (
          destinationList
        )}
      </aside>

      <section className="map-stage">
        <SokSanMap
          className="discover-map"
          pins={mapPins}
          selectedId={selectedId}
          onPinClick={(id) => setSelectedId(Number(id))}
          focus={focus}
          ariaLabel={t('map.discoverLabel')}
        />
        <button type="button" className="locate-button" onClick={locateMe}>
          <LocateFixed size={18} /> <span>Near me</span>
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
            <button type="button" aria-label="Close" onClick={() => setSelectedId(null)}>
              <X size={17} />
            </button>
          </motion.article>
        )}
        <button
          type="button"
          className="mobile-sheet-trigger"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
        >
          <span aria-hidden="true" />
          <strong>
            {destinations.length} {t('nearby')}
          </strong>
          <small>Swipe up to explore</small>
        </button>
        {sheetOpen && (
          <button
            type="button"
            className="mobile-sheet-backdrop"
            aria-label="Close destinations list"
            onClick={() => setSheetOpen(false)}
          />
        )}
        <div className={`mobile-destination-sheet ${sheetOpen ? 'open' : ''}`}>
          <button
            type="button"
            className="sheet-handle"
            aria-label="Collapse sheet"
            onClick={() => setSheetOpen(false)}
          >
            <span aria-hidden="true" />
          </button>
          <div className="sheet-title">
            <div>
              <strong>{t('discoveryTitle')}</strong>
              <small>
                {destinations.length} {t('nearby')}
              </small>
            </div>
            <button type="button" aria-label="Close places sheet" onClick={() => setSheetOpen(false)}>
              <X size={17} />
            </button>
          </div>
          {loading ? (
            <DestinationListSkeleton count={3} />
          ) : destinations.length === 0 ? (
            <EmptyState title={t('discovery.empty')} body={t('discovery.emptyHelp')} />
          ) : (
            destinationList
          )}
        </div>
      </section>
    </div>
  );
}
