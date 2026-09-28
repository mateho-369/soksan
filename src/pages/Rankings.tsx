import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Star, ChartColumn, MapPin, BadgeCheck, CalendarCheck, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState, ErrorState } from '../components/States';
import type { RankFilter, RankProvince } from '../types';

export default function Rankings() {
  const { language, t } = useLanguage();
  const [filters, setFilters] = useState<RankFilter[]>([]);
  const [provinces, setProvinces] = useState<RankProvince[]>([]);
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/rankings${activeFilter ? `?filter=${activeFilter}` : ''}`);
      if (!res.ok) throw new Error('Province rankings are resting for a moment.');
      const data = await res.json();
      setFilters(data.filters);
      setProvinces(data.provinces);
      if (!activeFilter) setActiveFilter(data.active_filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load rankings');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rankings-page page-shell">
      <section className="ranking-hero">
        <div>
          <span className="eyebrow">
            <Trophy /> Community discovery index
          </span>
          <h1>{t('rankingTitle')}</h1>
          <p>{t('rankingSub')}</p>
        </div>
        <div className="ranking-hero-stat">
          <TrendingUp />
          <span>Updated from live community signals</span>
        </div>
      </section>

      <div className="ranking-tabs">
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={activeFilter === filter.slug ? 'active' : ''}
            onClick={() => setActiveFilter(filter.slug)}
          >
            <span>{filter.emoji}</span>
            {language === 'kh' ? filter.label_kh : filter.label_en}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <section className="province-leaderboard">
          {provinces.map((province, index) => (
            <motion.article
              key={province.id}
              className="province-rank-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <div className="province-rank-summary">
                <div className="rank-number">{String(province.rank).padStart(2, '0')}</div>
                <div className="province-icon">
                  <span>{province.icon}</span>
                </div>
                <div>
                  <span>Trending +{province.weekly_growth}% this week</span>
                  <h2>{language === 'kh' ? province.name_kh : province.name}</h2>
                  <div className="province-metrics">
                    <span>
                      <Star fill="currentColor" /> {Number(province.rating).toFixed(1)} stars
                    </span>
                    <span>
                      <ChartColumn /> {(province.explorers / 1000).toFixed(1)}K Explorers
                    </span>
                  </div>
                </div>
                <img src={province.image_url} alt="" />
              </div>
              <div className="top-spots-scroller">
                {province.spots.map((spot) => (
                  <div key={spot.id} className="ranked-spot">
                    <img src={spot.image_url} alt="" />
                    <div className="ranked-spot-overlay" />
                    <div className="ranked-spot-copy">
                      <span>
                        <MapPin /> {spot.category.replace('-', ' ')}
                      </span>
                      <strong>{language === 'kh' ? spot.name_kh : spot.name}</strong>
                      <small>
                        <Star fill="currentColor" /> {spot.rating} · from ${spot.price}
                      </small>
                    </div>
                    {spot.fast_booking && (
                      <div className="fast-booking">
                        <BadgeCheck /> Fast book
                      </div>
                    )}
                    <button>
                      <CalendarCheck /> Book <ArrowUpRight />
                    </button>
                  </div>
                ))}
              </div>
            </motion.article>
          ))}
        </section>
      )}
    </div>
  );
}
