import { apiFetch } from '../lib/http';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  MapPin,
  Megaphone,
  Heart,
  Sparkles,
  Users,
  ShieldCheck,
  CalendarCheck,
  Banknote,
  ChevronRight,
  Clock,
  X,
  Check,
  QrCode,
  CircleCheck,
  Grid3x3,
  MessageCircle,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState, ErrorState } from '../components/States';
import ContactActions from '../components/ContactActions';
import ContributorCard from '../components/ContributorCard';
import type { Profile as ProfileType, Service, Contact, Post } from '../types';

export default function Profile() {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [guestName, setGuestName] = useState('');
  const [formError, setFormError] = useState('');
  const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'paid'>('idle');
  const [paymentRef, setPaymentRef] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, servicesRes, contactsRes, postsRes] = await Promise.all([
        apiFetch('/profile?id=1'),
        apiFetch('/services?profile_id=1'),
        apiFetch('/contacts?profile_id=1'),
        apiFetch('/posts'),
      ]);
      if (!profileRes.ok || !servicesRes.ok || !contactsRes.ok) throw new Error('Could not load this guide profile');
      const [profileData, servicesData, contactData, postsData] = await Promise.all([
        profileRes.json(),
        servicesRes.json(),
        contactsRes.json(),
        postsRes.ok ? postsRes.json() : Promise.resolve([]),
      ]);
      setProfile(profileData);
      setServices(servicesData);
      setContact(contactData);
      setUserPosts(Array.isArray(postsData) ? postsData.slice(0, 6) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const closeCheckout = () => {
    setSelectedService(null);
    setGuestName('');
    setFormError('');
    setPaymentState('idle');
    setPaymentRef('');
  };

  const total = selectedService ? Number(selectedService.price) + Number(selectedService.booking_fee) : 0;

  const confirmPayment = async () => {
    if (!guestName.trim()) {
      setFormError(language === 'kh' ? 'សូមបញ្ចូលឈ្មោះរបស់អ្នក' : 'Please enter your name');
      return;
    }
    if (!selectedService) return;
    setPaymentState('processing');
    setFormError('');
    try {
      const res = await apiFetch('/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: selectedService.id, guest_name: guestName, total }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment could not be confirmed');
      setPaymentRef(data.payment_ref);
      setPaymentState('paid');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Payment failed');
      setPaymentState('idle');
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-shell">
        <ErrorState message={error || 'Profile unavailable'} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="profile-page page-shell">
      <section className="profile-hero">
        <div className="cover-photo">
          <img src={profile.cover_url || '/images/ream-coastal.jpg'} alt="Cambodian landscape" />
          <span />
        </div>
        <div className="profile-summary">
          <img className="profile-avatar" src={profile.avatar_url || '/images/traveler-dara.jpg'} alt={profile.name} />
          <div className="profile-identity">
            <div>
              <h1>
                {language === 'kh' ? profile.name_kh : profile.name}
                {profile.verified && <BadgeCheck />}
              </h1>
              <span>
                {profile.handle} · <MapPin /> {profile.location}
              </span>
            </div>
            <div className="profile-owner-actions">
              <button type="button" className="merchant-center-link" onClick={() => navigate('/merchant')}>
                <Megaphone /> Merchant Center
              </button>
              <button type="button" className="profile-settings-link" onClick={() => navigate('/settings')}>
                <SettingsIcon size={16} /> {language === 'kh' ? 'ការកំណត់' : 'Settings'}
              </button>
              <button type="button">
                <Heart /> Follow local guide
              </button>
            </div>
          </div>
          <p>{language === 'kh' ? profile.bio_kh : profile.bio_en}</p>
          <ContactActions contact={contact} />
          <div className="profile-stats">
            <span>
              <strong>{profile.followers.toLocaleString()}</strong> Followers
            </span>
            <span>
              <strong>{profile.following}</strong> Following
            </span>
            <span>
              <strong>{profile.posts_count}</strong> Stories
            </span>
          </div>
          <div className="badge-row">
            {profile.badges.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
          {/* Phase 7 — live, transparent contributor level for the signed-in
              traveler (derived from their published posts; never stored). */}
          {user && <ContributorCard />}
        </div>
      </section>

      <section className="expertise-strip">
        <div>
          <span className="eyebrow">
            <Sparkles /> {t('expertise')}
          </span>
          <h2>{profile.expertise}</h2>
        </div>
        <div>
          <div>
            <Users /> Community-led
          </div>
          <div>
            <ShieldCheck /> SokSan verified
          </div>
          <div>
            <CalendarCheck /> Flexible plans
          </div>
        </div>
      </section>

      {/* Instagram-style Responsive Grid of User's Published Stories */}
      {userPosts.length > 0 && (
        <section className="profile-posts-section" aria-label="Published stories grid">
          <header className="profile-posts-header">
            <div>
              <span className="eyebrow">
                <Grid3x3 size={14} /> {language === 'kh' ? 'រឿងរ៉ាវដែលបានចែករំលែក' : 'Published Stories Grid'}
              </span>
              <h2>{language === 'kh' ? 'ការចងចាំពីគ្រប់ខេត្តក្រុង' : 'Field Dispatches & Visual Grid'}</h2>
            </div>
          </header>
          <div className="profile-posts-grid">
            {userPosts.map((post) => (
              <Link key={post.id} to={`/post/${post.id}`} className="profile-post-tile">
                {post.media_url ? (
                  <img src={post.media_url} alt={post.location_name} loading="lazy" />
                ) : (
                  <div className="profile-post-fallback" />
                )}
                <div className="profile-post-overlay">
                  <strong>{post.location_name}</strong>
                  <div className="profile-post-metrics">
                    <span>
                      <Heart size={14} fill="currentColor" /> {post.like_count}
                    </span>
                    <span>
                      <MessageCircle size={14} fill="currentColor" /> {post.comment_count}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="services-section">
        <header>
          <div>
            <span className="eyebrow">
              <Banknote /> Local marketplace
            </span>
            <h2>{t('services')}</h2>
            <p>{t('servicesSub')}</p>
          </div>
          <button type="button">
            View availability <ChevronRight />
          </button>
        </header>
        <div className="services-grid">
          {services.map((service, index) => (
            <motion.article
              key={service.id}
              className="service-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="service-image">
                <img src={service.image_url} alt={service.title} />
                <span>
                  <Clock /> {service.duration}
                </span>
              </div>
              <div className="service-content">
                <h3>{language === 'kh' ? service.title_kh : service.title}</h3>
                <p>{language === 'kh' ? service.description_kh : service.description_en}</p>
                <div>
                  <span>
                    From <strong>${Number(service.price).toFixed(0)}</strong> / guest
                  </span>
                  <button type="button" onClick={() => setSelectedService(service)}>
                    {t('book')} <ChevronRight />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {selectedService && (
          <motion.div
            className="modal-backdrop checkout-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCheckout}
          >
            <motion.div
              className="checkout-modal"
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="checkout-info">
                <header>
                  <div>
                    <span className="eyebrow">
                      <ShieldCheck /> {t('securePayment')}
                    </span>
                    <h2>{language === 'kh' ? selectedService.title_kh : selectedService.title}</h2>
                  </div>
                  <button type="button" onClick={closeCheckout}>
                    <X />
                  </button>
                </header>
                <img className="checkout-service-image" src={selectedService.image_url} alt="" />
                <label>
                  {t('guestName')}
                  <input
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder={language === 'kh' ? 'ឧ. សុខ ដារ៉ា' : 'e.g. Dara Sok'}
                  />
                  {formError && <small>{formError}</small>}
                </label>
                <div className="price-breakdown">
                  <div>
                    <span>Experience</span>
                    <strong>${Number(selectedService.price).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>Secure booking fee</span>
                    <strong>${Number(selectedService.booking_fee).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>Total · USD</span>
                    <strong>${total.toFixed(2)}</strong>
                  </div>
                </div>
                <ul>
                  <li>
                    <Check /> Local guide availability confirmed
                  </li>
                  <li>
                    <Check /> Free reschedule up to 24 hours
                  </li>
                  <li>
                    <Check /> Protected by SokSan Network
                  </li>
                </ul>
              </div>
              <div className="khqr-module">
                {paymentState === 'paid' ? (
                  <motion.div
                    className="payment-success"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <div>
                      <CircleCheck />
                    </div>
                    <span>BAKONG · KHQR</span>
                    <h2>{t('received')}</h2>
                    <strong>${total.toFixed(2)}</strong>
                    <p>Reference {paymentRef}</p>
                    <button type="button" onClick={closeCheckout}>
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <div className="khqr-card">
                      <div className="khqr-brand">
                        <strong>KHQR</strong>
                        <span>BAKONG</span>
                      </div>
                      <div className="merchant">
                        <span>SokSan Network</span>
                        <strong>{profile.name}</strong>
                      </div>
                      <div className="qr-visual">
                        <QrCode />
                        <span className="lotus-qr">✦</span>
                      </div>
                      <strong className="qr-total">USD {total.toFixed(2)}</strong>
                      <p>{t('scanPay')}</p>
                    </div>
                    <div className="secure-note">
                      <ShieldCheck /> Encrypted transaction · No card details stored
                    </div>
                    <button
                      type="button"
                      className="confirm-payment"
                      disabled={paymentState === 'processing'}
                      onClick={confirmPayment}
                    >
                      {paymentState === 'processing' ? (
                        <>
                          <span className="button-spinner" /> Confirming with Bakong...
                        </>
                      ) : (
                        <>
                          {t('confirm')} <ChevronRight />
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
