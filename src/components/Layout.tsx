import { apiFetch } from '../lib/http';
import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  House,
  Compass,
  SquarePlay,
  MessageCircle,
  BusFront,
  UserRound,
  Trophy,
  Search,
  Bell,
  Megaphone,
  Map,
  MapPinCheck,
  FolderHeart,
  LogIn,
  LogOut,
  ShieldCheck,
  HardDriveDownload,
  WifiOff,
  UserPlus,
  X,
} from 'lucide-react';
import Brand from './Brand';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import StreakChip from '../ui/StreakChip';
import { pressable, springs } from '../ui/motion';
import type { Ad } from '../types';
import '../styles/discovery.css';

const MotionNavLink = motion.create(NavLink);

export default function Layout({ children }: { children: ReactNode }) {
  const { t, setLanguage, language } = useLanguage();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [bannerAd, setBannerAd] = useState<Ad | null>(null);
  const [bannerVisible, setBannerVisible] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/ads?placement=top_banner')
      .then((res) => (res.ok ? res.json() : []))
      .then((list: Ad[]) => setBannerAd(list[0] || null))
      .catch(() => {});
  }, []);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/?q=${encodeURIComponent(term)}` : '/');
    setMobileSearchOpen(false);
  };

  const links = [
    { to: '/', label: t('navigation.home'), icon: House },
    { to: '/discover', label: t('navigation.discover'), icon: Compass },
    { to: '/clips', label: t('navigation.clips'), icon: SquarePlay },
    { to: '/messages', label: t('navigation.messages'), icon: MessageCircle },
    { to: '/partners', label: t('navigation.partners'), icon: BusFront },
    { to: '/profile', label: t('navigation.profile'), icon: UserRound },
    // Phase 6 — Trip Planner (mobile-first: lives in the bottom nav).
    { to: '/trips', label: t('navigation.trips'), icon: Map },
    // Phase 7 — public Collections.
    { to: '/collections', label: t('navigation.collections'), icon: FolderHeart },
  ];

  // Phase 6 — offline banner: shown while the device has no connectivity.
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return (
    <div className={language === 'kh' ? 'font-kh' : ''}>
      <header className="topbar">
        <div className="nav-shell">
          <NavLink to="/" className="brand-link">
            <Brand />
          </NavLink>
          <nav className="desktop-links">
            {links.slice(0, 5).map(({ to, label }) => (
              <MotionNavLink key={to} to={to} end={to === '/'} {...pressable}>
                {label}
              </MotionNavLink>
            ))}
            <MotionNavLink to="/rankings" {...pressable}>
              <Trophy /> <span>{t('navigation.rankings')}</span>
            </MotionNavLink>
            <MotionNavLink to="/trips" {...pressable}>
              <Map /> <span>{t('navigation.trips')}</span>
            </MotionNavLink>
            <MotionNavLink to="/collections" {...pressable}>
              <FolderHeart /> <span>{t('navigation.collections')}</span>
            </MotionNavLink>
          </nav>
          <form className="nav-search" onSubmit={submitSearch}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('search.placeholder')}
            />
          </form>
          <div className="nav-actions">
            <NavLink
              to="/offline"
              className="icon-button offline-library-button"
              aria-label={t('offline.title')}
              title={t('offline.title')}
            >
              <HardDriveDownload size={17} />
            </NavLink>
            <NavLink to="/merchant" className="merchant-nav-button">
              <Megaphone />
              <span>{t('navigation.merchant')}</span>
            </NavLink>
            {/* Phase 5: admin entry point, visible only to role:admin. */}
            {user?.role === 'admin' && (
              <NavLink to="/admin" className="merchant-nav-button admin-nav-button">
                <ShieldCheck />
                <span>{t('navigation.admin')}</span>
              </NavLink>
            )}
            {user ? (
              <div className="auth-chip">
                <StreakChip />
                <img src={user.avatar_url} alt="" />
                <span className="auth-chip-name">{language === 'kh' && user.name_kh ? user.name_kh : user.name}</span>
                <button className="icon-button" onClick={() => logout()} aria-label={t('auth.logout')} title={t('auth.logout')}>
                  <LogOut size={17} />
                </button>
              </div>
            ) : (
              <div className="auth-links">
                <NavLink to="/login" className="auth-link-login">
                  <LogIn size={16} />
                  <span>{t('auth.loginNav')}</span>
                </NavLink>
                <NavLink to="/register" className="auth-link-join">
                  <UserPlus size={16} />
                  <span>{t('auth.joinNav')}</span>
                </NavLink>
              </div>
            )}
            <button className="icon-button mobile-only" onClick={() => setMobileSearchOpen(true)}>
              <Search size={20} />
            </button>
            <button className="icon-button notification-button">
              <Bell size={20} />
              <span />
            </button>
            <div className="language-switch" role="group" aria-label="Language">
              <button className={language === 'kh' ? 'active' : ''} onClick={() => setLanguage('kh')}>
                KH
              </button>
              <i />
              <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>
                EN
              </button>
            </div>
          </div>
        </div>
      </header>

      {bannerAd && bannerVisible && (
        <div className="announcement-strip">
          <a href={bannerAd.target_url} target="_blank" rel="noreferrer">
            <MapPinCheck />
            <span>
              <small>{language === 'kh' ? bannerAd.sponsor_kh : bannerAd.sponsor}</small>
              {language === 'kh' ? bannerAd.headline_kh : bannerAd.headline}
            </span>
            <b>{language === 'kh' ? bannerAd.cta_kh : bannerAd.cta}</b>
          </a>
          <button onClick={() => setBannerVisible(false)}>
            <X />
          </button>
        </div>
      )}

      {mobileSearchOpen && (
        <div className="mobile-search-overlay">
          <form onSubmit={submitSearch}>
            <Search />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('search.placeholder')}
            />
            <button type="button" onClick={() => setMobileSearchOpen(false)}>
              <X />
            </button>
          </form>
        </div>
      )}

      {!online && (
        <div className="offline-banner" role="status">
          <WifiOff size={15} />
          <span>{t('offline.banner')}</span>
          <NavLink to="/offline">{t('offline.openLibrary')}</NavLink>
        </div>
      )}

      <main
        className={`app-main route-${location.pathname.replace('/', '') || 'home'} ${
          bannerAd && bannerVisible ? 'has-strip' : 'no-strip'
        }`}
      >
        {children}
      </main>

      <nav className="mobile-bottom-nav social-mobile-nav">
        {links.map(({ to, label, icon: Icon }) => (
          <MotionNavLink key={to} to={to} end={to === '/'} {...pressable} transition={springs.snappy}>
            {({ isActive }) => (
              <>
                <Icon />
                <span>{label}</span>
                {isActive && <motion.i className="nav-active-dot" layoutId="mobile-nav-dot" />}
              </>
            )}
          </MotionNavLink>
        ))}
      </nav>
    </div>
  );
}
