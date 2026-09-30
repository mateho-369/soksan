// Client-side API layer that mirrors the SokSan Network backend.
// Intercepts fetch('/api/...') calls and serves the same JSON contracts
// with in-memory state so every interaction works end to end.
// ─── DEMO SEAM ────────────────────────────────────────────────────────────
// All seed content lives in src/demo/ (see src/demo/README.md). Delete that
// folder and this file when the real backend takes over.
import postsSeed from '../demo/data/posts.json';
import categoriesSeed from '../demo/data/categories.json';
import adsSeed from '../demo/data/ads.json';
import destinationsSeed from '../demo/data/destinations.json';
import itinerariesSeed from '../demo/data/itineraries.json';
import profileSeed from '../demo/data/profile.json';
import servicesSeed from '../demo/data/services.json';
import contactsSeed from '../demo/data/contacts.json';
import conversationsSeed from '../demo/data/conversations.json';
import partnersSeed from '../demo/data/partners.json';
import boostsSeed from '../demo/data/boosts.json';
import rankingsSeed from '../demo/data/rankings.json';
import geographySeed from '../demo/data/geography.json';
import commentsSeed from '../demo/data/comments.json';
import businessesSeed from '../demo/data/businesses.json';
import leadEventsSeed from '../demo/data/lead_events.json';
import type { Business, BusinessSubscription, KhqrInvoice, LeadEventType } from '../types';
import type {
  Post,
  Comment,
  CommentAsset,
  Conversation,
  Message,
  Destination,
  Itinerary,
  Campaign,
  Partner,
  PartnerCategory,
  Province,
} from '../types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/* ------------------------------- state ---------------------------------- */

const posts: Post[] = clone(postsSeed) as unknown as Post[];
const categories = clone(categoriesSeed);
const ads = clone(adsSeed);

/**
 * Phase 5 moderation pipeline: only `published` posts (or legacy posts
 * with no status field) ever reach the public feed or clips.
 */
const visiblePosts = (): Post[] => posts.filter((p) => !p.status || p.status === 'published');

/* ------------------------- admin state (Phase 5) ------------------------ */
interface AuditLogRow {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  subject: string;
  created_at: string;
}
const auditLogs: AuditLogRow[] = [];
let nextAuditLogId = 1;
const recordAudit = (user: MockUser, action: string, subject: string) => {
  auditLogs.unshift({
    id: nextAuditLogId++,
    user_id: user.id,
    user_name: user.name,
    action,
    subject,
    created_at: nowISO(),
  });
};
/** Hidden Gem of the Week — editorial pick, never ranking. */
let currentHiddenGem: { post_id: number; note: string; picked_by: string; week_start: string } | null = null;

/* ------------------------- trip planner (Phase 6) ----------------------- */
/** Mirrors backend TripService: ordered published-post lists, shared by slug. */
interface TripItemRow {
  id: number;
  post_id: number;
  sort_order: number;
}
interface TripListRow {
  id: number;
  user_id: number;
  title: string;
  slug: string;
  description: string;
  is_public: boolean;
  items: TripItemRow[];
  created_at: string;
  updated_at: string;
}
const tripLists: TripListRow[] = [];
let nextTripId = 1;
let nextTripItemId = 1;
const tripSlug = () =>
  Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);

/* Phase 6 — Trending Now mirrors backend TrendingService: same engagement
 * weighting as rankings but a 3-day half-life inside a 14-day window. */
export const TRENDING_HALF_LIFE_DAYS = 3;
export const TRENDING_WINDOW_DAYS = 14;
const trendScore = (post: Post, now: Date): number => {
  const ageDays = Math.max(0, (now.getTime() - new Date(post.created_at).getTime()) / 86400000);
  const engagement = 1 + post.like_count + 2 * post.comment_count + post.share_count + (post.view_count ?? 0) / 100;
  return engagement * Math.pow(0.5, ageDays / TRENDING_HALF_LIFE_DAYS);
};

/* ------------------ contributor levels & badges (Phase 7) -------------- */
/** Mirrors backend ContributorService. Quality, not quantity — comments
 * weigh most, and everything is derived live from PUBLISHED posts. */
export interface ContributorLevel {
  floor: number;
  key: string;
  label: string;
}
export const CONTRIBUTOR_LEVELS: ContributorLevel[] = [
  { floor: 0, key: 'seedling', label: 'Seedling' },
  { floor: 50, key: 'explorer', label: 'Explorer' },
  { floor: 200, key: 'local_guide', label: 'Local Guide' },
  { floor: 600, key: 'storyteller', label: 'Storyteller' },
  { floor: 1500, key: 'ambassador', label: 'Ambassador' },
];
export const CONTRIBUTOR_FORMULA =
  'points = likes*1 + comments*3 + shares*2 + views/50, over published posts';
const contributorSummary = (userId: number) => {
  // Same visibility rule as the feed: seeded legacy posts have no status
  // field and count as published.
  const published = posts.filter(
    (p) => p.profile_id === userId && (!p.status || p.status === 'published'),
  );
  const points = published.reduce(
    (sum, p) => sum + p.like_count + 3 * p.comment_count + 2 * p.share_count + (p.view_count ?? 0) / 50,
    0,
  );
  let level = CONTRIBUTOR_LEVELS[0];
  let next: (typeof CONTRIBUTOR_LEVELS)[number] | null = null;
  for (const candidate of CONTRIBUTOR_LEVELS) {
    if (points >= candidate.floor) level = candidate;
  }
  for (const candidate of CONTRIBUTOR_LEVELS) {
    if (points < candidate.floor) {
      next = candidate;
      break;
    }
  }
  const likesReceived = published.reduce((sum, p) => sum + p.like_count, 0);
  const badges: string[] = [];
  if (published.length >= 1) badges.push('first_story');
  if (published.length >= 10) badges.push('prolific');
  if (likesReceived >= 100) badges.push('beloved');
  if (published.reduce((sum, p) => sum + p.share_count, 0) >= 50) badges.push('word_spreader');
  // Phase 8 — badge-only referral reward.
  const referredSignups = mockUsers.filter((u) => u.referred_by_user_id === userId).length;
  if (referredSignups >= 1) badges.push('welcomer');
  return {
    quality_points: Math.round(points * 10) / 10,
    level: { floor: level.floor, key: level.key, label: level.label },
    next_level: next ? { floor: next.floor, key: next.key, label: next.label } : null,
    badges,
    referred_signups: referredSignups,
    formula: CONTRIBUTOR_FORMULA,
  };
};

/** Stable unique 8-char invite code (mirrors ReferralService). */
const referralCode = (): string => {
  let code = '';
  do {
    code = (Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6)).toUpperCase();
  } while (mockUsers.some((u) => u.referral_code === code));
  return code;
};

/* ----------------------- collections (Phase 7) -------------------------- */
/** Public community curation (always public, browsable). Published posts only. */
interface CollectionRow {
  id: number;
  user_id: number;
  title: string;
  slug: string;
  description: string;
  post_ids: number[];
  created_at: string;
  updated_at: string;
}
const collections: CollectionRow[] = [];
let nextCollectionId = 1;
const collectionSlug = () =>
  Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
const collectionPayload = (collection: CollectionRow) => {
  const owner = mockUsers.find((u) => u.id === collection.user_id);
  return {
    id: collection.id,
    title: collection.title,
    slug: collection.slug,
    description: collection.description,
    posts_count: collection.post_ids.length,
    created_at: collection.created_at,
    updated_at: collection.updated_at,
    owner: owner ? publicUser(owner) : null,
  };
};
const collectionDetail = (collection: CollectionRow) => ({
  ...collectionPayload(collection),
  items: collection.post_ids
    .map((id) => visiblePosts().find((p) => p.id === id))
    .filter((p): p is Post => Boolean(p))
    .map((post, index) => ({ id: post.id, sort_order: index + 1, post: clone(post) })),
});

/* ------------------ duplicate-place detection (Phase 7) ----------------- */
/** Candidate = same commune AND (near-identical name). Merges happen ONLY
 * through the admin-confirmed endpoint and are audited. */
const normalizePlaceName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9\u1780-\u17ff]+/g, ' ').replace(/\s+/g, ' ').trim();
const duplicateCandidates = () => {
  const published = visiblePosts();
  const pairs: Array<{
    a: { id: number; name: string; commune_id: number | null };
    b: { id: number; name: string; commune_id: number | null };
    reason: string;
  }> = [];
  for (let i = 0; i < published.length; i += 1) {
    for (let j = i + 1; j < published.length; j += 1) {
      const a = published[i];
      const b = published[j];
      if (!a.commune_id || a.commune_id !== b.commune_id) continue;
      if (normalizePlaceName(a.location_name) === normalizePlaceName(b.location_name)) {
        pairs.push({
          a: { id: a.id, name: a.location_name, commune_id: a.commune_id },
          b: { id: b.id, name: b.location_name, commune_id: b.commune_id },
          reason: 'same name',
        });
      }
    }
  }
  return pairs;
};
const destinations: Destination[] = clone(destinationsSeed) as unknown as Destination[];
const itineraries: Itinerary[] = clone(itinerariesSeed) as unknown as Itinerary[];
const profile = clone(profileSeed);
const services = clone(servicesSeed);
const contacts = clone(contactsSeed);
const partnersData = clone(partnersSeed) as unknown as {
  partners: Partner[];
  categories: PartnerCategory[];
  provinces: Province[];
};
const boostsData = clone(boostsSeed) as unknown as {
  campaigns: Campaign[];
  provinces: Province[];
  posts: Post[];
};
const rankings = clone(rankingsSeed) as unknown as Record<
  string,
  { filters: unknown[]; provinces: unknown[]; active_filter: string }
>;
const commentsByPost: Record<string, Comment[]> = (clone(commentsSeed) as { comments: Record<string, Comment[]> })
  .comments;
const commentAssets: CommentAsset[] = (clone(commentsSeed) as { assets: CommentAsset[] }).assets;

const conversations: Conversation[] = clone(conversationsSeed) as unknown as Conversation[];

/* --------------------------- auth (mock users) --------------------------- */
// The in-browser demo backend keeps a tiny user table so the full auth flow
// (register / login / bearer tokens / guarded mutations) works end to end
// against the same contract the Laravel API exposes.

interface MockUser {
  id: number;
  name: string;
  name_kh: string | null;
  email: string;
  password: string;
  avatar_url: string;
  role: 'user' | 'admin';
  /** Phase 8 — badge-only referral: a stable code plus who invited you. */
  referral_code: string;
  referred_by_user_id: number | null;
}

const mockUsers: MockUser[] = [
  {
    id: 3,
    name: 'Dara Sok',
    name_kh: 'ដារ៉ា សុខ',
    email: 'dara@soksan.app',
    password: 'soksan123',
    avatar_url: '/images/traveler-dara.jpg',
    role: 'user',
    referral_code: 'DARASOK3',
    referred_by_user_id: null,
  },
  {
    // Phase 5: in-app admin behind role:admin.
    id: 4,
    name: 'Soksan Admin',
    name_kh: 'អ្នកគ្រប់គ្រង សុខសាន្ត',
    email: 'admin@soksan.app',
    password: 'soksan123',
    avatar_url: '/images/traveler-dara.jpg',
    role: 'admin',
    referral_code: 'SOKSADM4',
    referred_by_user_id: null,
  },
];
let nextUserId = 100;

const publicUser = (user: MockUser) => ({
  id: user.id,
  name: user.name,
  name_kh: user.name_kh,
  email: user.email,
  avatar_url: user.avatar_url,
  role: user.role,
});

// Tokens are stateless (`mock-token-<userId>`) so a stored session survives a
// page reload without server-side state — mirroring how the real API resolves
// bearer tokens via the database.
const bearerUser = (init?: RequestInit): MockUser | null => {
  const header = new Headers(init?.headers).get('Authorization');
  const match = header?.match(/^Bearer mock-token-(\d+)$/);
  if (!match) return null;
  return mockUsers.find((user) => user.id === Number(match[1])) || null;
};

const unauthorized = () => jsonResponse({ message: 'Please log in to do that.' }, 401);

const nowISO = () => new Date().toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const messagesByConversation: Record<number, Message[]> = {
  1: [
    {
      id: 101,
      conversation_id: 1,
      sender_type: 'them',
      body: 'Good morning! The forest trail is clear this week — mornings are the quietest.',
      message_type: 'text',
      place_id: null,
      created_at: minutesAgo(46),
      place: null,
      pin: null,
    },
    {
      id: 102,
      conversation_id: 1,
      sender_type: 'me',
      body: 'Perfect. Which meeting point do you recommend for the first day?',
      message_type: 'text',
      place_id: null,
      created_at: minutesAgo(41),
      place: null,
      pin: null,
    },
    {
      id: 103,
      conversation_id: 1,
      sender_type: 'them',
      body: 'Pinned location: Chi Phat Community',
      message_type: 'location',
      place_id: 1,
      created_at: minutesAgo(38),
      place: null,
      pin: { destination: destinations.find((d) => d.id === 1) },
    },
  ],
  2: [
    {
      id: 201,
      conversation_id: 2,
      sender_type: 'me',
      body: 'Hi Malis! Two of us arrive Friday evening — is the riverside homestay free?',
      message_type: 'text',
      place_id: null,
      created_at: minutesAgo(32),
      place: null,
      pin: null,
    },
    {
      id: 202,
      conversation_id: 2,
      sender_type: 'them',
      body: 'Yes! And the sunset kayaks will be ready for you both.',
      message_type: 'text',
      place_id: null,
      created_at: minutesAgo(24),
      place: null,
      pin: null,
    },
    {
      id: 203,
      conversation_id: 2,
      sender_type: 'them',
      body: 'I saved a quiet riverside room for you.',
      message_type: 'text',
      place_id: null,
      created_at: minutesAgo(18),
      place: null,
      pin: null,
    },
  ],
  3: [
    {
      id: 301,
      conversation_id: 3,
      sender_type: 'me',
      body: 'A place for our journey: Bousra Highlands',
      message_type: 'place',
      place_id: 3,
      created_at: minutesAgo(70),
      place: destinations.find((d) => d.id === 3) || null,
      pin: null,
    },
    {
      id: 302,
      conversation_id: 3,
      sender_type: 'them',
      body: 'Adding it to the list — the eastern ridge at dawn is special.',
      message_type: 'text',
      place_id: null,
      created_at: minutesAgo(62),
      place: null,
      pin: null,
    },
  ],
  4: [
    {
      id: 401,
      conversation_id: 4,
      sender_type: 'them',
      body: 'Three days in the Cardamoms?',
      message_type: 'text',
      place_id: null,
      created_at: '2026-03-09T15:00:00+00:00',
      place: null,
      pin: null,
    },
  ],
};

// Keep the conversation previews aligned with the seeded threads.
const conv3 = conversations.find((c) => c.id === 3);
if (conv3) conv3.last_message = 'Adding it to the list — the eastern ridge at dawn is special.';

let nextCommentId = 1000;
let nextMessageId = 1000;
let nextPostId = 1000;
let nextMediaId = 5000;
let nextCampaignId = 1000;

/* --------------------------- businesses (Phase 3) ----------------------- */
// Owner dashboard + two-tier registration (free Verified, paid Boosted via
// Bakong KHQR). Mirrors the Laravel BusinessService/BakongService contract.
const businesses: Business[] = clone(businessesSeed.businesses) as unknown as Business[];
const businessSubscriptions: BusinessSubscription[] = clone(
  businessesSeed.subscriptions,
) as unknown as BusinessSubscription[];
let nextBusinessId = 100;
let nextSubscriptionId = 100;
let nextInvoiceSeq = 1000;

/** Single source of truth for the Boosted price in the demo seam. */
export const DEMO_BOOSTED_PRICE_USD = 9.9;

const attachSubscription = (business: Business): Business => ({
  ...business,
  subscription: businessSubscriptions.find((sub) => sub.business_id === business.id) || null,
});

/** Demo KHQR payload. Production: BakongService returns the real EMV string. */
const buildKhqrPayload = (invoiceRef: string, amountUsd: number, merchant: string): string =>
  [
    'KHQR', // payment rail
    'BAKONG', // acquirer (demo)
    merchant.replace(/\s+/g, '').slice(0, 20).toUpperCase(),
    invoiceRef,
    amountUsd.toFixed(2),
    'USD',
  ].join('|');

/* ------------------------------ leads (Phase 4) ------------------------- */
// Call / Message / Directions taps on a business profile. Owners read the
// 7-day summary; nothing here feeds ranking (ranking reads posts only).
interface LeadEventRow {
  id: number;
  business_id: number;
  event_type: LeadEventType;
  created_at: string;
}
const leadEvents: LeadEventRow[] = clone(leadEventsSeed.events) as unknown as LeadEventRow[];
let nextLeadEventId = 100;

/** Admin date window check — mirrors PartnerPlacementService::activeAt(). */
export const isPlacementActive = (
  partner: Pick<Partner, 'active' | 'starts_at' | 'ends_at'>,
  at: Date = new Date(),
): boolean => {
  if (!partner.active) return false;
  if (partner.starts_at && new Date(partner.starts_at).getTime() > at.getTime()) return false;
  if (partner.ends_at && new Date(partner.ends_at).getTime() <= at.getTime()) return false;
  return true;
};

/* ------------------------------ helpers --------------------------------- */

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const matchesSearch = (post: Post, term: string) => {
  const q = term.toLowerCase();
  return (
    post.location_name.toLowerCase().includes(q) ||
    post.province.toLowerCase().includes(q) ||
    post.caption_en.toLowerCase().includes(q) ||
    post.caption_kh.includes(term) ||
    (post.hashtags || '').toLowerCase().includes(q)
  );
};

const applyFollowState = (profileId: number, following: boolean) => {
  posts.forEach((p) => {
    if (p.author.id === profileId) p.author.is_following = following;
  });
};

const paymentRef = (prefix: string) => `${prefix}-${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;

/* ------------------------------ handlers -------------------------------- */

async function handleApi(url: URL, init?: RequestInit): Promise<Response> {
  // Versioned API: /api/v1/<resource> dispatches to the same handlers the
  // demo backend originally served under /api/<resource>.
  const path = url.pathname.replace(/^\/api\/v1(?=\/)/, '/api');
  const method = (init?.method || 'GET').toUpperCase();
  const body = init?.body ? JSON.parse(String(init.body)) : null;

  await wait(method === 'GET' ? 220 : 420);

  /* ---- auth ---- */
  if (path === '/api/auth/register' && method === 'POST') {
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (name.length < 2) {
      return jsonResponse({ message: 'Please tell us your name (at least 2 characters).' }, 422);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ message: 'That email address does not look right.' }, 422);
    }
    if (password.length < 8) {
      return jsonResponse({ message: 'Password must be at least 8 characters.' }, 422);
    }
    if (mockUsers.some((user) => user.email === email)) {
      return jsonResponse({ message: 'An account with this email already exists.' }, 422);
    }
    // Phase 8 — badge-only referral: an unknown/absent invite code never
    // blocks signup, it just isn't linked.
    const referredBy = mockUsers.find(
      (candidate) =>
        candidate.referral_code === String(body?.referral_code || '').trim().toUpperCase(),
    );
    const user: MockUser = {
      id: nextUserId++,
      name,
      name_kh: null,
      email,
      password,
      avatar_url: '/images/traveler-dara.jpg',
      role: 'user',
      referral_code: referralCode(),
      referred_by_user_id: referredBy ? referredBy.id : null,
    };
    mockUsers.push(user);
    const token = `mock-token-${user.id}`;
    return jsonResponse({ token, user: publicUser(user) }, 201);
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const email = String(body?.email || '').trim().toLowerCase();
    const user = mockUsers.find((candidate) => candidate.email === email);
    if (!user || user.password !== String(body?.password || '')) {
      return jsonResponse({ message: 'Email or password is incorrect.' }, 422);
    }
    const token = `mock-token-${user.id}`;
    return jsonResponse({ token, user: publicUser(user) });
  }

  if (path === '/api/auth/me' && method === 'GET') {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    return jsonResponse(publicUser(user));
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    return jsonResponse({ ok: true });
  }

  /* ---- posts ---- */
  if (path === '/api/posts') {
    if (method === 'GET') {
      if (url.searchParams.get('format') === 'clips') {
        const clips = visiblePosts().filter(
          (p) => p.media.some((m) => m.media_type === 'video') || p.media_type === 'video',
        );
        // TikTok-style paginated feed: page size 3, empty page = end of feed.
        const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
        const pageSize = 3;
        const start = (page - 1) * pageSize;
        return jsonResponse(clone(clips.slice(start, start + pageSize)));
      }
      let list = [...visiblePosts()];
      const category = url.searchParams.get('category');
      const search = url.searchParams.get('search');
      if (category) list = list.filter((p) => p.category === category);
      if (search) list = list.filter((p) => matchesSearch(p, search));
      return jsonResponse(clone(list));
    }
    if (method === 'PUT') {
      const post = posts.find((p) => p.id === body.id);
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      if (body.action === 'view') {
        // View counting is public and cheap; the real backend does this with
        // a Redis INCR flushed to Postgres in batches.
        post.view_count = (post.view_count || 0) + 1;
        return jsonResponse({ ok: true, view_count: post.view_count });
      }
      if (!bearerUser(init)) return unauthorized();
      if (body.action === 'like') {
        post.is_liked = !post.is_liked;
        post.like_count = Math.max(0, post.like_count + (post.is_liked ? 1 : -1));
      }
      if (body.action === 'share') post.share_count += 1;
      if (body.action === 'comment') post.comment_count += 1;
      if (body.action === 'save') post.is_saved = !post.is_saved;
      return jsonResponse({ ok: true, is_saved: post.is_saved });
    }
    if (method === 'POST') {
      const user = bearerUser(init);
      if (!user) return unauthorized();
      const media = (body.media || []).map(
        (m: { media_url: string; media_type: 'image' | 'video'; duration_seconds: number }, i: number) => ({
          id: nextMediaId++,
          post_id: nextPostId,
          media_url: m.media_url,
          media_type: m.media_type,
          sort_order: i,
          duration_seconds: m.duration_seconds || null,
        }),
      );
      // The authenticated user becomes the author of their own post.
      const author: Post['author'] = {
        id: user.id,
        name: user.name,
        name_kh: user.name_kh,
        handle: `@${user.email.split('@')[0]}`,
        avatar_url: user.avatar_url,
        cover_url: '',
        verified: false,
        location: 'Cambodia',
        bio_en: '',
        bio_kh: '',
        expertise: '',
        badges: [],
        followers: 0,
        following: 0,
        posts_count: 0,
        is_following: false,
      };
      // Commune tagging: district/province derive from the commune, so the
      // hierarchy can never disagree with itself.
      const pickedCommune = (geographySeed.communes as Array<{ id: number; name: string }>).find(
        (c) => c.id === Number(body.commune_id),
      );
      const derivedProvince = pickedCommune ? geoProvinceOf(pickedCommune.id)?.name : undefined;
      // Phase 5 first-post gate (mirrors backend PostService): an account
      // with no published posts gets its FIRST post held for admin review.
      const firstPostGate = !posts.some(
        (p) => p.profile_id === user.id && (!p.status || p.status === 'published'),
      );
      const post: Post = {
        id: nextPostId++,
        profile_id: user.id,
        status: firstPostGate ? 'pending_review' : 'published',
        category: body.category,
        location_name: body.location_name,
        province: derivedProvince || body.province,
        commune_id: pickedCommune ? pickedCommune.id : null,
        commune_name: pickedCommune ? pickedCommune.name : undefined,
        // Phase 2: optional manual pin. In production the server verifies
        // business places via Google Places (backend PlacesService); regular
        // users may attach raw coordinates.
        lat: typeof body.latitude === 'number' ? body.latitude : null,
        lng: typeof body.longitude === 'number' ? body.longitude : null,
        media_url: media[0]?.media_url || '',
        media_type: media[0]?.media_type || 'image',
        caption_en: body.caption,
        caption_kh: body.caption,
        hashtags: `#${(body.province || '').replace(/\s+/g, '')} #SokSanNetwork`,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        view_count: 0,
        is_liked: false,
        is_saved: false,
        business_name: null,
        destination_id: null,
        created_at: nowISO(),
        author: clone(author),
        promotion: null,
        media,
      };
      posts.unshift(post);
      return jsonResponse(clone(post), 201);
    }
  }

  /* Phase 8 — public single post (share-card / deep-link landing page).
   * Mirrors backend GET /api/v1/posts/{post}: published only. */
  if (path.startsWith('/api/posts/') && method === 'GET') {
    const id = Number(path.slice('/api/posts/'.length));
    if (!Number.isInteger(id) || path.slice('/api/posts/'.length).includes('/')) {
      return jsonResponse({ error: 'Not found' }, 404);
    }
    const post = visiblePosts().find((p) => p.id === id);
    if (!post) return jsonResponse({ error: 'Post not found' }, 404);
    return jsonResponse(clone(post));
  }


  /* ---- Phase 1: geography + recency-decay rankings ------------------------
   Mirrors backend RankingService: score = (1 + likes + 2*comments + shares
   + views/100) * 0.5^(age_days / 21). Rolls up commune -> district ->
   province; national = provinces scope.                                      */
const GEO_HALF_LIFE_DAYS = 21;

interface GeoRow { id: number; name: string; name_kh: string | null; score: number; post_count: number }

function geoDistrictOf(communeId: number | undefined | null) {
  const commune = (geographySeed.communes as Array<{ id: number; district_id: number }>).find((c) => c.id === communeId);
  return (geographySeed.districts as Array<{ id: number; province_id: number; name: string; name_kh: string }>).find((d) => d.id === commune?.district_id);
}

function geoProvinceOf(communeId: number | undefined | null) {
  const district = geoDistrictOf(communeId);
  return (geographySeed.provinces as Array<{ id: number; name: string; name_kh: string }>).find((p) => p.id === district?.province_id);
}

function computeGeoRankings(scope: string, provinceId: number | null, limit: number): GeoRow[] {
  const now = Date.now();
  const tally = new Map<number, { score: number; post_count: number }>();

  for (const post of posts) {
    const ageDays = Math.max(0, (now - new Date(post.created_at).getTime()) / 86_400_000);
    const weight = Math.pow(0.5, ageDays / GEO_HALF_LIFE_DAYS);
    const engagement =
      1 + post.like_count + 2 * post.comment_count + post.share_count + (post.view_count || 0) / 100;

    let target: { id: number; name: string; name_kh: string | null } | undefined;
    if (scope === 'communes') {
      target = (geographySeed.communes as Array<{ id: number; name: string; name_kh: string }>).find((c) => c.id === post.commune_id);
    } else if (scope === 'districts') {
      target = geoDistrictOf(post.commune_id);
    } else {
      target = geoProvinceOf(post.commune_id);
    }
    if (!target) continue;
    if (provinceId !== null && geoProvinceOf(post.commune_id)?.id !== provinceId) continue;

    const entry = tally.get(target.id) || { score: 0, post_count: 0 };
    entry.score += engagement * weight;
    entry.post_count += 1;
    tally.set(target.id, entry);
  }

  return [...tally.entries()]
    .map(([id, entry]) => {
      const source =
        scope === 'communes' ? geographySeed.communes : scope === 'districts' ? geographySeed.districts : geographySeed.provinces;
      const named = (source as Array<{ id: number; name: string; name_kh: string }>).find((item) => item.id === id);
      return { id, name: named?.name || '', name_kh: named?.name_kh || null, score: Math.round(entry.score * 10) / 10, post_count: entry.post_count };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

  /* ---- categories / ads / rankings ---- */
  if (path === '/api/categories') return jsonResponse(clone(categories));

  if (path === '/api/ads') {
    const placement = url.searchParams.get('placement');
    const list = placement ? ads.filter((a: { placement: string }) => a.placement === placement) : ads;
    return jsonResponse(clone(list));
  }

  if (path === '/api/geography') return jsonResponse(clone(geographySeed));

  if (path === '/api/rankings/geography') {
    const scope = url.searchParams.get('scope') || 'provinces';
    if (!['communes', 'districts', 'provinces'].includes(scope)) {
      return jsonResponse({ error: 'scope must be communes, districts or provinces' }, 422);
    }
    const provinceParam = url.searchParams.get('province_id');
    const data = computeGeoRankings(
      scope,
      provinceParam !== null ? Number(provinceParam) : null,
      Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '25'))),
    ).map((row, index) => ({ ...row, rank: index + 1 }));
    return jsonResponse({ data, meta: { scope, half_life_days: GEO_HALF_LIFE_DAYS } });
  }

  if (path === '/api/rankings') {
    const filter = url.searchParams.get('filter') || 'visited';
    const snapshot = rankings[filter] || rankings.visited;
    return jsonResponse(clone(snapshot));
  }

  /* ---- destinations ---- */
  if (path === '/api/destinations') {
    let list = [...destinations];
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    if (category) list = list.filter((d) => d.category === category);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.province.toLowerCase().includes(q) ||
          d.description_en.toLowerCase().includes(q) ||
          d.name_kh.includes(search),
      );
    }
    return jsonResponse(clone(list));
  }

  if (path === '/api/itineraries') return jsonResponse(clone(itineraries));

  /* ---- comments ---- */
  if (path === '/api/comments') {
    if (method === 'GET') {
      const postId = url.searchParams.get('post_id') || '';
      return jsonResponse({
        comments: clone(commentsByPost[postId] || []),
        assets: clone(commentAssets),
      });
    }
    if (method === 'POST') {
      const user = bearerUser(init);
      if (!user) return unauthorized();
      const asset = body.asset_id ? commentAssets.find((a) => a.id === body.asset_id) : null;
      if (!body.body?.trim() && !asset) return jsonResponse({ error: 'Comment cannot be empty' }, 400);
      const comment: Comment = {
        id: nextCommentId++,
        post_id: body.post_id,
        author_name: user.name,
        avatar_url: user.avatar_url,
        body: asset ? '' : body.body,
        comment_type: asset ? asset.asset_type : 'text',
        asset_url: asset?.asset_url || null,
        asset_value: asset?.asset_value || null,
        like_count: 0,
        is_liked: false,
        created_at: nowISO(),
      };
      const key = String(body.post_id);
      commentsByPost[key] = [comment, ...(commentsByPost[key] || [])];
      const post = posts.find((p) => p.id === body.post_id);
      if (post) post.comment_count += 1;
      return jsonResponse(clone(comment), 201);
    }
    if (method === 'PUT') {
      if (!bearerUser(init)) return unauthorized();
      for (const list of Object.values(commentsByPost)) {
        const comment = list.find((c) => c.id === body.id);
        if (comment) {
          comment.is_liked = !comment.is_liked;
          comment.like_count = Math.max(0, comment.like_count + (comment.is_liked ? 1 : -1));
          return jsonResponse({ ok: true });
        }
      }
      return jsonResponse({ error: 'Comment not found' }, 404);
    }
  }

  /* ---- follows ---- */
  if (path === '/api/follows' && method === 'POST') {
    if (!bearerUser(init)) return unauthorized();
    const target = posts.find((p) => p.author.id === body.profile_id);
    if (target) applyFollowState(body.profile_id, !target.author.is_following);
    return jsonResponse({ ok: true });
  }

  /* ---- places: one-time confirmation (Phase 2) ----
   * Demo seam mirroring POST /api/v1/places/confirm. The real backend
   * (PlacesService) calls the Google Places API exactly once per business
   * registration and stores place_id + lat/lng; without an API key the demo
   * layer acknowledges the request deterministically. Manual pins (regular
   * users) pass through unchanged. */
  if (path === '/api/places/confirm' && method === 'POST') {
    if (!bearerUser(init)) return unauthorized();
    if (body.place_id) {
      return jsonResponse({
        source: 'google_places',
        place_id: body.place_id,
        name: body.name || 'Confirmed place',
        formatted_address: body.name ? `${body.name}, Cambodia` : 'Cambodia',
        lat: typeof body.lat === 'number' ? body.lat : 11.5564,
        lng: typeof body.lng === 'number' ? body.lng : 104.9282,
        confirmed: true,
      });
    }
    if (typeof body.lat === 'number' && typeof body.lng === 'number') {
      return jsonResponse({ source: 'manual', lat: body.lat, lng: body.lng, confirmed: true });
    }
    return jsonResponse({ error: 'Provide a place_id or lat/lng' }, 422);
  }

  /* ---- businesses: registration + Boosted upgrade (Phase 3) ---- */
  if (path === '/api/businesses/mine' && method === 'GET') {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    return jsonResponse(clone(businesses.filter((b) => b.owner_id === user.id).map(attachSubscription)));
  }

  if (path === '/api/businesses' && method === 'POST') {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    const name = String(body.name || '').trim();
    const placeName = String(body.place_name || '').trim();
    if (name.length < 2 || placeName.length < 2) {
      return jsonResponse({ error: 'Business name and place are required' }, 422);
    }
    // Phase 5: new businesses wait for admin approval (queue in /admin).
    const business: Business = {
      id: nextBusinessId++,
      owner_id: user.id,
      name,
      name_kh: body.name_kh || null,
      category: body.category || 'local-food',
      description: body.description || '',
      phone: body.phone || '',
      tier: 'verified',
      status: 'pending',
      place_name: placeName,
      lat: typeof body.lat === 'number' ? body.lat : null,
      lng: typeof body.lng === 'number' ? body.lng : null,
      subscription: null,
      created_at: nowISO(),
    };
    businesses.push(business);
    return jsonResponse(clone(business), 201);
  }

  if (path === '/api/businesses/upgrade' && method === 'POST') {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    const business = businesses.find((b) => b.id === Number(body.business_id) && b.owner_id === user.id);
    if (!business) return jsonResponse({ error: 'Business not found' }, 404);
    // One live subscription per business.
    const existing = businessSubscriptions.find(
      (sub) => sub.business_id === business.id && sub.status !== 'cancelled',
    );
    if (existing && existing.status === 'active') {
      return jsonResponse({ error: 'This business is already Boosted' }, 409);
    }
    const invoiceRef = `KHQR-${nextInvoiceSeq++}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    let subscription = existing && existing.status === 'pending_payment' ? existing : null;
    if (!subscription) {
      subscription = {
        id: nextSubscriptionId++,
        business_id: business.id,
        status: 'pending_payment',
        amount_usd: DEMO_BOOSTED_PRICE_USD,
        currency: 'USD',
        invoice_ref: invoiceRef,
        starts_at: null,
        expires_at: null,
        paid_at: null,
      };
      businessSubscriptions.push(subscription);
    }
    const invoice: KhqrInvoice = {
      invoice_ref: invoiceRef,
      business_id: business.id,
      amount_usd: DEMO_BOOSTED_PRICE_USD,
      currency: 'USD',
      khqr_payload: buildKhqrPayload(invoiceRef, DEMO_BOOSTED_PRICE_USD, business.name),
      expires_at: expiresAt,
    };
    return jsonResponse({ invoice, subscription: clone(subscription) }, 201);
  }

  if (path === '/api/businesses/upgrade/confirm' && method === 'POST') {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    const business = businesses.find((b) => b.id === Number(body.business_id) && b.owner_id === user.id);
    if (!business) return jsonResponse({ error: 'Business not found' }, 404);
    const subscription = businessSubscriptions.find(
      (sub) => sub.business_id === business.id && sub.status === 'pending_payment',
    );
    if (!subscription) return jsonResponse({ error: 'No payment pending' }, 409);
    // DEMO: instant confirmation. Production verifies against the Bakong
    // transaction (BakongService) before activating anything.
    subscription.status = 'active';
    subscription.paid_at = nowISO();
    subscription.starts_at = nowISO();
    subscription.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    business.tier = 'boosted';
    return jsonResponse(clone(attachSubscription(business)));
  }

  /* ---- business public profile (Phase 4 lead surface) ---- */
  if (path === '/api/businesses/profile' && method === 'GET') {
    const id = Number(url.searchParams.get('id'));
    const business = businesses.find((item) => item.id === id && item.status === 'approved');
    if (!business) return jsonResponse({ error: 'Business not found' }, 404);
    return jsonResponse(clone(attachSubscription(business)));
  }

  /* ---- leads: call / message / directions (Phase 4) ---- */
  if (path === '/api/businesses/leads' && method === 'POST') {
    // Public: guests can tap Call/Directions without an account.
    const business = businesses.find((item) => item.id === Number(body.business_id));
    if (!business) return jsonResponse({ error: 'Business not found' }, 404);
    if (!['call', 'message', 'directions'].includes(body.event_type)) {
      return jsonResponse({ error: 'event_type must be call, message or directions' }, 422);
    }
    const event: LeadEventRow = {
      id: nextLeadEventId++,
      business_id: business.id,
      event_type: body.event_type as LeadEventType,
      created_at: nowISO(),
    };
    leadEvents.push(event);
    return jsonResponse({ ok: true, id: event.id }, 201);
  }

  if (path === '/api/businesses/leads/summary' && method === 'GET') {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    const business = businesses.find((item) => item.id === Number(url.searchParams.get('business_id')));
    if (!business) return jsonResponse({ error: 'Business not found' }, 404);
    if (business.owner_id !== user.id) {
      return jsonResponse({ error: 'Only the owner can see lead analytics' }, 403);
    }
    // Default window: last 7 days (mirrors backend LeadService::summarize).
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    const inWindow = leadEvents.filter((event) => {
      if (event.business_id !== business.id) return false;
      const at = new Date(event.created_at).getTime();
      return at >= from.getTime() && at <= to.getTime();
    });
    const count = (type: LeadEventType) => inWindow.filter((event) => event.event_type === type).length;
    return jsonResponse({
      call: count('call'),
      message: count('message'),
      directions: count('directions'),
      total: inWindow.length,
      from: from.toISOString(),
      to: to.toISOString(),
    });
  }

  /* ---- Hidden Gem of the Week: public read (Phase 5) ---- */
  if (path === '/api/hidden-gem/current' && method === 'GET') {
    if (!currentHiddenGem) return jsonResponse({ current: null });
    const post = visiblePosts().find((p) => p.id === currentHiddenGem?.post_id);
    return jsonResponse({ current: { ...clone(currentHiddenGem), post: post ? clone(post) : null } });
  }

  /* ---- Trending Now: recency-weighted hot posts (Phase 6) ---- */
  if (path === '/api/trending' && method === 'GET') {
    const now = new Date();
    const windowStart = now.getTime() - TRENDING_WINDOW_DAYS * 86400000;
    const scored = visiblePosts()
      .filter((p) => new Date(p.created_at).getTime() >= windowStart)
      .map((p) => ({ post: p, score: trendScore(p, now) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    return jsonResponse({
      half_life_days: TRENDING_HALF_LIFE_DAYS,
      window_days: TRENDING_WINDOW_DAYS,
      posts: clone(scored.map((s) => s.post)),
    });
  }

  /* ---- public collections (browse/read; Phase 7) ---- */
  if (path === '/api/collections' && method === 'GET') {
    return jsonResponse(
      clone(
        collections.map(collectionPayload).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      ),
    );
  }

  if (path.startsWith('/api/collections/') && method === 'GET') {
    const slug = path.slice('/api/collections/'.length);
    // `mine` falls through to the authenticated collections routes below.
    if (!slug.includes('/') && slug !== 'mine') {
      const list = collections.find((c) => c.slug === slug);
      if (!list) return jsonResponse({ error: 'Collection not found' }, 404);
      return jsonResponse(clone(collectionDetail(list)));
    }
  }

  /* ---- contributor summary by numeric user id (public; Phase 7).
   * `contributors/me` falls through to the authenticated section. ---- */
  if (path.startsWith('/api/contributors/') && method === 'GET') {
    const idSeg = path.slice('/api/contributors/'.length);
    if (/^\d+$/.test(idSeg)) return jsonResponse(contributorSummary(Number(idSeg)));
  }

  /* ---- Trip Planner: shareable lists of published posts (Phase 6) ---- */
  const tripPayload = (list: TripListRow) => ({
    id: list.id,
    title: list.title,
    slug: list.slug,
    description: list.description,
    is_public: list.is_public,
    created_at: list.created_at,
    updated_at: list.updated_at,
    items_count: list.items.length,
    owner: (() => {
      const owner = mockUsers.find((u) => u.id === list.user_id);
      return owner ? publicUser(owner) : null;
    })(),
    items: list.items
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => {
        const p = visiblePosts().find((vp) => vp.id === item.post_id);
        return p ? { id: item.id, sort_order: item.sort_order, post: clone(p) } : null;
      })
      .filter(Boolean),
  });

  if (path === '/api/trips' && method === 'POST') {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    const title = String(body?.title || '').trim();
    if (title.length < 2) return jsonResponse({ error: 'Trip title is required' }, 422);
    const list: TripListRow = {
      id: nextTripId++,
      user_id: user.id,
      title,
      slug: tripSlug(),
      description: String(body?.description || ''),
      is_public: body?.is_public !== false,
      items: [],
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    tripLists.push(list);
    return jsonResponse(clone(tripPayload(list)), 201);
  }

  if (path === '/api/trips/mine' && method === 'GET') {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    return jsonResponse(clone(tripLists.filter((l) => l.user_id === user.id).map(tripPayload)));
  }

  if (path.startsWith('/api/trips/shared/') && method === 'GET') {
    const slug = path.slice('/api/trips/shared/'.length);
    const list = tripLists.find((l) => l.slug === slug);
    if (!list) return jsonResponse({ error: 'Trip not found' }, 404);
    const viewer = bearerUser(init);
    if (!list.is_public && viewer?.id !== list.user_id) {
      return jsonResponse({ error: 'Trip not found' }, 404);
    }
    return jsonResponse(clone(tripPayload(list)));
  }

  if (path.startsWith('/api/trips/')) {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    const [idSeg, postsSeg, postIdSeg] = path.slice('/api/trips/'.length).split('/');
    const list = tripLists.find((l) => l.id === Number(idSeg));
    if (!list) return jsonResponse({ error: 'Trip not found' }, 404);
    if (list.user_id !== user.id) {
      return jsonResponse({ error: 'This trip belongs to another traveler.' }, 403);
    }

    if (postsSeg === 'posts' && method === 'POST') {
      const post = posts.find((p) => p.id === Number(body?.post_id));
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      if (post.status === 'pending_review' || post.status === 'rejected') {
        return jsonResponse({ error: 'Only published posts can be added to a trip.' }, 422);
      }
      if (!list.items.some((i) => i.post_id === post.id)) {
        const nextOrder = list.items.reduce((max, i) => Math.max(max, i.sort_order), 0);
        list.items.push({ id: nextTripItemId++, post_id: post.id, sort_order: nextOrder + 1 });
        list.updated_at = nowISO();
      }
      return jsonResponse(clone(tripPayload(list)), 201);
    }

    if (postsSeg === 'posts' && postIdSeg && method === 'DELETE') {
      list.items = list.items.filter((i) => i.post_id !== Number(postIdSeg));
      list.updated_at = nowISO();
      return jsonResponse(clone(tripPayload(list)));
    }

    if (!postsSeg && method === 'GET') {
      return jsonResponse(clone(tripPayload(list)));
    }

    if (!postsSeg && method === 'PATCH') {
      if (typeof body?.title === 'string' && body.title.trim().length >= 2) {
        list.title = body.title.trim();
      }
      if ('description' in (body || {})) list.description = String(body.description || '');
      if (typeof body?.is_public === 'boolean') list.is_public = body.is_public;
      list.updated_at = nowISO();
      return jsonResponse(clone(tripPayload(list)));
    }

    if (!postsSeg && method === 'DELETE') {
      const idx = tripLists.indexOf(list);
      tripLists.splice(idx, 1);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }

  /* ---- admin panel behind role:admin (Phase 5) ----
   * Every action records an audit-log entry; the real backend enforces the
   * same with middleware('role:admin') + AuditService. */
  if (path.startsWith('/api/admin')) {
    const admin = bearerUser(init);
    if (!admin) return unauthorized();
    if (admin.role !== 'admin') {
      return jsonResponse({ error: 'Admin role required' }, 403);
    }

    if (path === '/api/admin/posts/pending' && method === 'GET') {
      return jsonResponse(clone(posts.filter((p) => p.status === 'pending_review')));
    }
    if (path === '/api/admin/posts/approve' && method === 'POST') {
      const post = posts.find((p) => p.id === Number(body.post_id));
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      post.status = 'published';
      recordAudit(admin, 'post.approve', post.location_name || `post ${post.id}`);
      return jsonResponse(clone(post));
    }
    if (path === '/api/admin/posts/reject' && method === 'POST') {
      const post = posts.find((p) => p.id === Number(body.post_id));
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      post.status = 'rejected';
      recordAudit(admin, 'post.reject', post.location_name || `post ${post.id}`);
      return jsonResponse(clone(post));
    }

    if (path === '/api/admin/businesses/pending' && method === 'GET') {
      return jsonResponse(clone(businesses.filter((b) => b.status === 'pending').map(attachSubscription)));
    }
    if (path === '/api/admin/businesses/approve' && method === 'POST') {
      const business = businesses.find((b) => b.id === Number(body.business_id));
      if (!business) return jsonResponse({ error: 'Business not found' }, 404);
      business.status = 'approved';
      recordAudit(admin, 'business.approve', business.name);
      return jsonResponse(clone(business));
    }
    if (path === '/api/admin/businesses/reject' && method === 'POST') {
      const business = businesses.find((b) => b.id === Number(body.business_id));
      if (!business) return jsonResponse({ error: 'Business not found' }, 404);
      business.status = 'rejected';
      recordAudit(admin, 'business.reject', business.name);
      return jsonResponse(clone(business));
    }

    if (path === '/api/admin/placements' && method === 'GET') {
      return jsonResponse(clone(partnersData.partners));
    }
    if (path === '/api/admin/placements' && method === 'POST') {
      const placement = {
        id: Math.max(0, ...partnersData.partners.map((p) => p.id)) + 1,
        business_name: body.business_name,
        business_name_kh: body.business_name_kh || null,
        partner_type: body.partner_type || 'local-guide',
        province: body.province || 'Phnom Penh',
        city: body.city || '',
        phone: body.phone || '',
        telegram_url: body.telegram_url || 'https://t.me/soksan_network',
        avatar_url: body.avatar_url || 'https://picsum.photos/seed/soksan-partner/200/200',
        cover_url: body.cover_url || 'https://picsum.photos/seed/soksan-partner/900/400',
        description_en: body.description || '',
        description_kh: body.description || '',
        rating: 5,
        review_count: 0,
        completed_trips: 0,
        verified: true,
        active: body.active !== false,
        monthly_fee: 0,
        starts_at: body.starts_at || null,
        ends_at: body.ends_at || null,
      };
      partnersData.partners.push(placement);
      recordAudit(admin, 'placement.schedule', placement.business_name);
      return jsonResponse(clone(placement), 201);
    }
    if (path === '/api/admin/placements/update' && method === 'POST') {
      const placement = partnersData.partners.find((p) => p.id === Number(body.id));
      if (!placement) return jsonResponse({ error: 'Placement not found' }, 404);
      if (typeof body.active === 'boolean') placement.active = body.active;
      if ('starts_at' in body) placement.starts_at = body.starts_at;
      if ('ends_at' in body) placement.ends_at = body.ends_at;
      recordAudit(
        admin,
        'placement.update',
        `${placement.business_name} (active=${placement.active})`,
      );
      return jsonResponse(clone(placement));
    }

    if (path === '/api/admin/hidden-gem' && method === 'POST') {
      const post = posts.find((p) => p.id === Number(body.post_id));
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      if (post.status === 'pending_review' || post.status === 'rejected') {
        return jsonResponse({ error: 'Only published posts can be the Hidden Gem' }, 422);
      }
      const weekStart = new Date();
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
      currentHiddenGem = {
        post_id: post.id,
        note: body.note || '',
        picked_by: admin.name,
        week_start: weekStart.toISOString(),
      };
      recordAudit(admin, 'hidden_gem.pick', post.location_name || `post ${post.id}`);
      return jsonResponse(clone(currentHiddenGem), 201);
    }

    if (path === '/api/admin/audit-logs' && method === 'GET') {
      return jsonResponse(clone(auditLogs.slice(0, 200)));
    }

    /* Phase 7 — duplicate-place candidates; merge ONLY via this endpoint. */
    if (path === '/api/admin/places/duplicates' && method === 'GET') {
      return jsonResponse(clone(duplicateCandidates()));
    }
    if (path === '/api/admin/places/merge' && method === 'POST') {
      const canonical = posts.find((p) => p.id === Number(body?.canonical_id));
      const duplicate = posts.find((p) => p.id === Number(body?.duplicate_id));
      if (!canonical || !duplicate) return jsonResponse({ error: 'Post not found' }, 404);
      if (canonical.id === duplicate.id) {
        return jsonResponse({ error: 'A place cannot be merged into itself.' }, 422);
      }
      if (duplicate.status === 'merged') {
        return jsonResponse({ error: 'This place is already merged.' }, 422);
      }
      // The duplicate disappears from every public surface; the canonical
      // place keeps the full history. Mirrors backend Place.merged_into_id.
      duplicate.status = 'merged';
      recordAudit(
        admin,
        'place.merge',
        `${duplicate.location_name} → ${canonical.location_name}`,
      );
      return jsonResponse(clone(canonical));
    }
  }

  /* ---- collections + contributor self-summary (auth; Phase 7) ---- */
  if (path === '/api/contributors/me' && method === 'GET') {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    // Only the owner sees their own invite code (mirrors UserResource).
    return jsonResponse({ ...contributorSummary(user.id), referral_code: user.referral_code });
  }

  if (path === '/api/collections/mine' && method === 'GET') {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    return jsonResponse(
      clone(collections.filter((c) => c.user_id === user.id).map(collectionPayload)),
    );
  }

  if (path === '/api/collections' && method === 'POST') {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    const title = String(body?.title || '').trim();
    if (title.length < 2) return jsonResponse({ error: 'Collection title is required' }, 422);
    const collection: CollectionRow = {
      id: nextCollectionId++,
      user_id: user.id,
      title,
      slug: collectionSlug(),
      description: String(body?.description || ''),
      post_ids: [],
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    collections.push(collection);
    return jsonResponse(clone(collectionPayload(collection)), 201);
  }

  if (path.startsWith('/api/collections/')) {
    const user = bearerUser(init);
    if (!user) return unauthorized();
    const [idSeg, postsSeg, postIdSeg] = path.slice('/api/collections/'.length).split('/');
    const collection = collections.find((c) => c.id === Number(idSeg));
    if (!collection) return jsonResponse({ error: 'Collection not found' }, 404);
    if (collection.user_id !== user.id) {
      return jsonResponse({ error: 'This collection belongs to another traveler.' }, 403);
    }

    if (postsSeg === 'posts' && method === 'POST') {
      const post = posts.find((p) => p.id === Number(body?.post_id));
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      if (post.status === 'pending_review' || post.status === 'rejected') {
        return jsonResponse({ error: 'Only published posts can be collected.' }, 422);
      }
      if (!collection.post_ids.includes(post.id)) {
        collection.post_ids.push(post.id);
        collection.updated_at = nowISO();
      }
      return jsonResponse(clone(collectionPayload(collection)), 201);
    }

    if (postsSeg === 'posts' && postIdSeg && method === 'DELETE') {
      collection.post_ids = collection.post_ids.filter((id) => id !== Number(postIdSeg));
      collection.updated_at = nowISO();
      return jsonResponse(clone(collectionPayload(collection)));
    }

    if (!postsSeg && method === 'PATCH') {
      if (typeof body?.title === 'string' && body.title.trim().length >= 2) {
        collection.title = body.title.trim();
      }
      if ('description' in (body || {})) collection.description = String(body.description || '');
      collection.updated_at = nowISO();
      return jsonResponse(clone(collectionPayload(collection)));
    }

    if (!postsSeg && method === 'DELETE') {
      collections.splice(collections.indexOf(collection), 1);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }

  /* ---- conversations / messages ---- */
  if (path === '/api/conversations') {
    const filter = url.searchParams.get('filter') || 'all';
    let list = [...conversations].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
    if (filter === 'guides') list = list.filter((c) => c.participant_role === 'Local Guide');
    return jsonResponse(clone(list));
  }

  if (path === '/api/messages') {
    if (method === 'GET') {
      const conversationId = Number(url.searchParams.get('conversation_id'));
      if (!conversationId) return jsonResponse({ error: 'conversation_id is required' }, 400);
      return jsonResponse(clone(messagesByConversation[conversationId] || []));
    }
    if (method === 'POST') {
      if (!bearerUser(init)) return unauthorized();
      const conversationId = Number(body.conversation_id);
      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) return jsonResponse({ error: 'Conversation not found' }, 404);
      const message: Message = {
        id: nextMessageId++,
        conversation_id: conversationId,
        sender_type: 'me',
        body: body.body,
        message_type: body.message_type || 'text',
        place_id: body.place_id || null,
        created_at: nowISO(),
        place: null,
        pin: null,
      };
      if (body.message_type === 'location' && body.place_id) {
        message.pin = { destination: destinations.find((d) => d.id === body.place_id) };
      }
      if (body.message_type === 'itinerary' && body.itinerary_id) {
        message.pin = { itinerary: itineraries.find((i) => i.id === body.itinerary_id) };
      }
      messagesByConversation[conversationId] = [...(messagesByConversation[conversationId] || []), message];
      conversation.last_message =
        body.message_type === 'location'
          ? 'Pinned a physical location'
          : body.message_type === 'itinerary'
            ? 'Shared an itinerary'
            : body.body;
      conversation.last_time = 'Now';
      conversation.updated_at = nowISO();
      return jsonResponse(clone(message), 201);
    }
  }

  /* ---- partners ---- */
  if (path === '/api/partners') {
    if (method === 'GET') {
      const type = url.searchParams.get('type');
      // Phase 4: partners are placements with an admin date window — expired
      // or future placements never reach the public list.
      let list = partnersData.partners.filter((p) => isPlacementActive(p));
      if (type) list = list.filter((p) => p.partner_type === type);
      return jsonResponse({
        partners: clone(list),
        categories: clone(partnersData.categories),
        provinces: clone(partnersData.provinces),
      });
    }
    if (method === 'POST') {
      if (!bearerUser(init)) return unauthorized();
      const required = ['business_name', 'owner_name', 'partner_type', 'province', 'city', 'phone'];
      if (required.some((key) => !body[key])) return jsonResponse({ error: 'All fields are required' }, 400);
      return jsonResponse({ ok: true, payment_ref: paymentRef('PRT') }, 201);
    }
  }

  /* ---- profile / services / contacts / bookings ---- */
  if (path === '/api/profile') return jsonResponse(clone(profile));
  if (path === '/api/services') return jsonResponse(clone(services));
  if (path === '/api/contacts') return jsonResponse(clone(contacts));

  if (path === '/api/bookings' && method === 'POST') {
    if (!bearerUser(init)) return unauthorized();
    if (!body.service_id || !body.guest_name?.trim()) {
      return jsonResponse({ error: 'Booking details are incomplete' }, 400);
    }
    return jsonResponse({ ok: true, payment_ref: paymentRef('SSN') }, 201);
  }

  /* ---- boosts ---- */
  if (path === '/api/boosts') {
    if (method === 'GET') {
      return jsonResponse({
        campaigns: clone(boostsData.campaigns),
        provinces: clone(boostsData.provinces),
        posts: clone(posts),
      });
    }
    if (method === 'POST') {
      if (!bearerUser(init)) return unauthorized();
      const post = posts.find((p) => p.id === body.post_id);
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      const campaign: Campaign = {
        id: nextCampaignId++,
        post_id: body.post_id,
        merchant_name: body.merchant_name,
        province: body.province,
        target_type: body.target_type,
        budget: body.budget,
        expected_views: body.budget * 1000,
        service_fee: Number((body.budget * 0.05).toFixed(2)),
        status: 'active',
        payment_ref: paymentRef('BST'),
        started_at: nowISO(),
        created_at: nowISO(),
        post: clone(post),
      };
      boostsData.campaigns.unshift(campaign);
      post.promotion = clone(campaign);
      return jsonResponse({ ok: true, payment_ref: campaign.payment_ref, campaign: clone(campaign) }, 201);
    }
  }

  /* ---- upload ---- */
  if (path === '/api/upload' && method === 'POST') {
    if (!bearerUser(init)) return unauthorized();
    if (!body.fileBase64 || !body.contentType) return jsonResponse({ error: 'Upload failed' }, 400);
    return jsonResponse({ url: `data:${body.contentType};base64,${body.fileBase64}` }, 201);
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

/* ------------------------------ install --------------------------------- */

export function installApi() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const raw =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    if (raw.startsWith('/api/') || raw.includes(`${window.location.origin}/api/`)) {
      const url = new URL(raw, window.location.origin);
      const requestInit =
        init || (typeof input === 'object' && 'method' in (input as Request) ? undefined : undefined);
      if (!requestInit && typeof input === 'object' && input instanceof Request) {
        return input
          .clone()
          .text()
          .then((text) => handleApi(url, { method: input.method, body: text || undefined }));
      }
      return handleApi(url, init);
    }
    return nativeFetch(input as RequestInfo, init);
  }) as typeof window.fetch;
}
