import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, MapPin, MessageCircle, Navigation, Phone, Zap } from 'lucide-react';
import { apiFetch } from '../lib/http';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState, ErrorState } from '../components/States';
import SokSanMap from '../components/map/SokSanMap';
import type { Business, LeadEventType } from '../types';
import '../styles/business.css';

/**
 * Phase 4 — public business profile. The three action buttons (Call,
 * Message, Directions) each log a lead event so owners can see demand.
 * Boosted businesses show a clearly-labeled paid badge; the badge never
 * changes where the business appears in organic ranking.
 */
export default function BusinessProfile() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiFetch(`/businesses/profile?id=${encodeURIComponent(id || '')}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Business not found');
        if (!cancelled) setBusiness(data as Business);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load this business');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const logLead = useCallback(
    (eventType: LeadEventType) => {
      if (!business) return;
      void apiFetch('/businesses/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: business.id, event_type: eventType }),
      });
    },
    [business],
  );

  if (loading) return <LoadingState />;
  if (error || !business) return <ErrorState message={error || 'Business not found'} />;

  const directionsUrl =
    business.lat != null && business.lng != null
      ? `https://www.openstreetmap.org/directions?to=${business.lat}%2C${business.lng}`
      : null;

  return (
    <div className="business-page business-profile">
      <article className="business-card">
        <header className="business-card-head">
          <div>
            <h1 className="business-profile-name">{business.name}</h1>
            {business.name_kh && <p className="business-name-kh">{business.name_kh}</p>}
          </div>
          <div className="business-badges">
            {business.tier === 'boosted' ? (
              <span className="business-tier tier-boosted" title={t('leads.boostedHint')}>
                <Zap size={13} /> {t('business.tierBoosted')} · {t('common.sponsored')}
              </span>
            ) : (
              <span className="business-tier tier-verified">
                <BadgeCheck size={13} /> {t('business.tierVerified')}
              </span>
            )}
          </div>
        </header>

        {business.description && <p className="business-description">{business.description}</p>}

        <p className="business-profile-place">
          <MapPin size={15} /> {business.place_name}
        </p>

        {business.lat != null && business.lng != null && (
          <div className="business-profile-map">
            <SokSanMap
              pins={[
                {
                  id: business.id,
                  lat: business.lat,
                  lng: business.lng,
                  label: business.name,
                  icon: '🏪',
                },
              ]}
              selectedId={business.id}
              fitToPins={false}
              center={[business.lng, business.lat]}
              zoom={13}
              ariaLabel={`${business.name} — ${t('business.placeLabel')}`}
            />
          </div>
        )}

        <div className="business-lead-actions">
          <a
            className="lead-button"
            href={business.phone ? `tel:${business.phone.replace(/\s+/g, '')}` : '#'}
            onClick={() => logLead('call')}
            aria-label={t('leads.call')}
          >
            <Phone size={16} /> {t('leads.call')}
          </a>

          <button
            type="button"
            className="lead-button"
            onClick={() => {
              logLead('message');
              setMessageSent(true);
            }}
            aria-label={t('leads.message')}
          >
            <MessageCircle size={16} /> {t('leads.message')}
          </button>

          {directionsUrl ? (
            <a
              className="lead-button"
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => logLead('directions')}
              aria-label={t('leads.directions')}
            >
              <Navigation size={16} /> {t('leads.directions')}
            </a>
          ) : null}
        </div>

        {messageSent && (
          <p className="lead-thanks" role="status">
            {t('leads.messageSent')}
          </p>
        )}
        {business.phone && <p className="business-profile-phone">{business.phone}</p>}
      </article>

      <p className="business-profile-back">
        <Link to="/discover">{t('leads.backToDiscover')}</Link>
      </p>
    </div>
  );
}
