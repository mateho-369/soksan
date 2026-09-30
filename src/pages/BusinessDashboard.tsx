import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Zap, Store, MapPin, Phone, CalendarCheck2, Sparkles, TrendingUp } from 'lucide-react';
import { apiFetch } from '../lib/http';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState, ErrorState } from '../components/States';
import BakongPayModal from '../components/business/BakongPayModal';
import type { Business, LeadSummary } from '../types';
import '../styles/business.css';

/**
 * Phase 3 — owner dashboard. Shows the owner's business, its tier
 * (free Verified / paid Boosted) and subscription, with the Bakong KHQR
 * upgrade path. Lead analytics arrive in Phase 4 on the same layout.
 */
export default function BusinessDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upgrading, setUpgrading] = useState<Business | null>(null);
  const [leadSummaries, setLeadSummaries] = useState<Record<number, LeadSummary>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/businesses/mine');
      if (!res.ok) throw new Error('Your businesses could not be loaded');
      setBusinesses(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your businesses');
    } finally {
      setLoading(false);
    }
  }, []);

  // Phase 4: 7-day lead summaries load in the background per business —
  // they must never delay the dashboard itself.
  useEffect(() => {
    if (!businesses.length) return;
    let cancelled = false;
    void (async () => {
      const summaries: Record<number, LeadSummary> = {};
      await Promise.all(
        businesses.map(async (business) => {
          try {
            const summaryRes = await apiFetch(`/businesses/leads/summary?business_id=${business.id}`);
            if (summaryRes.ok) summaries[business.id] = await summaryRes.json();
          } catch {
            /* a missing summary is not fatal for the dashboard */
          }
        }),
      );
      if (!cancelled) setLeadSummaries(summaries);
    })();
    return () => {
      cancelled = true;
    };
  }, [businesses]);

  useEffect(() => {
    if (user) void load();
    else setLoading(false);
  }, [user, load]);

  if (!user) {
    return (
      <div className="business-page">
        <div className="business-gate">
          <Store size={28} />
          <h1>{t('business.dashboardTitle')}</h1>
          <p>{t('business.loginToManage')}</p>
          <Link className="business-submit" to="/login">
            {t('auth.loginAction')}
          </Link>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingState />;

  return (
    <div className="business-page">
      <div className="business-heading">
        <span className="eyebrow">
          <Store size={14} /> {t('business.ownerEyebrow')}
        </span>
        <h1>{t('business.dashboardTitle')}</h1>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && businesses.length === 0 && (
        <div className="business-gate">
          <Store size={28} />
          <h2>{t('business.noBusinessTitle')}</h2>
          <p>{t('business.noBusinessBody')}</p>
          <Link className="business-submit" to="/business/register">
            {t('business.registerAction')}
          </Link>
        </div>
      )}

      {businesses.map((business) => (
        <article key={business.id} className="business-card">
          <header className="business-card-head">
            <div>
              <h2>{business.name}</h2>
              {business.name_kh && <p className="business-name-kh">{business.name_kh}</p>}
            </div>
            <div className="business-badges">
              <span className={`business-status status-${business.status}`}>{t(`business.status.${business.status}`)}</span>
              {business.tier === 'boosted' ? (
                <span className="business-tier tier-boosted">
                  <Zap size={13} /> {t('business.tierBoosted')}
                </span>
              ) : (
                <span className="business-tier tier-verified">
                  <BadgeCheck size={13} /> {t('business.tierVerified')}
                </span>
              )}
            </div>
          </header>

          <dl className="business-facts">
            <div>
              <dt>
                <MapPin size={14} /> {t('business.placeLabel')}
              </dt>
              <dd>{business.place_name}</dd>
            </div>
            {business.phone && (
              <div>
                <dt>
                  <Phone size={14} /> {t('business.phoneLabel')}
                </dt>
                <dd>{business.phone}</dd>
              </div>
            )}
            <div>
              <dt>
                <CalendarCheck2 size={14} /> {t('business.subscriptionLabel')}
              </dt>
              <dd>
                {business.subscription?.status === 'active' && business.subscription.expires_at
                  ? `${t('business.boostedUntil')} ${new Date(business.subscription.expires_at).toLocaleDateString()}`
                  : t('business.noSubscription')}
              </dd>
            </div>
          </dl>

          {business.description && <p className="business-description">{business.description}</p>}

          {/* Phase 4 — lead tracking summary (last 7 days). */}
          {leadSummaries[business.id] && (
            <div className="business-leads">
              <h3>
                <TrendingUp size={15} /> {t('leads.title')}
              </h3>
              <div className="business-leads-grid">
                <span>
                  <strong>{leadSummaries[business.id].call}</strong> {t('leads.calls')}
                </span>
                <span>
                  <strong>{leadSummaries[business.id].message}</strong> {t('leads.messages')}
                </span>
                <span>
                  <strong>{leadSummaries[business.id].directions}</strong> {t('leads.directionsLabel')}
                </span>
                <span className="leads-total">
                  <strong>{leadSummaries[business.id].total}</strong> {t('leads.total')}
                </span>
              </div>
            </div>
          )}

          <footer className="business-card-actions">
            {business.tier !== 'boosted' && (
              <button type="button" className="business-submit" onClick={() => setUpgrading(business)}>
                <Sparkles size={15} /> {t('business.upgradeAction')}
              </button>
            )}
            <Link className="business-public-link" to={`/business/${business.id}`}>
              {t('leads.viewPublicPage')}
            </Link>
          </footer>
        </article>
      ))}

      <div className="business-extra">
        <Link to="/business/register">{t('business.registerAnother')}</Link>
      </div>

      {upgrading && (
        <BakongPayModal
          business={upgrading}
          onClose={() => setUpgrading(null)}
          onUpgraded={() => {
            setUpgrading(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
