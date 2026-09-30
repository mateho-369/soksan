import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Check, X, Megaphone, Gem, ScrollText, Inbox } from 'lucide-react';
import { apiFetch } from '../lib/http';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState } from '../components/States';
import type { Business, Post } from '../types';
import '../styles/admin.css';

type Tab = 'posts' | 'businesses' | 'placements' | 'gem' | 'audit';

interface Placement {
  id: number;
  business_name: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

interface AuditRow {
  id: number;
  user_name: string;
  action: string;
  subject: string;
  created_at: string;
}

/**
 * Phase 5 — in-app admin behind role:admin. The REAL gate is server-side
 * (middleware('role:admin')); this client check only shapes the UI.
 * Everything done here lands in the audit log.
 */
export default function AdminPanel() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('posts');
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [pendingBusinesses, setPendingBusinesses] = useState<Business[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [gemPostId, setGemPostId] = useState('');
  const [gemNote, setGemNote] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [postsRes, businessesRes, placementsRes, auditRes] = await Promise.all([
        apiFetch('/admin/posts/pending'),
        apiFetch('/admin/businesses/pending'),
        apiFetch('/admin/placements'),
        apiFetch('/admin/audit-logs'),
      ]);
      if (postsRes.ok) setPendingPosts(await postsRes.json());
      if (businessesRes.ok) setPendingBusinesses(await businessesRes.json());
      if (placementsRes.ok) setPlacements(await placementsRes.json());
      if (auditRes.ok) setAudit(await auditRes.json());
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!user) {
    return (
      <div className="admin-page">
        <div className="admin-gate">
          <ShieldCheck size={26} />
          <h1>{t('admin.title')}</h1>
          <Link className="admin-cta" to="/login">
            {t('auth.loginAction')}
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-gate" role="alert">
          <ShieldCheck size={26} />
          <h1>{t('admin.title')}</h1>
          <p>{t('admin.forbidden')}</p>
        </div>
      </div>
    );
  }

  const act = async (path: string, payload: unknown, message: string) => {
    const res = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setNotice(message);
      await refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setNotice((data as { error?: string }).error || 'Action failed');
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof Inbox }> = [
    { id: 'posts', label: `${t('admin.pendingPosts')} (${pendingPosts.length})`, icon: Inbox },
    { id: 'businesses', label: `${t('admin.pendingBusinesses')} (${pendingBusinesses.length})`, icon: ShieldCheck },
    { id: 'placements', label: t('admin.placements'), icon: Megaphone },
    { id: 'gem', label: t('admin.hiddenGem'), icon: Gem },
    { id: 'audit', label: t('admin.auditLog'), icon: ScrollText },
  ];

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <span className="eyebrow">
          <ShieldCheck size={14} /> {t('admin.eyebrow')}
        </span>
        <h1>{t('admin.title')}</h1>
      </div>

      <nav className="admin-tabs" aria-label={t('admin.title')}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'active' : ''}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={15} /> {item.label}
          </button>
        ))}
      </nav>

      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}

      {loading ? (
        <LoadingState compact />
      ) : (
        <>
          {tab === 'posts' && (
            <section className="admin-queue">
              {pendingPosts.length === 0 && <p className="admin-empty">{t('admin.queueEmpty')}</p>}
              {pendingPosts.map((post) => (
                <article key={post.id} className="admin-item">
                  <div>
                    <strong>{post.location_name}</strong>
                    <small>
                      {post.author.name} · {post.province}
                    </small>
                    <p>{post.caption_en}</p>
                  </div>
                  <div className="admin-item-actions">
                    <button
                      type="button"
                      className="approve"
                      onClick={() =>
                        void act(
                          '/admin/posts/approve',
                          { post_id: post.id },
                          t('admin.approvedNotice'),
                        )
                      }
                    >
                      <Check size={15} /> {t('admin.approve')}
                    </button>
                    <button
                      type="button"
                      className="reject"
                      onClick={() =>
                        void act(
                          '/admin/posts/reject',
                          { post_id: post.id },
                          t('admin.rejectedNotice'),
                        )
                      }
                    >
                      <X size={15} /> {t('admin.reject')}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}

          {tab === 'businesses' && (
            <section className="admin-queue">
              {pendingBusinesses.length === 0 && <p className="admin-empty">{t('admin.queueEmpty')}</p>}
              {pendingBusinesses.map((business) => (
                <article key={business.id} className="admin-item">
                  <div>
                    <strong>{business.name}</strong>
                    <small>
                      {business.category} · {business.place_name}
                    </small>
                    <p>{business.description}</p>
                  </div>
                  <div className="admin-item-actions">
                    <button
                      type="button"
                      className="approve"
                      onClick={() =>
                        void act(
                          '/admin/businesses/approve',
                          { business_id: business.id },
                          t('admin.approvedNotice'),
                        )
                      }
                    >
                      <Check size={15} /> {t('admin.approve')}
                    </button>
                    <button
                      type="button"
                      className="reject"
                      onClick={() =>
                        void act(
                          '/admin/businesses/reject',
                          { business_id: business.id },
                          t('admin.rejectedNotice'),
                        )
                      }
                    >
                      <X size={15} /> {t('admin.reject')}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}

          {tab === 'placements' && (
            <section className="admin-queue">
              <p className="admin-hint">{t('admin.placementsHint')}</p>
              {placements.map((placement) => (
                <article key={placement.id} className="admin-item">
                  <div>
                    <strong>{placement.business_name}</strong>
                    <small>
                      {placement.starts_at ? new Date(placement.starts_at).toLocaleDateString() : '—'} →{' '}
                      {placement.ends_at ? new Date(placement.ends_at).toLocaleDateString() : t('admin.openEnded')}
                    </small>
                  </div>
                  <div className="admin-item-actions">
                    <button
                      type="button"
                      className={placement.active ? 'reject' : 'approve'}
                      onClick={() =>
                        void act(
                          '/admin/placements/update',
                          { id: placement.id, active: !placement.active },
                          t('admin.placementUpdated'),
                        )
                      }
                    >
                      {placement.active ? t('admin.deactivate') : t('admin.activate')}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}

          {tab === 'gem' && (
            <section className="admin-gem">
              <p className="admin-hint">{t('admin.gemHint')}</p>
              <label>
                {t('admin.gemPostId')}
                <input value={gemPostId} onChange={(e) => setGemPostId(e.target.value)} inputMode="numeric" />
              </label>
              <label>
                {t('admin.gemNote')}
                <input value={gemNote} onChange={(e) => setGemNote(e.target.value)} />
              </label>
              <button
                type="button"
                className="admin-cta"
                disabled={!gemPostId.trim()}
                onClick={() =>
                  void act(
                    '/admin/hidden-gem',
                    { post_id: Number(gemPostId), note: gemNote },
                    t('admin.gemPicked'),
                  )
                }
              >
                <Gem size={15} /> {t('admin.pickGem')}
              </button>
            </section>
          )}

          {tab === 'audit' && (
            <section className="admin-queue">
              {audit.length === 0 && <p className="admin-empty">{t('admin.auditEmpty')}</p>}
              {audit.map((row) => (
                <article key={row.id} className="admin-item admin-audit-row">
                  <div>
                    <strong>{row.action}</strong>
                    <small>{row.subject}</small>
                  </div>
                  <small>
                    {row.user_name} · {new Date(row.created_at).toLocaleString()}
                  </small>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
