import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Play,
  Users,
  Search,
  MapPin,
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Send,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState, ErrorState } from '../components/States';
import PostComposer from '../components/PostComposer';
import PostViewer from '../components/PostViewer';
import BoostModal from '../components/BoostModal';
import { SidebarAd, InFeedAd } from '../components/SponsoredAd';
import type { Post, Category, Province, Ad } from '../types';

export default function Home() {
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [expanded, setExpanded] = useState<number[]>([]);
  const [mediaIndexes, setMediaIndexes] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyPost, setBusyPost] = useState<number | null>(null);
  const [boostPost, setBoostPost] = useState<Post | null>(null);
  const [viewerPostId, setViewerPostId] = useState<number | null>(null);
  const [viewerComments, setViewerComments] = useState(false);

  const query = searchParams.get('q') || '';

  const fetchFeed = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (query) params.set('search', query);
        if (activeCategory) params.set('category', activeCategory);
        const [postsRes, categoriesRes, adsRes, rankingsRes] = await Promise.all([
          fetch(`/api/posts?${params}`),
          fetch('/api/categories'),
          fetch('/api/ads'),
          fetch('/api/rankings'),
        ]);
        if (!postsRes.ok || !categoriesRes.ok || !adsRes.ok || !rankingsRes.ok) {
          throw new Error('We could not load the travel stories.');
        }
        const [postsData, categoriesData, adsData, rankingsData] = await Promise.all([
          postsRes.json(),
          categoriesRes.json(),
          adsRes.json(),
          rankingsRes.json(),
        ]);
        setPosts(postsData);
        setCategories(categoriesData);
        setAds(adsData);
        setProvinces(rankingsData.provinces || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load');
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [query, activeCategory],
  );

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const interact = async (postId: number, action: 'like' | 'comment' | 'share') => {
    const snapshot = posts;
    setBusyPost(postId);
    setPosts((list) =>
      list.map((post) =>
        post.id !== postId
          ? post
          : {
              ...post,
              is_liked: action === 'like' ? !post.is_liked : post.is_liked,
              like_count:
                action === 'like' ? Math.max(0, post.like_count + (post.is_liked ? -1 : 1)) : post.like_count,
              comment_count: action === 'comment' ? post.comment_count + 1 : post.comment_count,
              share_count: action === 'share' ? post.share_count + 1 : post.share_count,
            },
      ),
    );
    try {
      if (action === 'share') {
        if (navigator.share) {
          await navigator
            .share({ title: 'SokSan Network', text: 'A place worth finding in Cambodia', url: window.location.href })
            .catch(() => {});
        } else {
          await navigator.clipboard?.writeText(window.location.href);
        }
      }
      const res = await fetch('/api/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId, action }),
      });
      if (!res.ok) throw new Error('Interaction failed');
      await fetchFeed(false);
    } catch (err) {
      setPosts(snapshot);
      setError(err instanceof Error ? err.message : 'Interaction failed');
    } finally {
      setBusyPost(null);
    }
  };

  const toggleFollow = async (profileId: number) => {
    setPosts((list) =>
      list.map((post) =>
        post.author.id === profileId
          ? { ...post, author: { ...post.author, is_following: !post.author.is_following } }
          : post,
      ),
    );
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId }),
      });
      if (!res.ok) throw new Error('Follow failed');
      await fetchFeed(false);
    } catch {
      await fetchFeed(false);
    }
  };

  const openViewer = (postId: number, withComments = false) => {
    setViewerComments(withComments);
    setViewerPostId(postId);
  };

  const closeViewer = () => {
    setViewerPostId(null);
    setViewerComments(false);
  };

  const viewerPost = posts.find((post) => post.id === viewerPostId) || null;
  const sidebarAd = ads.find((ad) => ad.placement === 'sidebar');
  const inFeedAds = ads.filter((ad) => ad.placement === 'in_feed');

  return (
    <div className="home-page social-home page-shell">
      <div className="social-home-layout">
        <aside className="feed-left-rail">
          <div className="rail-profile">
            <img src="/images/traveler-dara.jpg" alt="" />
            <div>
              <strong>Dara Sok</strong>
              <span>Explore Cambodia</span>
            </div>
          </div>
          <nav>
            <button className="active">
              <Sparkles /> {t('social.forYou')}
            </button>
            <button onClick={() => navigate('/clips')}>
              <Play /> {t('navigation.clips')}
            </button>
            <button onClick={() => navigate('/partners')}>
              <Users /> {t('navigation.partners')}
            </button>
          </nav>
          <div className="rail-categories">
            <span>{t('social.exploreByMood')}</span>
            {categories.slice(0, 7).map((category) => (
              <button key={category.id} onClick={() => setActiveCategory(category.slug)}>
                {category.emoji}
                <span>{language === 'kh' ? category.label_kh : category.label_en}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="social-feed-column">
          <header className="social-feed-heading">
            <div>
              <span className="eyebrow">
                <Sparkles /> {t('social.communityFeed')}
              </span>
              <h1>{t('feed.title')}</h1>
              <p>{t('feed.subtitle')}</p>
            </div>
            <button onClick={() => navigate('/clips')}>
              <Play /> {t('social.watchClips')}
            </button>
          </header>

          {query && (
            <div className="search-result-note">
              <Search /> {t('social.resultsFor')}{' '}
              <strong>“{query}”</strong>
              <button onClick={() => navigate('/')}>Clear</button>
            </div>
          )}

          <PostComposer categories={categories} provinces={provinces} onPosted={() => fetchFeed(false)} />

          <div className="category-scroller social-category-scroller">
            <button className={activeCategory ? '' : 'active'} onClick={() => setActiveCategory('')}>
              ✦ {t('common.allPlaces')}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                className={activeCategory === category.slug ? 'active' : ''}
                onClick={() => setActiveCategory(category.slug)}
              >
                {category.emoji} {language === 'kh' ? category.label_kh : category.label_en}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchFeed()} />
          ) : (
            <section className="facebook-feed">
              {posts.map((post, index) => {
                const caption = language === 'kh' ? post.caption_kh : post.caption_en;
                const isExpanded = expanded.includes(post.id);
                const media = post.media.length
                  ? post.media
                  : [
                      {
                        id: 0,
                        post_id: post.id,
                        media_url: post.media_url,
                        media_type: post.media_type === 'video' ? ('video' as const) : ('image' as const),
                        sort_order: 0,
                        duration_seconds: null,
                      },
                    ];
                const mediaIndex = Math.min(mediaIndexes[post.id] || 0, media.length - 1);
                const currentMedia = media[mediaIndex];
                const inFeedAd = inFeedAds.length ? inFeedAds[Math.floor(index / 5) % inFeedAds.length] : undefined;

                return (
                  <Fragment key={post.id}>
                    <motion.article
                      className={`post-card facebook-post ${post.promotion ? 'promoted-post' : ''}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.25) }}
                    >
                      <header className="post-author">
                        <img src={post.author.avatar_url} alt="" />
                        <div>
                          <div className="author-name">
                            {language === 'kh' && post.author.name_kh ? post.author.name_kh : post.author.name}
                            {post.author.verified && <BadgeCheck />}
                            <button
                              className={`inline-follow ${post.author.is_following ? 'following' : ''}`}
                              onClick={() => toggleFollow(post.author.id)}
                            >
                              · {post.author.is_following ? t('social.following') : t('social.follow')}
                            </button>
                          </div>
                          <button onClick={() => navigate(`/discover?q=${encodeURIComponent(post.location_name)}`)}>
                            <MapPin />
                            {post.location_name}, {post.province} · {new Date(post.created_at).toLocaleDateString()}
                          </button>
                        </div>
                        <button className="save-button">
                          <Bookmark />
                        </button>
                      </header>

                      <div className="facebook-caption">
                        <p className={isExpanded ? '' : 'caption-clamped'}>{caption}</p>
                        {caption.length > 145 && (
                          <button
                            onClick={() =>
                              setExpanded((ids) =>
                                ids.includes(post.id) ? ids.filter((id) => id !== post.id) : [...ids, post.id],
                              )
                            }
                          >
                            {t(isExpanded ? 'common.seeLess' : 'common.seeMore')}
                          </button>
                        )}
                        <span>{post.hashtags}</span>
                      </div>

                      <button className="facebook-media" onClick={() => openViewer(post.id, false)}>
                        {currentMedia.media_type === 'video' ? (
                          <video src={currentMedia.media_url} muted playsInline preload="metadata" />
                        ) : (
                          <img src={currentMedia.media_url} alt={post.location_name} />
                        )}
                        <span className="image-wash" />
                        {currentMedia.media_type === 'video' && (
                          <div className="video-play">
                            <Play fill="currentColor" />
                            {currentMedia.duration_seconds && <small>{currentMedia.duration_seconds}s</small>}
                          </div>
                        )}
                        {media.length > 1 && (
                          <div className="media-counter">
                            {mediaIndex + 1}/{media.length}
                          </div>
                        )}
                        {post.promotion && <div className="featured-gem-badge">⚡ {t('feed.featured')}</div>}
                      </button>

                      {media.length > 1 && (
                        <div className="feed-carousel-controls">
                          <button
                            disabled={mediaIndex === 0}
                            onClick={() => setMediaIndexes((state) => ({ ...state, [post.id]: mediaIndex - 1 }))}
                          >
                            <ChevronLeft />
                          </button>
                          <div>
                            {media.map((item, itemIndex) => (
                              <button
                                key={item.id}
                                className={mediaIndex === itemIndex ? 'active' : ''}
                                onClick={() => setMediaIndexes((state) => ({ ...state, [post.id]: itemIndex }))}
                              />
                            ))}
                          </div>
                          <button
                            disabled={mediaIndex === media.length - 1}
                            onClick={() => setMediaIndexes((state) => ({ ...state, [post.id]: mediaIndex + 1 }))}
                          >
                            <ChevronRight />
                          </button>
                        </div>
                      )}

                      <div className="facebook-counts">
                        <span>{post.like_count > 0 && <>💚 {post.like_count.toLocaleString()}</>}</span>
                        <button onClick={() => openViewer(post.id, true)}>
                          {post.comment_count} {t('social.comments')}
                        </button>
                        <span>{post.share_count} shares</span>
                      </div>

                      <div className="facebook-actions">
                        <button
                          disabled={busyPost === post.id}
                          className={post.is_liked ? 'liked' : ''}
                          onClick={() => interact(post.id, 'like')}
                        >
                          <Heart fill={post.is_liked ? 'currentColor' : 'none'} /> {t('social.like')}
                        </button>
                        <button onClick={() => openViewer(post.id, true)}>
                          <MessageCircle /> {t('social.comment')}
                        </button>
                        <button onClick={() => interact(post.id, 'share')}>
                          <Send /> {t('social.share')}
                        </button>
                        {post.business_name && (
                          <button className="facebook-book" onClick={() => navigate('/profile')}>
                            {t('feed.exploreBook')}
                          </button>
                        )}
                        <button className="facebook-boost" onClick={() => setBoostPost(post)}>
                          <Zap />
                        </button>
                      </div>
                    </motion.article>
                    {(index + 1) % 5 === 0 && <InFeedAd ad={inFeedAd} />}
                  </Fragment>
                );
              })}
            </section>
          )}
        </section>

        <aside className="feed-right-rail">
          <div className="sidebar-label">
            <span>{t('common.sponsored')}</span>
            <small>300 × 250</small>
          </div>
          <SidebarAd ad={sidebarAd} />
          <div className="right-rail-card">
            <span>Live in Cambodia</span>
            <h3>{t('social.everyProvince')}</h3>
            <div>
              {provinces.slice(0, 4).map((province) => (
                <button key={province.id} onClick={() => navigate(`/discover?q=${province.name}`)}>
                  <span>{province.icon}</span>
                  <strong>{language === 'kh' ? province.name_kh : province.name}</strong>
                  <small>{province.explorers?.toLocaleString()} explorers</small>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <PostViewer
        post={viewerPost}
        initialCommentsOpen={viewerComments}
        onClose={closeViewer}
        onInteract={(id, action) => interact(id, action)}
        onFollow={toggleFollow}
        onComment={() => fetchFeed(false)}
      />
      <BoostModal post={boostPost} onClose={() => setBoostPost(null)} onComplete={() => fetchFeed(false)} />
    </div>
  );
}
