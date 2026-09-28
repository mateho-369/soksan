import { LoaderCircle, CircleAlert } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function LoadingState({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className={`loading-state ${compact ? 'compact' : ''}`}>
      <LoaderCircle className="spin" />
      <span>{t('loading')}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="error-state">
      <CircleAlert />
      <strong>Something wandered off</strong>
      <p>{message}</p>
      {onRetry && <button onClick={onRetry}>{t('retry')}</button>}
    </div>
  );
}
