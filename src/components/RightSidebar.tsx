import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Flame, Hash, Sparkles, UserPlus, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { SidebarAd } from './SponsoredAd';
import type { Ad, Post, Province } from '../types';

interface RightSidebarProps {
  posts: Post[];
  provinces: Province[];
  sidebarAd?: Ad;
  onFollow: (profileId: number) => void;
}

interface SuggestedCreator {
  id: number;
  name: string;
  name_kh?: string | null;
  handle: string;
  avatar_url: string;
  verified: boolean;
  is_following: boolean;
  subtitle_en: string;
  subtitle_kh: string;
}

const FALLBACK_CREATORS: SuggestedCreator[] = [
  {
    id: 2,
    name: 'Malis Chea',
    name_kh: 'ម៉ាលីស ជា',
    handle: '@malis.chea',
    avatar_url: '/images/guide-sokha.jpg',
    verified: true,
    is_following: false,
    subtitle_en: 'Coastal trails & island guides',
    subtitle_kh: 'អ្នកនាំផ្លូវឆ្នេរ និងកោះ',
  },
  {
    id: 3,
    name: 'Vannak Chhim',
    name_kh: 'វណ្ណៈ ឈឹម',
    handle: '@vannak.coffee',
    avatar_url: '/images/creator-nary.jpg',
    verified: true,
    is_following: false,
    subtitle_en: 'Mondulkiri & highland roasters',
    subtitle_kh: 'កាហ្វេភ្នំមណ្ឌលគិរី',
  },
  {
    id: 4,
    name: 'Sophea Meas',
    name_kh: 'សុភា មាស',
    handle: '@sophea.explore',
    avatar_url: '/images/creator-rith.jpg',
    verified: true,
    is_following: false,
    subtitle_en: 'Siem Reap sunrise & heritage',
    subtitle_kh: 'ថ្ងៃរះសៀមរាប និងបេតិកភណ្ឌ',
  },
];

const TRENDING_TAGS = [
  { tag: 'KohRong', label_kh: '#កោះរ៉ុង', posts: '2.4k' },
  { tag: 'KampotPepper', label_kh: '#ម្រេចកំពត', posts: '1.8k' },
  { tag: 'SiemReapSunrise', label_kh: '#ថ្ងៃរះសៀមរាប', posts: '3.1k' },
  { tag: 'MondulkiriMist', label_kh: '#អ័ព្ទមណ្ឌលគិរី', posts: '940' },
  { tag: 'PhnomPenhCafes', label_kh: '#កាហ្វេភ្នំពេញ', posts: '1.5k' },
  { tag: 'KepCrabMarket', label_kh: '#ផ្សារក្តាមកែប', posts: '820' },
];

export default function RightSidebar({ posts, provinces, sidebarAd, onFollow }: RightSidebarProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const suggestedProfiles = useMemo(() => {
    const byId = new Map<number, SuggestedCreator>();
    posts.forEach((post) => {
      if (user && post.author.id === user.id) return;
      if (!byId.has(post.author.id)) {
        byId.set(post.author.id, {
          id: post.author.id,
          name: post.author.name,
          name_kh: post.author.name_kh,
          handle: post.author.handle || `@${post.author.name.toLowerCase().replace(/\s+/g, '.')}`,
          avatar_url: post.author.avatar_url || '/images/traveler-dara.jpg',
          verified: Boolean(post.author.verified),
          is_following: Boolean(post.author.is_following),
          subtitle_en: `${post.province} · Local storyteller`,
          subtitle_kh: `${post.province} · អ្នកចែករំលែកមូលដ្ឋាន`,
        });
      }
    });
    FALLBACK_CREATORS.forEach((creator) => {
      if (!byId.has(creator.id) && (!user || creator.id !== user.id)) {
        byId.set(creator.id, creator);
      }
    });
    return Array.from(byId.values()).slice(0, 4);
  }, [posts, user]);

  return (
    <aside className="feed-right-rail" aria-label="Community sidebar">
      {/* Instagram-style Suggested Profiles to Follow Widget */}
      <section className="right-rail-card suggested-profiles-widget" aria-label="Suggested profiles to follow">
        <div className="widget-header">
          <span>
            <Sparkles size={13} /> {language === 'kh' ? 'ណែនាំសម្រាប់អ្នក' : 'Suggested for you'}
          </span>
          <Link to="/partners">{language === 'kh' ? 'មើលទាំងអស់' : 'See all'}</Link>
        </div>
        <h3>{language === 'kh' ? 'អ្នកនាំផ្លូវ និងអ្នកបង្កើតមាតិកា' : 'Suggested Profiles to Follow'}</h3>
        <div className="suggested-profiles-list">
          {suggestedProfiles.map((creator) => (
            <div key={creator.id} className="suggested-profile-row">
              <img src={creator.avatar_url || '/images/traveler-dara.jpg'} alt="" />
              <div className="suggested-profile-meta">
                <strong>
                  <span>{language === 'kh' && creator.name_kh ? creator.name_kh : creator.name}</span>
                  {creator.verified && <BadgeCheck size={14} aria-label="Verified" />}
                </strong>
                <small>{language === 'kh' ? creator.subtitle_kh : creator.subtitle_en}</small>
              </div>
              <button
                type="button"
                className={`suggested-follow-btn ${creator.is_following ? 'is-following' : ''}`}
                onClick={() => onFollow(creator.id)}
                aria-label={`${creator.is_following ? 'Unfollow' : 'Follow'} ${creator.name}`}
              >
                {creator.is_following ? (
                  <>
                    <Check size={13} />
                    <span>{language === 'kh' ? 'កំពុងតាមដាន' : 'Following'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={13} />
                    <span>{language === 'kh' ? 'តាមដាន' : 'Follow'}</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Tags Widget */}
      <section className="right-rail-card trending-tags-widget" aria-label="Trending tags">
        <div className="widget-header">
          <span>
            <Flame size={13} /> {language === 'kh' ? 'កំពុងពេញនិយម' : 'Trending across Cambodia'}
          </span>
        </div>
        <h3>{language === 'kh' ? 'ស្លាកពេញនិយម' : 'Trending Tags'}</h3>
        <div className="trending-tags-cloud">
          {TRENDING_TAGS.map((item) => (
            <Link
              key={item.tag}
              to={`/discover?q=${encodeURIComponent(item.tag)}&tab=tags`}
              className="trending-tag-chip"
            >
              <Hash size={13} />
              <span>{language === 'kh' ? item.label_kh.replace(/^#/, '') : item.tag}</span>
              <small>{item.posts}</small>
            </Link>
          ))}
        </div>
      </section>

      {/* Sponsored Slot */}
      <div className="sidebar-label">
        <span>{t('common.sponsored')}</span>
        <small>300 × 250</small>
      </div>
      <SidebarAd ad={sidebarAd} />

      {/* Live in Cambodia Province Explorer */}
      <div className="right-rail-card">
        <span>Live in Cambodia</span>
        <h3>{t('social.everyProvince')}</h3>
        <div>
          {provinces.slice(0, 4).map((province) => (
            <button
              type="button"
              key={province.id}
              onClick={() => navigate(`/discover?q=${province.name}`)}
            >
              <span>{province.icon}</span>
              <strong>{language === 'kh' ? province.name_kh : province.name}</strong>
              <small>{province.explorers?.toLocaleString()} explorers</small>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
