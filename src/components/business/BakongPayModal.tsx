import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { X, QrCode, ShieldCheck, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/http';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Business, KhqrInvoice } from '../../types';
import '../../styles/business.css';

interface BakongPayModalProps {
  business: Business;
  onUpgraded: (business: Business) => void;
  onClose: () => void;
}

/**
 * Boosted-tier checkout over Bakong KHQR.
 *
 * Flow: request an invoice -> show the KHQR -> owner scans with any KHQR
 * app (Bakong) -> "I paid" -> the backend confirms the payment and flips
 * the business to Boosted. In this demo the confirmation is instant; in
 * production BakongService verifies the transaction with the Bakong API
 * before anything activates.
 */
export default function BakongPayModal({ business, onUpgraded, onClose }: BakongPayModalProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [invoice, setInvoice] = useState<KhqrInvoice | null>(null);
  const [qrSvg, setQrSvg] = useState('');
  const [phase, setPhase] = useState<'loading' | 'pay' | 'confirming' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/businesses/upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business_id: business.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not create the invoice');
        if (cancelled) return;
        setInvoice(data.invoice as KhqrInvoice);
        const svg = await QRCode.toString((data.invoice as KhqrInvoice).khqr_payload, {
          type: 'svg',
          margin: 1,
          width: 220,
        });
        if (cancelled) return;
        setQrSvg(svg);
        setPhase('pay');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Payment is unavailable right now');
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [business.id]);

  const confirmPayment = useCallback(async () => {
    setPhase('confirming');
    try {
      const res = await apiFetch('/businesses/upgrade/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: business.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment could not be confirmed');
      onUpgraded(data as Business);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment could not be confirmed');
      setPhase('pay');
    }
  }, [business.id, onUpgraded]);

  return createPortal(
    <div
      className="bakong-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="bakong-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('business.upgradeTitle')}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="bakong-header">
          <div>
            <h2>{t('business.upgradeTitle')}</h2>
            <p>{business.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('business.close')}>
            <X size={18} />
          </button>
        </header>

        {phase === 'loading' && (
          <div className="bakong-status">
            <Loader2 className="spin" size={22} /> {t('business.creatingInvoice')}
          </div>
        )}

        {phase === 'error' && (
          <div className="bakong-status" role="alert">
            {error}
          </div>
        )}

        {(phase === 'pay' || phase === 'confirming') && invoice && (
          <>
            <div className="bakong-amount">
              <strong>${invoice.amount_usd.toFixed(2)}</strong>
              <span>/ {t('business.perMonth')}</span>
            </div>
            <div className="bakong-qr" aria-label={t('business.scanWithBakong')}>
              {qrSvg ? (
                <span className="bakong-qr-svg" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              ) : (
                <QrCode size={120} />
              )}
            </div>
            <p className="bakong-scan-hint">{t('business.scanWithBakong')}</p>
            <p className="bakong-ref">
              {invoice.invoice_ref} · {t('business.invoiceExpires')}{' '}
              {new Date(invoice.expires_at).toLocaleTimeString()}
            </p>
            {error && (
              <p className="bakong-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              className="bakong-confirm"
              onClick={confirmPayment}
              disabled={phase === 'confirming'}
            >
              {phase === 'confirming' ? (
                <>
                  <Loader2 className="spin" size={16} /> {t('business.confirmingPayment')}
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> {t('business.iHavePaid')}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
