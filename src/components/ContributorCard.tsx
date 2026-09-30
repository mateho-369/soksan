import { useEffect, useState } from 'react';
import { Award, Sprout } from 'lucide-react';
import { apiFetch } from '../lib/http';
import { useLanguage } from '../contexts/LanguageContext';
import type { ContributorSummary } from '../types';
import '../styles/community.css';

/**
 * Phase 7 — contributor level & badges. Everything is derived live from the
 * traveler's published posts with a transparent formula (shown verbatim),
 * never stored and never coupled to ranking.
 */
export default function ContributorCard() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<ContributorSummary | null>(null);

  useEffect(() => {
    let alive = true;
    void apiFetch('/contributors/me')
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as ContributorSummary;
        if (alive) setSummary(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!summary) return null;

  const progress = summary.next_level
    ? Math.min(
        100,
        Math.round(
          ((summary.quality_points - summary.level.floor) /
            (summary.next_level.floor - summary.level.floor)) *
            100,
        ),
      )
    : 100;

  return (
    <section className="contributor-card" aria-label={t('contributor.title')}>
      <header>
        <Sprout size={15} />
        <strong>{t('contributor.title')}</strong>
        <span className={`contributor-level level-${summary.level.key}`}>{summary.level.label}</span>
      </header>

      <div className="contributor-meter" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${progress}%` }} />
      </div>
      <p className="contributor-points">
        <Award size={13} /> {summary.quality_points} {t('contributor.points')}
        {summary.next_level && (
          <small>
            {' '}
            · {summary.next_level.floor - Math.round(summary.quality_points)}{' '}
            {t('contributor.toNext')} {summary.next_level.label}
          </small>
        )}
      </p>

      {summary.badges.length > 0 && (
        <ul className="contributor-badges">
          {summary.badges.map((badge) => (
            <li key={badge}>{t(`contributor.badge.${badge}`)}</li>
          ))}
        </ul>
      )}

      <small className="contributor-formula" title={t('contributor.formulaLabel')}>
        {summary.formula}
      </small>
    </section>
  );
}
