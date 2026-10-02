import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserRound,
  Globe,
  ShieldCheck,
  Bell,
  HardDriveDownload,
  Check,
  Sparkles,
  ArrowLeft,
  MapPin,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { offlineEntries, removeOffline } from '../lib/offlineStore';

type SettingsSection = 'profile' | 'language' | 'privacy' | 'notifications';

export default function Settings() {
  const { language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState<SettingsSection>('profile');
  const [displayName, setDisplayName] = useState(user?.name || 'Dara Sok');
  const [displayNameKh, setDisplayNameKh] = useState(user?.name_kh || 'សុខ ដារ៉ា');
  const [handle, setHandle] = useState('@dara.sok');
  const [bio, setBio] = useState(
    'Exploring quiet coastal trails, specialty highland coffee, and community homestays across Cambodia.',
  );
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [autoFuzzWildlife, setAutoFuzzWildlife] = useState(true);
  const [hideExactHomePin, setHideExactHomePin] = useState(true);
  const [pushReplies, setPushReplies] = useState(true);
  const [weeklyGemsDigest, setWeeklyGemsDigest] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);
  const [offlineCount, setOfflineCount] = useState(() => offlineEntries().length);

  const handleSave = () => {
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2400);
  };

  const clearOfflineCache = () => {
    const items = offlineEntries();
    items.forEach((entry) => removeOffline(entry.post.id));
    setOfflineCount(0);
  };

  const navItems: { id: SettingsSection; label_en: string; label_kh: string; icon: typeof UserRound; desc_en: string }[] = [
    {
      id: 'profile',
      label_en: 'Profile & Identity',
      label_kh: 'ប្រវត្តិរូប និងអត្តសញ្ញាណ',
      icon: UserRound,
      desc_en: 'Public handle, bio, and bilingual display names',
    },
    {
      id: 'language',
      label_en: 'Language & Region',
      label_kh: 'ភាសា និងតំបន់',
      icon: Globe,
      desc_en: 'Khmer / English typography & currency display',
    },
    {
      id: 'privacy',
      label_en: 'Privacy & Location Safety',
      label_kh: 'ឯកជនភាព និងសុវត្ថិភាពទីតាំង',
      icon: ShieldCheck,
      desc_en: 'Sensitive heritage & wildlife pin fuzzing',
    },
    {
      id: 'notifications',
      label_en: 'Notifications & Offline',
      label_kh: 'ការជូនដំណឹង និងទិន្នន័យក្រៅបណ្តាញ',
      icon: Bell,
      desc_en: 'Alerts, digests, and offline story storage',
    },
  ];

  return (
    <div className="settings-saas-page page-shell">
      <header className="settings-saas-header">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} /> {language === 'kh' ? 'ការកំណត់គណនី' : 'Account & Workspace Settings'}
          </span>
          <h1>{language === 'kh' ? 'គ្រប់គ្រងបទពិសោធន៍ SokSan របស់អ្នក' : 'Settings & Preferences'}</h1>
          <p>
            {language === 'kh'
              ? 'កំណត់ភាសា ឯកជនភាពទីតាំង និងការរក្សាទុកមើលក្រៅបណ្តាញ។'
              : 'Manage your bilingual identity, location safety defaults, and offline travel library.'}
          </p>
        </div>
        <button type="button" className="settings-back-btn" onClick={() => navigate('/profile')}>
          <ArrowLeft size={16} />
          <span>{language === 'kh' ? 'ត្រឡប់ទៅប្រវត្តិរូប' : 'Back to profile'}</span>
        </button>
      </header>

      <div className="settings-saas-grid">
        <aside className="settings-saas-sidebar" aria-label="Settings sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                type="button"
                key={item.id}
                className={`settings-nav-item ${active ? 'active' : ''}`}
                onClick={() => setSection(item.id)}
                aria-current={active ? 'page' : undefined}
              >
                <span className="settings-nav-icon">
                  <Icon size={18} />
                </span>
                <span className="settings-nav-copy">
                  <strong>{language === 'kh' ? item.label_kh : item.label_en}</strong>
                  <small>{item.desc_en}</small>
                </span>
              </button>
            );
          })}
        </aside>

        <motion.section
          key={section}
          className="settings-saas-panel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {section === 'profile' && (
            <div className="settings-card">
              <div className="settings-card-head">
                <h2>{language === 'kh' ? 'ប្រវត្តិរូប និងអត្តសញ្ញាណ' : 'Profile & Identity'}</h2>
                <p>
                  {language === 'kh'
                    ? 'ឈ្មោះរបស់អ្នកបង្ហាញទាំងភាសាអង់គ្លេស និងភាសាខ្មែរ។'
                    : 'Your creator profile supports both English and Khmer display names.'}
                </p>
              </div>
              <div className="settings-form-grid">
                <label className="settings-field">
                  <span>{language === 'kh' ? 'ឈ្មោះបង្ហាញ (English)' : 'Display name (English)'}</span>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </label>
                <label className="settings-field">
                  <span>{language === 'kh' ? 'ឈ្មោះបង្ហាញ (ភាសាខ្មែរ)' : 'Display name (Khmer)'}</span>
                  <input value={displayNameKh} onChange={(e) => setDisplayNameKh(e.target.value)} />
                </label>
                <label className="settings-field">
                  <span>{language === 'kh' ? 'គណនី Handle' : 'Username handle'}</span>
                  <input value={handle} onChange={(e) => setHandle(e.target.value)} />
                </label>
                <label className="settings-field full-span">
                  <span>{language === 'kh' ? 'ជីវប្រវត្តិសង្ខេប' : 'Traveler bio'}</span>
                  <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
                </label>
              </div>
            </div>
          )}

          {section === 'language' && (
            <div className="settings-card">
              <div className="settings-card-head">
                <h2>{language === 'kh' ? 'ភាសា និងតំបន់' : 'Language & Regional Format'}</h2>
                <p>
                  {language === 'kh'
                    ? 'ជ្រើសរើសភាសាបង្ហាញ និងរូបិយប័ណ្ណសម្រាប់សេវាកម្មមូលដ្ឋាន។'
                    : 'Switch seamlessly between English (Inter) and Khmer (Kantumruy Pro).'}
                </p>
              </div>
              <div className="settings-option-list">
                <div className="settings-toggle-row">
                  <div>
                    <strong>{language === 'kh' ? 'ភាសាកម្មវិធី' : 'Interface Language'}</strong>
                    <small>Khmer (ភាសាខ្មែរ) or English</small>
                  </div>
                  <div className="settings-pill-group" role="group" aria-label="Select interface language">
                    <button
                      type="button"
                      className={language === 'en' ? 'active' : ''}
                      onClick={() => setLanguage('en')}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      className={language === 'kh' ? 'active' : ''}
                      onClick={() => setLanguage('kh')}
                    >
                      ភាសាខ្មែរ
                    </button>
                  </div>
                </div>
                <div className="settings-toggle-row">
                  <div>
                    <strong>{language === 'kh' ? 'រូបិយប័ណ្ណបង្ហាញ' : 'Preferred Currency'}</strong>
                    <small>Used on Discover budgets and Bakong KHQR previews</small>
                  </div>
                  <div className="settings-pill-group" role="group" aria-label="Select currency">
                    <button
                      type="button"
                      className={currency === 'USD' ? 'active' : ''}
                      onClick={() => setCurrency('USD')}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      className={currency === 'KHR' ? 'active' : ''}
                      onClick={() => setCurrency('KHR')}
                    >
                      KHR (៛)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'privacy' && (
            <div className="settings-card">
              <div className="settings-card-head">
                <h2>{language === 'kh' ? 'ឯកជនភាព និងសុវត្ថិភាពទីតាំង' : 'Privacy & Location Safety'}</h2>
                <p>
                  {language === 'kh'
                    ? 'ការពារទីតាំងធម្មជាតិ និងបេតិកភណ្ឌដែលងាយរងគ្រោះនៅកម្ពុជា។'
                    : 'Protect fragile Cambodian ecosystems and sacred sites with automatic coordinate fuzzing.'}
                </p>
              </div>
              <div className="settings-option-list">
                <label className="settings-switch-row">
                  <div>
                    <strong>
                      <MapPin size={15} /> Auto-fuzz fragile wildlife & sacred temple pins
                    </strong>
                    <small>Automatically snaps coordinates to commune level when safety tags are selected</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoFuzzWildlife}
                    onChange={(e) => setAutoFuzzWildlife(e.target.checked)}
                  />
                </label>
                <label className="settings-switch-row">
                  <div>
                    <strong>Default new stories to Commune-level visibility</strong>
                    <small>Keep exact GPS coordinates private unless sharing a verified public business</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={hideExactHomePin}
                    onChange={(e) => setHideExactHomePin(e.target.checked)}
                  />
                </label>
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div className="settings-card">
              <div className="settings-card-head">
                <h2>{language === 'kh' ? 'ការជូនដំណឹង និងទិន្នន័យក្រៅបណ្តាញ' : 'Notifications & Offline Library'}</h2>
                <p>Control community notifications and manage stories saved for remote trails with no signal.</p>
              </div>
              <div className="settings-option-list">
                <label className="settings-switch-row">
                  <div>
                    <strong>Comments, likes, and guide replies</strong>
                    <small>Notify me when travelers interact with my stories</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushReplies}
                    onChange={(e) => setPushReplies(e.target.checked)}
                  />
                </label>
                <label className="settings-switch-row">
                  <div>
                    <strong>Weekly Hidden Gem of the Week digest</strong>
                    <small>Curated Cambodian destinations every Friday morning</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={weeklyGemsDigest}
                    onChange={(e) => setWeeklyGemsDigest(e.target.checked)}
                  />
                </label>
                <div className="settings-toggle-row">
                  <div>
                    <strong>
                      <HardDriveDownload size={15} /> Offline Saved Stories ({offlineCount})
                    </strong>
                    <small>Cached in browser storage for zero-connectivity provinces</small>
                  </div>
                  <button type="button" className="settings-secondary-btn" onClick={clearOfflineCache}>
                    Clear offline cache
                  </button>
                </div>
              </div>
            </div>
          )}

          <footer className="settings-card-footer">
            {savedNotice && (
              <span className="settings-saved-pill" role="status">
                <Check size={15} /> {language === 'kh' ? 'បានរក្សាទុកការផ្លាស់ប្តូរ' : 'Preferences saved'}
              </span>
            )}
            <button type="button" className="settings-save-btn" onClick={handleSave}>
              <Check size={16} />
              <span>{language === 'kh' ? 'រក្សាទុកការកំណត់' : 'Save changes'}</span>
            </button>
          </footer>
        </motion.section>
      </div>
    </div>
  );
}
