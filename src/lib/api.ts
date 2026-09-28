// Client-side API layer that mirrors the SokSan Network backend.
// Intercepts fetch('/api/...') calls and serves the same JSON contracts
// with in-memory state so every interaction works end to end.
import postsSeed from '../data/posts.json';
import categoriesSeed from '../data/categories.json';
import adsSeed from '../data/ads.json';
import destinationsSeed from '../data/destinations.json';
import itinerariesSeed from '../data/itineraries.json';
import profileSeed from '../data/profile.json';
import servicesSeed from '../data/services.json';
import contactsSeed from '../data/contacts.json';
import conversationsSeed from '../data/conversations.json';
import partnersSeed from '../data/partners.json';
import boostsSeed from '../data/boosts.json';
import rankingsSeed from '../data/rankings.json';
import commentsSeed from '../data/comments.json';
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
  const path = url.pathname;
  const method = (init?.method || 'GET').toUpperCase();
  const body = init?.body ? JSON.parse(String(init.body)) : null;

  await wait(method === 'GET' ? 220 : 420);

  /* ---- posts ---- */
  if (path === '/api/posts') {
    if (method === 'GET') {
      if (url.searchParams.get('format') === 'clips') {
        const clips = posts.filter((p) => p.media.some((m) => m.media_type === 'video') || p.media_type === 'video');
        return jsonResponse(clone(clips));
      }
      let list = [...posts];
      const category = url.searchParams.get('category');
      const search = url.searchParams.get('search');
      if (category) list = list.filter((p) => p.category === category);
      if (search) list = list.filter((p) => matchesSearch(p, search));
      return jsonResponse(clone(list));
    }
    if (method === 'PUT') {
      const post = posts.find((p) => p.id === body.id);
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      if (body.action === 'like') {
        post.is_liked = !post.is_liked;
        post.like_count = Math.max(0, post.like_count + (post.is_liked ? 1 : -1));
      }
      if (body.action === 'share') post.share_count += 1;
      if (body.action === 'comment') post.comment_count += 1;
      return jsonResponse({ ok: true });
    }
    if (method === 'POST') {
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
      const author = posts.find((p) => p.author.id === body.profile_id)?.author;
      if (!author) return jsonResponse({ error: 'Profile not found' }, 400);
      const post: Post = {
        id: nextPostId++,
        profile_id: body.profile_id,
        category: body.category,
        location_name: body.location_name,
        province: body.province,
        media_url: media[0]?.media_url || '',
        media_type: media[0]?.media_type || 'image',
        caption_en: body.caption,
        caption_kh: body.caption,
        hashtags: `#${(body.province || '').replace(/\s+/g, '')} #SokSanNetwork`,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        is_liked: false,
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

  /* ---- categories / ads / rankings ---- */
  if (path === '/api/categories') return jsonResponse(clone(categories));

  if (path === '/api/ads') {
    const placement = url.searchParams.get('placement');
    const list = placement ? ads.filter((a: { placement: string }) => a.placement === placement) : ads;
    return jsonResponse(clone(list));
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
      const asset = body.asset_id ? commentAssets.find((a) => a.id === body.asset_id) : null;
      if (!body.body?.trim() && !asset) return jsonResponse({ error: 'Comment cannot be empty' }, 400);
      const comment: Comment = {
        id: nextCommentId++,
        post_id: body.post_id,
        author_name: 'Dara Sok',
        avatar_url: '/images/traveler-dara.jpg',
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
    const target = posts.find((p) => p.author.id === body.profile_id);
    if (target) applyFollowState(body.profile_id, !target.author.is_following);
    return jsonResponse({ ok: true });
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
      const list = type ? partnersData.partners.filter((p) => p.partner_type === type) : partnersData.partners;
      return jsonResponse({
        partners: clone(list),
        categories: clone(partnersData.categories),
        provinces: clone(partnersData.provinces),
      });
    }
    if (method === 'POST') {
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
