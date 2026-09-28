import { ArrowUpRight, Leaf } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Ad } from '../types';

export function SidebarAd({ ad }: { ad?: Ad }) {
  const { language, t } = useLanguage();
  if (!ad) return null;
  return (
    <aside className="sidebar-ad" aria-label={t('sponsored')}>
      <img src={ad.image_url} alt="" />
      <div className="ad-shade" />
      <span className="ad-label">{t('sponsored')}</span>
      <div className="ad-copy">
        <small>{language === 'kh' ? ad.sponsor_kh : ad.sponsor}</small>
        <h3>{language === 'kh' ? ad.headline_kh : ad.headline}</h3>
        <p>{language === 'kh' ? ad.body_kh : ad.body}</p>
        <a href={ad.target_url} target="_blank" rel="noreferrer">
          {language === 'kh' ? ad.cta_kh : ad.cta}
          <ArrowUpRight />
        </a>
      </div>
    </aside>
  );
}

export function InFeedAd({ ad }: { ad?: Ad }) {
  const { language, t } = useLanguage();
  if (!ad) return null;
  return (
    <article className="infeed-ad">
      <div className="infeed-ad-image">
        <img src={ad.image_url} alt="" />
        <span>
          <Leaf /> Eco partner
        </span>
      </div>
      <div className="infeed-ad-copy">
        <div>
          <span>{t('sponsored')}</span>
          <small>{language === 'kh' ? ad.sponsor_kh : ad.sponsor}</small>
        </div>
        <h3>{language === 'kh' ? ad.headline_kh : ad.headline}</h3>
        <p>{language === 'kh' ? ad.body_kh : ad.body}</p>
        <a href={ad.target_url} target="_blank" rel="noreferrer">
          {language === 'kh' ? ad.cta_kh : ad.cta}
          <ArrowUpRight />
        </a>
      </div>
    </article>
  );
}
