import { apiFetch } from '../lib/http';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Navigation,
  Search,
  ChevronDown,
  Star,
  MapPin,
  LocateFixed,
  X,
  Users,
  Hash,
  Map as MapIcon,
  BadgeCheck,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ErrorState, EmptyState } from '../components/States';
import { DestinationListSkeleton } from '../ui/Skeleton';
import SokSanMap from '../components/map/SokSanMap';
import TrendingRail from '../components/TrendingRail';
import { isInsideCambodia, type LatLng } from '../lib/mapConfig';
import type { Destination, Category } from '../types';

type SearchTab = 'locations' | 'users' | 'tags' | 'map';

interface DestinationListProps {
  destinations: Destination[];
  selectedId: number | null;
  language: 'en' | 'kh';
  onSelect: (id: number) => void;
}

const DISCOVER_CREATORS = [
  {
    id: 1,
    name: 'Dara Sok',
    name_kh: 'សុខ ដារ៉ា',
    handle: '@dara.sok',
    province: 'Kampot & Kep',
    specialty: 'Coastal hikes, hidden lagoons & river stays',
    avatar_url: '/images/traveler-dara.jpg',
    followers: '12.4k',
  },
  {
    id: 2,
    name: 'Malis Chea',
    name_kh: 'ម៉ាលីស ជា',
    handle: '@malis.chea',
    province: 'Koh Rong & Preah Sihanouk',
    specialty: 'Island boat routes & reef conservation',
    avatar_url: '/images/guide-sokha.jpg',
    followers: '8.9k',
  },
  {
    id: 3,
    name: 'Vannak Chhim',
    name_kh: 'វណ្ណៈ ឈឹម',
    handle: '@vannak.coffee',
    province: 'Mondulkiri & Ratanakiri',
    specialty: 'Highland specialty coffee & cloud valleys',
    avatar_url: '/images/creator-nary.jpg',
    followers: '6.2k',
  },
  {
    id: 4,
    name: 'Sophea Meas',
    name_kh: 'សុភា មាស',
    handle: '@sophea.explore',
    province: 'Siem Reap & Battambang',
    specialty: 'Quiet temple trails & heritage architecture',
    avatar_url: '/images/creator-rith.jpg',
    followers: '15.1k',
  },
];

const DISCOVER_TAGS = [
  { tag: 'KohRong', label_kh: '#កោះរ៉ុង', count: '2,410 stories', category: 'island-beaches' },
  { tag: 'KampotPepper', label_kh: '#ម្រេចកំពត', count: '1,840 stories', category: 'local-food' },
  { tag: 'SiemReapSunrise', label_kh: '#ថ្ងៃរះសៀមរាប', count: '3,120 stories', category: 'temples-culture' },
  { tag: 'MondulkiriMist', label_kh: '#អ័ព្ទមណ្ឌលគិរី', count: '940 stories', category: 'aesthetic-cafes' },
  { tag: 'HiddenGemsKH', label_kh: '#តំបន់លាក់ខ្លួន', count: '4,290 stories', category: '' },
  { tag: 'PhnomPenhCafes', label_kh: '#កាហ្វេភ្នំពេញ', count: '1,530 stories', category: 'aesthetic-cafes' },
];

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState<(LatLng & { token: number }) | null>(null);

  const query = searchParams.get('q') || '';
  const initialTab = (searchParams.get('tab') as SearchTab) || 'locations';
  const [activeTab, setActiveTab] = useState<SearchTab>(
    ['locations', 'users', 'tags', 'map'].includes(initialTab) ? initialTab : 'locations',
  );
  const [searchDraft, setSearchDraft] = useState(query);

  useEffect(() => {
    setSearchDraft(query);
  }, [query]);

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

  const submitEngineSearch = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    const trimmed = searchDraft.trim();
    if (trimmed) next.set('q', trimmed);
    else next.delete('q');
    setSearchParams(next);
  };

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

  const filteredCreators = useMemo(() => {
    if (!query) return DISCOVER_CREATORS;
    const lower = query.toLowerCase();
    return DISCOVER_CREATORS.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.handle.toLowerCase().includes(lower) ||
        c.province.toLowerCase().includes(lower),
    );
  }, [query]);

  const filteredTags = useMemo(() => {
    if (!query) return DISCOVER_TAGS;
    const lower = query.toLowerCase().replace(/^#/, '');
    return DISCOVER_TAGS.filter((item) => item.tag.toLowerCase().includes(lower));
  }, [query]);

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
    <div className={`discover-page ${activeTab === 'map' ? 'map-expanded-mode' : ''}`}>
      <aside className="discover-panel">
        <div className="discover-heading">
          <span className="eyebrow">
            <Navigation size={14} /> Curated discovery
          </span>
          <h1>{t('discoveryTitle')}</h1>
          <p>{t('discoverySubtitle')}</p>
        </div>

        {/* Search Engine Bar & Tab Switcher (Locations, Users, Tags, Map) */}
        <form className="search-engine-bar" onSubmit={submitEngineSearch} role="search" aria-label="Discover search">
          <Search size={16} aria-hidden="true" />
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder={
              language === 'kh'
                ? 'ស្វែងរកទីតាំង អ្នកបង្កើត ឬ #ស្លាក...'
                : 'Search locations, @users, or #tags...'
            }
            aria-label="Search destinations, users, or tags"
          />
          {searchDraft && (
            <button
              type="button"
              className="search-engine-clear"
              aria-label="Clear filter query"
              onClick={() => {
                setSearchDraft('');
                const next = new URLSearchParams(searchParams);
                next.delete('q');
                setSearchParams(next);
              }}
            >
              <X size={14} />
            </button>
          )}
        </form>

        <div className="search-engine-tabs" role="tablist" aria-label="Search categories">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'locations'}
            className={activeTab === 'locations' ? 'active' : ''}
            onClick={() => setActiveTab('locations')}
          >
            <MapPin size={14} />
            <span>{language === 'kh' ? 'ទីតាំង' : 'Locations'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'users'}
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            <Users size={14} />
            <span>{language === 'kh' ? 'អ្នកប្រើប្រាស់' : 'Users'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tags'}
            className={activeTab === 'tags' ? 'active' : ''}
            onClick={() => setActiveTab('tags')}
          >
            <Hash size={14} />
            <span>{language === 'kh' ? 'ស្លាក' : 'Tags'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'map'}
            className={activeTab === 'map' ? 'active' : ''}
            onClick={() => setActiveTab('map')}
          >
            <MapIcon size={14} />
            <span>{language === 'kh' ? 'ផែនទី' : 'Map'}</span>
          </button>
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

        {activeTab === 'users' && (
          <div className="search-engine-results-panel" aria-label="Matching users">
            {filteredCreators.map((creator) => (
              <Link to="/profile" key={creator.id} className="search-creator-card">
                <img src={creator.avatar_url} alt="" />
                <div>
                  <strong>
                    {language === 'kh' ? creator.name_kh : creator.name} <BadgeCheck size={14} />
                  </strong>
                  <span>
                    {creator.handle} · {creator.province}
                  </span>
                  <small>{creator.specialty}</small>
                </div>
                <b>{creator.followers}</b>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="search-engine-tags-panel" aria-label="Matching hashtags">
            {filteredTags.map((item) => (
              <button
                type="button"
                key={item.tag}
                className="search-tag-row"
                onClick={() => {
                  if (item.category) setCategory(item.category);
                  setActiveTab('locations');
                }}
              >
                <span className="search-tag-icon">#</span>
                <div>
                  <strong>#{item.tag}</strong>
                  <small>{item.label_kh}</small>
                </div>
                <b>{item.count}</b>
              </button>
            ))}
          </div>
        )}

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
              <strong>
                {destinations.length} {t('nearby')}
              </strong>
              <span>{t('discoverySubtitle')}</span>
            </div>
            <button type="button" onClick={() => setSheetOpen(false)}>
              Done
            </button>
          </div>
          {loading ? (
            <DestinationListSkeleton count={3} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
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
