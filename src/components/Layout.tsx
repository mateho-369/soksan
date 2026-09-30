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
  MapPinCheck,
  LogIn,
  LogOut,
  UserPlus,
  X,
} from 'lucide-react';
import Brand from './Brand';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import StreakChip from '../ui/StreakChip';
import { pressable, springs } from '../ui/motion';
import type { Ad } from '../types';

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
  ];

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
            <NavLink to="/merchant" className="merchant-nav-button">
              <Megaphone />
              <span>{t('navigation.merchant')}</span>
            </NavLink>
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
