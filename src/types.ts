export interface AuthUser {
  id: number;
  name: string;
  name_kh: string | null;
  email: string;
  avatar_url: string;
  role: 'user' | 'admin';
}

export interface Category {
  id: number;
  label_en: string;
  label_kh: string;
  emoji: string;
  slug: string;
}

export interface Province {
  id: number;
  name: string;
  name_kh: string;
  icon: string;
  explorers?: number;
}

export interface Author {
  id: number;
  name: string;
  name_kh: string | null;
  handle: string;
  avatar_url: string;
  cover_url: string;
  verified: boolean;
  location: string;
  bio_en: string;
  bio_kh: string;
  expertise: string;
  badges: string[];
  followers: number;
  following: number;
  posts_count: number;
  is_following: boolean;
}

export interface MediaItem {
  id: number;
  post_id: number;
  media_url: string;
  media_type: 'image' | 'video';
  sort_order: number;
  duration_seconds: number | null;
}

export interface Campaign {
  id: number;
  post_id: number;
  merchant_name: string;
  province: string;
  target_type: string;
  budget: number;
  expected_views: number;
  service_fee: number;
  status: string;
  payment_ref: string;
  started_at: string;
  created_at: string;
  post?: Post;
}

export interface Post {
  id: number;
  profile_id: number;
  category: string;
  location_name: string;
  province: string;
  media_url: string;
  media_type: string;
  caption_en: string;
  caption_kh: string;
  hashtags: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count?: number;
  commune_id?: number | null;
  commune_name?: string;
  is_liked: boolean;
  is_saved?: boolean;
  business_name: string | null;
  destination_id: number | null;
  created_at: string;
  author: Author;
  promotion: Campaign | null;
  media: MediaItem[];
}

export interface Ad {
  id: number;
  placement: string;
  sponsor: string;
  sponsor_kh: string;
  headline: string;
  headline_kh: string;
  body: string;
  body_kh: string;
  cta: string;
  cta_kh: string;
  image_url: string;
  target_url: string;
}

export interface Destination {
  id: number;
  name: string;
  name_kh: string;
  category: string;
  category_icon: string;
  province: string;
  description_en: string;
  description_kh: string;
  rating: number;
  reviews: number;
  budget_min: number;
  budget_max: number;
  image_url: string;
  map_x: number;
  map_y: number;
  is_featured: boolean;
}

export interface Itinerary {
  id: number;
  title: string;
  title_kh: string;
  province: string;
  days: number;
  stops: string[];
  image_url: string;
  guide_name: string;
  price: number;
}

export interface CommentAsset {
  id: number;
  label: string;
  asset_type: 'emoji' | 'gif';
  asset_url: string | null;
  asset_value: string | null;
  active: boolean;
  sort_order: number;
}

export interface Comment {
  id: number;
  post_id: number;
  author_name: string;
  avatar_url: string;
  body: string;
  comment_type: 'text' | 'emoji' | 'gif';
  asset_url: string | null;
  asset_value: string | null;
  like_count: number;
  is_liked: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  participant_name: string;
  participant_name_kh: string;
  participant_role: string;
  avatar_url: string;
  active: boolean;
  last_message: string;
  last_time: string;
  unread: number;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_type: 'me' | 'them';
  body: string;
  message_type: 'text' | 'location' | 'place' | 'itinerary';
  place_id: number | null;
  created_at: string;
  place: Destination | null;
  pin: { destination?: Destination; itinerary?: Itinerary } | null;
}

export interface PartnerCategory {
  id: number;
  slug: string;
  label_en: string;
  label_kh: string;
  icon: string;
  monthly_fee: number;
  description_en: string;
  description_kh: string;
  sort_order: number;
}

export interface Partner {
  id: number;
  business_name: string;
  business_name_kh: string | null;
  partner_type: string;
  province: string;
  city: string;
  phone: string;
  telegram_url: string;
  avatar_url: string;
  cover_url: string;
  description_en: string;
  description_kh: string;
  rating: number;
  review_count: number;
  completed_trips: number;
  verified: boolean;
  active: boolean;
  monthly_fee: number;
}

export interface Profile {
  id: number;
  name: string;
  name_kh: string;
  handle: string;
  avatar_url: string;
  cover_url: string;
  verified: boolean;
  location: string;
  bio_en: string;
  bio_kh: string;
  expertise: string;
  badges: string[];
  followers: number;
  following: number;
  posts_count: number;
}

export interface Service {
  id: number;
  profile_id: number;
  title: string;
  title_kh: string;
  description_en: string;
  description_kh: string;
  duration: string;
  price: number;
  booking_fee: number;
  image_url: string;
  available: boolean;
}

export interface Contact {
  id: number;
  profile_id: number;
  telegram_url: string;
  phone: string;
  maps_url: string;
  response_time: string;
}

export interface RankFilter {
  id: number;
  slug: string;
  label_en: string;
  label_kh: string;
  emoji: string;
  sort_order: number;
}

export interface RankSpot {
  id: number;
  province_id: number;
  name: string;
  name_kh: string;
  category: string;
  image_url: string;
  price: number;
  fast_booking: boolean;
  rating: number;
  rank_score: number;
}

export interface RankProvince {
  id: number;
  name: string;
  name_kh: string;
  icon: string;
  image_url: string;
  explorers: number;
  rating: number;
  weekly_growth: number;
  cafe_score: number;
  nature_score: number;
  hospitality_score: number;
  rank: number;
  active_score: number;
  spots: RankSpot[];
}

/* Phase 1 — Cambodia administrative hierarchy (commune -> district -> province) */
export interface GeoProvince {
  id: number;
  code: string;
  name: string;
  name_kh: string;
  icon?: string;
}
export interface GeoDistrict {
  id: number;
  province_id: number;
  code: string;
  name: string;
  name_kh: string;
}
export interface GeoCommune {
  id: number;
  district_id: number;
  code: string;
  name: string;
  name_kh: string;
  latitude?: number;
  longitude?: number;
}
export interface Geography {
  provinces: GeoProvince[];
  districts: GeoDistrict[];
  communes: GeoCommune[];
}
