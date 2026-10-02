import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle, LogIn, UserPlus } from 'lucide-react';
import Brand from '../components/Brand';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

type Mode = 'login' | 'register';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shared login / register screen. One component, two modes — no duplicated form code. */
function AuthPage({ mode }: { mode: Mode }) {
  const isLogin = mode === 'login';
  const { t, language } = useLanguage();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Phase 8 — badge-only referral. Invite links carry ?ref=CODE, which
  // pre-fills the optional field; signup works exactly the same without it.
  const [referral, setReferral] = useState(
    () => new URLSearchParams(window.location.search).get('ref') || '',
  );

  // Demo backend runs in the browser, so surface the seeded demo account.
  const demoMode = !import.meta.env?.VITE_API_BASE_URL;

  const destination = (location.state as { from?: string } | null)?.from || '/';

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!isLogin && name.trim().length < 2) errors.name = t('auth.nameError');
    if (!EMAIL_RE.test(email.trim())) errors.email = t('auth.emailError');
    if (password.length < 8) errors.password = t('auth.passwordError');
    if (!isLogin && confirm !== password) errors.confirm = t('auth.confirmError');
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isLogin) await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password, referral);
      navigate(destination, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t('auth.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="brand-link auth-brand" aria-label="Back to SokSan home">
          <Brand />
        </Link>
        <h1>{isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}</h1>
        <p className="auth-subtitle">{isLogin ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}</p>

        {serverError && (
          <div className="auth-server-error" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          {!isLogin && (
            <label className="auth-field">
              <span>{t('auth.name')}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('auth.namePlaceholder')}
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && <em>{fieldErrors.name}</em>}
            </label>
          )}

          <label className="auth-field">
            <span>{t('auth.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && <em>{fieldErrors.email}</em>}
          </label>

          <label className="auth-field">
            <span>{t('auth.password')}</span>
            <div className="auth-password-row">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <em>{fieldErrors.password}</em>}
          </label>

          {!isLogin && (
            <label className="auth-field">
              <span>{t('auth.confirm')}</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.confirm)}
              />
              {fieldErrors.confirm && <em>{fieldErrors.confirm}</em>}
            </label>
          )}

          {!isLogin && (
            <label className="auth-field">
              <span>{t('auth.referralLabel')}</span>
              <input
                type="text"
                value={referral}
                onChange={(event) => setReferral(event.target.value)}
                placeholder={t('auth.referralPlaceholder')}
                autoComplete="off"
              />
              <em className="auth-referral-note">{t('auth.referralNote')}</em>
            </label>
          )}

          <button className="auth-submit" disabled={submitting}>
            {submitting ? (
              <LoaderCircle className="spin" />
            ) : isLogin ? (
              <LogIn size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {isLogin ? t('auth.loginAction') : t('auth.registerAction')}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <Link to={isLogin ? '/register' : '/login'}>
            {isLogin ? t('auth.registerAction') : t('auth.loginAction')}
          </Link>
        </p>

        {demoMode && isLogin && (
          <p className="auth-demo-hint">
            {language === 'kh'
              ? 'កំណែសាកល្បង៖ ចូលដោយអ៊ីមែល'
              : 'Demo mode:'}{' '}
            <code>dara@soksan.app</code> / <code>soksan123</code>
          </p>
        )}
      </div>
    </div>
  );
}

export function LoginPage() {
  return <AuthPage mode="login" />;
}

export function RegisterPage() {
  return <AuthPage mode="register" />;
}
