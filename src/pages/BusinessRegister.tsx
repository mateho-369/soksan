import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import BusinessRegisterForm from '../components/business/BusinessRegisterForm';
import '../styles/business.css';

/** Phase 3 — free Verified-tier business registration. */
export default function BusinessRegister() {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) {
    return (
      <div className="business-page">
        <div className="business-gate">
          <Store size={28} />
          <h1>{t('business.registerTitle')}</h1>
          <p>{t('business.loginToManage')}</p>
          <Link className="business-submit" to="/login">
            {t('auth.loginAction')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="business-page">
      <div className="business-heading">
        <span className="eyebrow">
          <Store size={14} /> {t('business.ownerEyebrow')}
        </span>
        <h1>{t('business.registerTitle')}</h1>
        <p>{t('business.registerSubtitle')}</p>
      </div>
      <BusinessRegisterForm />
    </div>
  );
}
