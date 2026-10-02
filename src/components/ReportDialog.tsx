import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/http';
import type { Post } from '../types';
import '../styles/moderation.css';

/** Phase 0 hardening — the closed reason list mirrors config/moderation.php. */
const REASONS = [
  'spam',
  'nudity',
  'violence',
  'scam',
  'private_location',
  'harassment',
  'illegal',
  'copyright',
  'fake_place',
  'other',
] as const;

type Reason = (typeof REASONS)[number];

/**
 * Report + safety dialog for a post. Reports go to POST /reports (the
 * reporter is never revealed to the author); block/mute hit the safety
 * endpoints. Every string is bilingual via the language context.
 */
export function ReportDialog({ post, onClose }: { post: Post; onClose: () => void }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error'>('success');
  const [reported, setReported] = useState(false);

  const submit = async () => {
    if (!reason || busy) return;
    setBusy(true);
    setMessage(null);
    const res = await apiFetch('/reports', {
      method: 'POST',
      body: JSON.stringify({
        reportable_type: 'post',
        reportable_id: post.id,
        reason,
        details: details.trim() || undefined,
      }),
    });
    setBusy(false);

    if (res.status === 201) {
      setReported(true);
      setTone('success');
      setMessage(t('moderation.success'));
      return;
    }
    if (res.status === 409) {
      setTone('error');
      setMessage(t('moderation.duplicate'));
      return;
    }
    if (res.status === 401) {
      setTone('error');
      setMessage(t('moderation.loginRequired'));
      return;
    }
    setTone('error');
    setMessage(t('moderation.failed'));
  };

  const safetyAction = async (kind: 'block' | 'mute') => {
    const res = await apiFetch(`/users/${post.author.id}/${kind}`, { method: 'POST' });
    if (res.ok) {
      setTone('success');
      setMessage(t(kind === 'block' ? 'moderation.blockDone' : 'moderation.muteDone'));
    } else {
      setTone('error');
      setMessage(t('moderation.failed'));
    }
  };

  return (
    <div className="report-backdrop" role="presentation" onClick={onClose}>
      <div
        className="report-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('moderation.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{t('moderation.title')}</h2>
        <p className="report-subtitle">{t('moderation.subtitle')}</p>

        {!reported && (
          <>
            <span className="report-field-label">{t('moderation.reasonLabel')}</span>
            <div className="report-reasons" role="radiogroup" aria-label={t('moderation.reasonLabel')}>
              {REASONS.map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                  />
                  {t(`moderation.reason.${value}`)}
                </label>
              ))}
            </div>

            <label className="report-field-label" htmlFor="report-details">
              {t('moderation.detailsLabel')}
            </label>
            <textarea
              id="report-details"
              className="report-details"
              value={details}
              placeholder={t('moderation.detailsPlaceholder')}
              onChange={(event) => setDetails(event.target.value)}
            />
          </>
        )}

        {message && (
          <p className={`report-message ${tone}`} role="status">
            {message}
          </p>
        )}

        <div className="report-actions">
          {!reported && (
            <button className="primary" disabled={!reason || busy} onClick={submit}>
              {busy ? t('moderation.submitting') : t('moderation.submit')}
            </button>
          )}
          <button className="quiet" onClick={() => safetyAction('block')}>
            {t('moderation.block')}
          </button>
          <button className="quiet" onClick={() => safetyAction('mute')}>
            {t('moderation.mute')}
          </button>
          <button className="quiet" onClick={onClose}>
            {t('moderation.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
