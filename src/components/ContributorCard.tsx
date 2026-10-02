import { useEffect, useState } from 'react';
import { Award, Copy, Gift, Sprout } from 'lucide-react';
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
  const [copiedCode, setCopiedCode] = useState(false);

  const copyInvite = async () => {
    if (!summary?.referral_code) return;
    const invite = `${window.location.origin}/register?ref=${summary.referral_code}`;
    try {
      await navigator.clipboard.writeText(invite);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      /* clipboard unavailable — the code stays visible on the card */
    }
  };

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

      {summary.referral_code && (
        <div className="contributor-referral">
          <Gift size={14} />
          <div>
            <strong>{t('contributor.referralTitle')}</strong>
            <small>{t('contributor.referralHint')}</small>
          </div>
          <button type="button" onClick={() => void copyInvite()}>
            {copiedCode ? t('share.copied') : `${summary.referral_code}`}
            {!copiedCode && <Copy size={12} />}
          </button>
        </div>
      )}

      <small className="contributor-formula" title={t('contributor.formulaLabel')}>
        {summary.formula}
      </small>
    </section>
  );
}
