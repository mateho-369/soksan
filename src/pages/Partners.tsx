import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShieldCheck,
  ChevronRight,
  Check,
  Car,
  UserCheck,
  BusFront,
  MapPin,
  Star,
  BadgeCheck,
  MessageCircle,
  Phone,
  X,
  QrCode,
  CircleCheck,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState, ErrorState } from '../components/States';
import type { Partner, PartnerCategory, Province } from '../types';

interface RegistrationForm {
  business_name: string;
  owner_name: string;
  partner_type: string;
  province: string;
  city: string;
  phone: string;
}

export default function Partners() {
  const { language, t } = useLanguage();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [categories, setCategories] = useState<PartnerCategory[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'payment' | 'done'>('form');
  const [form, setForm] = useState<RegistrationForm>({
    business_name: '',
    owner_name: '',
    partner_type: 'local-guide',
    province: '',
    city: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/partners${typeFilter ? `?type=${typeFilter}` : ''}`);
      if (!res.ok) throw new Error('Could not load collaborators');
      const data = await res.json();
      setPartners(data.partners);
      setCategories(data.categories);
      setProvinces(data.provinces);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load collaborators');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === form.partner_type),
    [categories, form.partner_type],
  );

  const updateForm = (key: keyof RegistrationForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const formComplete = Object.values(form).every(Boolean);

  const submitRegistration = async () => {
    if (!formComplete || !selectedCategory) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, monthly_fee: selectedCategory.monthly_fee }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setPaymentRef(data.payment_ref);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setStep('form');
    setPaymentRef('');
    setError('');
  };

  return (
    <div className="partners-page page-shell">
      <section className="partners-hero">
        <div>
          <span className="eyebrow">
            <ShieldCheck /> SokSan trusted collaboration
          </span>
          <h1>{t('partners.title')}</h1>
          <p>{t('partners.subtitle')}</p>
          <div>
            <button onClick={() => setModalOpen(true)}>
              {t('partners.join')} <ChevronRight />
            </button>
            <span>
              <Check /> Monthly plans · cancel anytime
            </span>
          </div>
        </div>
        <div className="partner-hero-art">
          <div>
            <Car />
          </div>
          <span />
          <div>
            <UserCheck />
          </div>
          <span />
          <div>
            <BusFront />
          </div>
        </div>
      </section>

      <div className="partner-filter-tabs">
        <button className={typeFilter ? '' : 'active'} onClick={() => setTypeFilter('')}>
          ✦ {t('common.all')}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className={typeFilter === category.slug ? 'active' : ''}
            onClick={() => setTypeFilter(category.slug)}
          >
            <span>{category.icon}</span>
            {language === 'kh' ? category.label_kh : category.label_en}
          </button>
        ))}
      </div>

      <section className="partner-trust-bar">
        <div>
          <ShieldCheck />
          <span>
            <strong>Verified identities</strong>
            <small>Reviewed by SokSan</small>
          </span>
        </div>
        <div>
          <MapPin />
          <span>
            <strong>Every province</strong>
            <small>Local knowledge first</small>
          </span>
        </div>
        <div>
          <Star />
          <span>
            <strong>Community rated</strong>
            <small>Real traveler feedback</small>
          </span>
        </div>
      </section>

      {loading ? (
        <LoadingState />
      ) : error && !modalOpen ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <section className="partner-grid">
          {partners.map((partner, index) => (
            <motion.article
              key={partner.id}
              className="partner-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <div className="partner-cover">
                <img src={partner.cover_url} alt="" />
                <span>{partner.partner_type.replace('-', ' ')}</span>
              </div>
              <div className="partner-card-body">
                <img className="partner-avatar" src={partner.avatar_url} alt="" />
                <div className="partner-name">
                  <h2>
                    {language === 'kh' && partner.business_name_kh ? partner.business_name_kh : partner.business_name}
                    {partner.verified && <BadgeCheck />}
                  </h2>
                  <span>
                    <MapPin /> {partner.city}, {partner.province}
                  </span>
                </div>
                <p>{language === 'kh' ? partner.description_kh : partner.description_en}</p>
                <div className="partner-stats">
                  <span>
                    <Star fill="currentColor" />
                    <strong>{partner.rating}</strong> ({partner.review_count})
                  </span>
                  <span>{partner.completed_trips.toLocaleString()} trips</span>
                </div>
                <div className="partner-card-actions">
                  <a href={partner.telegram_url} target="_blank" rel="noreferrer">
                    <MessageCircle /> Chat
                  </a>
                  <a href={`tel:${partner.phone}`}>
                    <Phone /> Call
                  </a>
                  <button>
                    View service <ChevronRight />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </section>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="modal-backdrop partner-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="partner-register-modal"
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(event) => event.stopPropagation()}
            >
              <header>
                <div>
                  <span className="eyebrow">
                    <ShieldCheck /> Business collaboration
                  </span>
                  <h2>{step === 'done' ? 'Welcome to the journey' : t('partners.registerTitle')}</h2>
                </div>
                <button onClick={closeModal}>
                  <X />
                </button>
              </header>

              {step === 'form' && (
                <div className="partner-form">
                  <div className="partner-type-grid">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        className={form.partner_type === category.slug ? 'active' : ''}
                        onClick={() => updateForm('partner_type', category.slug)}
                      >
                        <span>{category.icon}</span>
                        <strong>{language === 'kh' ? category.label_kh : category.label_en}</strong>
                        <small>${Number(category.monthly_fee).toFixed(0)}/month</small>
                      </button>
                    ))}
                  </div>
                  <div className="partner-fields">
                    <label>
                      Business or service name
                      <input
                        value={form.business_name}
                        onChange={(event) => updateForm('business_name', event.target.value)}
                      />
                    </label>
                    <label>
                      Owner name
                      <input value={form.owner_name} onChange={(event) => updateForm('owner_name', event.target.value)} />
                    </label>
                    <label>
                      Province
                      <select value={form.province} onChange={(event) => updateForm('province', event.target.value)}>
                        <option value="">Choose province</option>
                        {provinces.map((province) => (
                          <option key={province.id} value={province.name}>
                            {province.icon} {language === 'kh' ? province.name_kh : province.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      City / service area
                      <input value={form.city} onChange={(event) => updateForm('city', event.target.value)} />
                    </label>
                    <label className="full">
                      Phone or Telegram number
                      <input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} />
                    </label>
                  </div>
                  <div className="subscription-note">
                    <ShieldCheck />
                    <div>
                      <strong>SokSan collaborator membership</strong>
                      <span>Verified profile, directory discovery, booking leads, and trust badge.</span>
                    </div>
                    <b>
                      ${Number(selectedCategory?.monthly_fee || 0).toFixed(0)}
                      <small>/month</small>
                    </b>
                  </div>
                  <button className="continue-register" disabled={!formComplete} onClick={() => setStep('payment')}>
                    Continue to KHQR <ChevronRight />
                  </button>
                </div>
              )}

              {step === 'payment' && (
                <div className="partner-payment">
                  <div>
                    <h3>Monthly collaboration</h3>
                    <ul>
                      <li>
                        <Check /> Verified business listing
                      </li>
                      <li>
                        <Check /> Reach travelers across Cambodia
                      </li>
                      <li>
                        <Check /> Native chat and direct calls
                      </li>
                      <li>
                        <Check /> Cancel your plan anytime
                      </li>
                    </ul>
                    <div>
                      <span>Monthly membership</span>
                      <strong>${Number(selectedCategory?.monthly_fee || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Activation fee</span>
                      <strong>$0.00</strong>
                    </div>
                    <div className="partner-total">
                      <span>Total today · USD</span>
                      <strong>${Number(selectedCategory?.monthly_fee || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                  <aside>
                    <div className="mini-khqr">
                      <div>
                        <strong>KHQR</strong>
                        <span>BAKONG</span>
                      </div>
                      <QrCode />
                      <b>USD {Number(selectedCategory?.monthly_fee || 0).toFixed(2)}</b>
                      <small>Scan with any Bakong member app</small>
                    </div>
                    {error && <p>{error}</p>}
                    <button disabled={submitting} onClick={submitRegistration}>
                      {submitting ? <span className="button-spinner" /> : <QrCode />} Pay & submit application
                    </button>
                    <button className="payment-back" onClick={() => setStep('form')}>
                      Back
                    </button>
                  </aside>
                </div>
              )}

              {step === 'done' && (
                <div className="partner-success">
                  <div>
                    <CircleCheck />
                  </div>
                  <span>APPLICATION RECEIVED</span>
                  <h3>We are reviewing your local business.</h3>
                  <p>
                    Your reference is <strong>{paymentRef}</strong>. SokSan will contact you before your verified
                    collaboration goes live.
                  </p>
                  <button onClick={closeModal}>Explore collaborators</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
