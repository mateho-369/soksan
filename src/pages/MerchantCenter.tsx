import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  Plus,
  CircleDollarSign,
  Eye,
  TrendingUp,
  Zap,
  MapPinned,
  ChartColumn,
  Sparkles,
  Ellipsis,
} from 'lucide-react';
import { LoadingState, ErrorState } from '../components/States';
import BoostModal from '../components/BoostModal';
import type { Campaign, Province, Post } from '../types';

interface Dashboard {
  campaigns: Campaign[];
  provinces: Province[];
  posts: Post[];
}

export default function MerchantCenter() {
  const [data, setData] = useState<Dashboard>({ campaigns: [], provinces: [], posts: [] });
  const [boostPost, setBoostPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/boosts');
      if (!res.ok) throw new Error('Merchant insights are unavailable');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(
    () => ({
      spend: data.campaigns.reduce((sum, campaign) => sum + Number(campaign.budget), 0),
      views: data.campaigns.reduce((sum, campaign) => sum + Number(campaign.expected_views), 0),
      active: data.campaigns.filter((campaign) => campaign.status === 'active').length,
    }),
    [data.campaigns],
  );

  if (loading) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="merchant-page page-shell">
      <section className="merchant-hero">
        <div>
          <span className="eyebrow">
            <Megaphone /> Tourism business center · paid visibility
          </span>
          <h1>Grow locally, welcome thoughtfully.</h1>
          <p>
            Optional paid promotion for verified home-stays, hotels, guides, transport providers, cafes, and tourism
            brands. Everyday social use stays free.
          </p>
        </div>
        <button onClick={() => setBoostPost(data.posts[0] || null)}>
          <Plus /> Create a business boost
        </button>
      </section>

      <section className="merchant-metrics">
        <div>
          <span>
            <CircleDollarSign />
          </span>
          <small>Business campaign spend</small>
          <strong>${metrics.spend.toFixed(2)}</strong>
          <em>Transparent local billing</em>
        </div>
        <div>
          <span>
            <Eye />
          </span>
          <small>Expected views</small>
          <strong>{metrics.views.toLocaleString()}</strong>
          <em>
            <TrendingUp /> Across targeted provinces
          </em>
        </div>
        <div>
          <span>
            <Zap />
          </span>
          <small>Active paid campaigns</small>
          <strong>{metrics.active}</strong>
          <em>Featured gems live now</em>
        </div>
        <div>
          <span>
            <MapPinned />
          </span>
          <small>Province reach</small>
          <strong>{data.provinces.length}</strong>
          <em>Cambodian travel regions</em>
        </div>
      </section>

      <section className="merchant-dashboard-grid">
        <div className="merchant-campaigns">
          <header>
            <div>
              <span className="eyebrow">
                <ChartColumn /> Business performance
              </span>
              <h2>Your promoted business stories</h2>
            </div>
            <button onClick={() => setBoostPost(data.posts[0] || null)}>Boost another business post</button>
          </header>
          {data.campaigns.length === 0 ? (
            <div className="empty-campaigns">
              <Sparkles />
              <h3>Share your first featured business gem</h3>
              <p>Paid visibility starts at $5; posting and all traveler social features remain free.</p>
            </div>
          ) : (
            <div className="campaign-list">
              {data.campaigns.map((campaign, index) => (
                <motion.article
                  key={campaign.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <img src={campaign.post?.media_url} alt="" />
                  <div className="campaign-main">
                    <span>
                      <i /> {campaign.status} · {campaign.province}
                    </span>
                    <strong>{campaign.post?.location_name || 'Local travel story'}</strong>
                    <small>{campaign.target_type.replaceAll('_', ' ')}</small>
                  </div>
                  <div className="campaign-stat">
                    <small>Reach</small>
                    <strong>{campaign.expected_views.toLocaleString()}</strong>
                  </div>
                  <div className="campaign-stat">
                    <small>Business budget</small>
                    <strong>${Number(campaign.budget).toFixed(0)}</strong>
                  </div>
                  <button>
                    <Ellipsis />
                  </button>
                </motion.article>
              ))}
            </div>
          )}
        </div>
        <aside className="merchant-post-picker">
          <span className="eyebrow">
            <Sparkles /> Business visibility
          </span>
          <h2>Choose a business story to promote</h2>
          <p>Boosting is optional and business-only. Meaningful visuals and honest local details perform best.</p>
          <div>
            {data.posts.slice(0, 3).map((post) => (
              <button key={post.id} onClick={() => setBoostPost(post)}>
                <img src={post.media_url} alt="" />
                <span>
                  <strong>{post.location_name}</strong>
                  <small>{post.province}</small>
                </span>
                <Zap />
              </button>
            ))}
          </div>
        </aside>
      </section>

      <BoostModal post={boostPost} onClose={() => setBoostPost(null)} onComplete={load} />
    </div>
  );
}
