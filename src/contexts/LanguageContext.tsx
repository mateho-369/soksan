import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Language = 'en' | 'kh';

type Dict = { [key: string]: string | Dict };

const en: Dict = {
  navigation: {
    home: 'Home',
    discover: 'Discover',
    rankings: 'Rankings',
    clips: 'Clips',
    messages: 'Messages',
    partners: 'Guides & Rides',
    profile: 'Profile',
    merchant: 'Business Center',
  },
  common: {
    all: 'All',
    allPlaces: 'All places',
    loading: 'Gathering beautiful places...',
    retry: 'Try again',
    seeMore: 'See more',
    seeLess: 'See less',
    sponsored: 'Sponsored',
  },
  search: {
    placeholder: 'Search places, events, cafes, karaoke and rides in Cambodia...',
  },
  feed: {
    title: 'Cambodia, shared by everyone',
    subtitle: 'Free for Cambodians and visitors worldwide — share and explore every province together.',
    exploreBook: 'Explore & Book',
    boost: 'Boost this gem',
    featured: 'Featured Gem',
  },
  social: {
    forYou: 'For you',
    communityFeed: 'Free community travel feed',
    watchClips: 'Watch short clips',
    composerPrompt: 'Share freely: a place, event, or joyful moment...',
    storyPrompt: 'Tell people what makes this place worth finding...',
    placeName: 'Place, venue, or event name',
    chooseProvince: 'Choose province or city',
    addMedia: 'Add up to 10 photos or one 30s video',
    publish: 'Post free',
    exploreByMood: 'Explore by mood',
    resultsFor: 'Showing stories for',
    follow: 'Follow',
    following: 'Following',
    like: 'Like',
    comment: 'Comment',
    share: 'Share',
    comments: 'comments',
    firstComment: 'Be the first to share a thought',
    commentPlaceholder: 'Write a comment...',
    everyProvince: 'Joy and hidden gems from every province',
  },
  clips: {
    title: 'SokSan Clips',
    subtitle: '30 seconds of Cambodia',
    empty: 'The first clip is waiting to be shared',
    emptyHelp: 'Post a short travel video from the community feed.',
  },
  partners: {
    title: 'Trusted local guides and rides',
    subtitle:
      'Browsing is free for every traveler. Verified tourism businesses pay only for listing and visibility tools.',
    join: 'Register your business',
    registerTitle: 'Grow your local business with SokSan',
  },
  access: {
    eyebrow: 'Open to everyone',
    title: 'Cambodians and international visitors belong here',
    description: 'Posting, liking, commenting, sharing, following, Clips, feed and discovery are always free.',
    social: 'All social features free',
    noPaywall: 'No traveler paywall',
    freeChip: 'Free',
    postingFree: 'Free community posting — no payment or subscription.',
  },
  discovery: {
    title: 'Find your quiet place',
    subtitle: 'Thoughtfully selected by people who call Cambodia home.',
    nearby: 'places nearby',
    budget: 'Est. budget',
  },
  chat: {
    title: 'Travel Chat',
    localGuides: 'Local Guides',
    activeNow: 'Active now',
    typeMessage: 'Write a message...',
    sharePlace: 'Share Place',
    pinLocation: 'Pin Location',
    shareItinerary: 'Itinerary',
    choosePlace: 'Pin a place to this chat',
  },
  profile: {
    expertise: 'Local expertise',
    services: 'Experiences & stays',
    servicesSubtitle: 'Travel slowly. Meet the people who know these landscapes best.',
    book: 'Book experience',
  },
  payment: {
    secure: 'Secure KHQR payment',
    guestName: 'Your name',
    scanPay: 'Scan to pay with any Bakong member bank',
    confirm: 'Confirm instant payment',
    received: 'Instant Payment Received',
  },
  ranking: {
    title: 'Cambodia Provinces Top List',
    subtitle: 'A living pulse of the places travelers love, shaped by real check-ins and local reviews.',
  },
};

const kh: Dict = {
  navigation: {
    home: 'ទំព័រដើម',
    discover: 'រុករក',
    rankings: 'ចំណាត់ថ្នាក់',
    clips: 'វីដេអូខ្លី',
    messages: 'សារ',
    partners: 'មគ្គុទ្ទេសក៍ និងយានជំនិះ',
    profile: 'ប្រវត្តិរូប',
    merchant: 'មជ្ឈមណ្ឌលអាជីវកម្ម',
  },
  common: {
    all: 'ទាំងអស់',
    allPlaces: 'គ្រប់ទីកន្លែង',
    loading: 'កំពុងប្រមូលទីកន្លែងស្អាតៗ...',
    retry: 'ព្យាយាមម្ដងទៀត',
    seeMore: 'មើលបន្ថែម',
    seeLess: 'បង្ហាញតិច',
    sponsored: 'ដៃគូឧបត្ថម្ភ',
  },
  search: {
    placeholder: 'ស្វែងរកទីកន្លែង ព្រឹត្តិការណ៍ កាហ្វេ ខារ៉ាអូខេ និងយានជំនិះនៅកម្ពុជា...',
  },
  feed: {
    title: 'កម្ពុជា ចែករំលែកដោយគ្រប់គ្នា',
    subtitle: 'ឥតគិតថ្លៃសម្រាប់ប្រជាជនកម្ពុជា និងភ្ញៀវអន្តរជាតិ — ចែករំលែក និងរុករកគ្រប់ខេត្តជាមួយគ្នា។',
    exploreBook: 'រុករក និងកក់',
    boost: 'ជំរុញកន្លែងនេះ',
    featured: 'ត្បូងពិសេស',
  },
  social: {
    forYou: 'សម្រាប់អ្នក',
    communityFeed: 'ព័ត៌មានដំណើរសហគមន៍ឥតគិតថ្លៃ',
    watchClips: 'មើលវីដេអូខ្លី',
    composerPrompt: 'ចែករំលែកដោយឥតគិតថ្លៃ៖ ទីកន្លែង ព្រឹត្តិការណ៍ ឬពេលវេលារីករាយ...',
    storyPrompt: 'ប្រាប់អ្នកដទៃថាហេតុអ្វីទីកន្លែងនេះគួរឱ្យចង់ទៅ...',
    placeName: 'ឈ្មោះទីកន្លែង ឬព្រឹត្តិការណ៍',
    chooseProvince: 'ជ្រើសរើសខេត្ត ឬក្រុង',
    addMedia: 'បន្ថែមរូបភាពរហូតដល់ ១០ ឬវីដេអូ ៣០វិនាទីមួយ',
    publish: 'បង្ហោះឥតគិតថ្លៃ',
    exploreByMood: 'រុករកតាមអារម្មណ៍',
    resultsFor: 'បង្ហាញរឿងរ៉ាវសម្រាប់',
    follow: 'តាមដាន',
    following: 'កំពុងតាមដាន',
    like: 'ចូលចិត្ត',
    comment: 'មតិ',
    share: 'ចែករំលែក',
    comments: 'មតិ',
    firstComment: 'ក្លាយជាអ្នកដំបូងដែលចែករំលែកមតិ',
    commentPlaceholder: 'សរសេរមតិ...',
    everyProvince: 'ភាពរីករាយ និងកន្លែងលាក់ខ្លួនពីគ្រប់ខេត្ត',
  },
  clips: {
    title: 'វីដេអូខ្លីសុខសាន្ត',
    subtitle: '៣០វិនាទីនៃកម្ពុជា',
    empty: 'វីដេអូដំបូងកំពុងរង់ចាំការចែករំលែក',
    emptyHelp: 'បង្ហោះវីដេអូដំណើរខ្លីពីទំព័រព័ត៌មានសហគមន៍។',
  },
  partners: {
    title: 'មគ្គុទ្ទេសក៍ និងយានជំនិះក្នុងស្រុកដែលទុកចិត្តបាន',
    subtitle:
      'ការរុករកឥតគិតថ្លៃសម្រាប់អ្នកដំណើរគ្រប់គ្នា។ អាជីវកម្មទេសចរណ៍បង់តែសម្រាប់ការចុះបញ្ជី និងការបង្ហាញពិសេស។',
    join: 'ចុះឈ្មោះអាជីវកម្មរបស់អ្នក',
    registerTitle: 'ពង្រីកអាជីវកម្មក្នុងស្រុកជាមួយសុខសាន្ត',
  },
  access: {
    eyebrow: 'បើកចំហសម្រាប់គ្រប់គ្នា',
    title: 'ប្រជាជនកម្ពុជា និងភ្ញៀវអន្តរជាតិទាំងអស់ស្វាគមន៍',
    description: 'ការបង្ហោះ ចូលចិត្ត មតិ ចែករំលែក តាមដាន វីដេអូខ្លី ព័ត៌មាន និងផែនទី គឺឥតគិតថ្លៃជានិច្ច។',
    social: 'មុខងារសង្គមទាំងអស់ឥតគិតថ្លៃ',
    noPaywall: 'គ្មានការបង់ប្រាក់សម្រាប់អ្នកដំណើរ',
    freeChip: 'ឥតគិតថ្លៃ',
    postingFree: 'ការបង្ហោះសហគមន៍ឥតគិតថ្លៃ — គ្មានការទូទាត់ ឬសមាជិកភាព។',
  },
  discovery: {
    title: 'ស្វែងរកទីស្ងប់ស្ងាត់របស់អ្នក',
    subtitle: 'ជ្រើសរើសយ៉ាងយកចិត្តទុកដាក់ដោយអ្នកដែលហៅកម្ពុជាថាផ្ទះ។',
    nearby: 'កន្លែងនៅជិត',
    budget: 'ថវិកាប៉ាន់ស្មាន',
  },
  chat: {
    title: 'ការជជែកដំណើរ',
    localGuides: 'មគ្គុទ្ទេសក៍ក្នុងស្រុក',
    activeNow: 'កំពុងប្រើប្រាស់',
    typeMessage: 'សរសេរសារ...',
    sharePlace: 'ចែករំលែកទីកន្លែង',
    pinLocation: 'ខ្ទាស់ទីតាំង',
    shareItinerary: 'ផែនការដំណើរ',
    choosePlace: 'ខ្ទាស់ទីកន្លែងក្នុងការជជែក',
  },
  profile: {
    expertise: 'ជំនាញក្នុងស្រុក',
    services: 'បទពិសោធន៍ និងកន្លែងស្នាក់នៅ',
    servicesSubtitle: 'ធ្វើដំណើរយឺតៗ និងជួបអ្នកដែលស្គាល់ទេសភាពទាំងនេះច្បាស់បំផុត។',
    book: 'កក់បទពិសោធន៍',
  },
  payment: {
    secure: 'ការទូទាត់ KHQR ប្រកបដោយសុវត្ថិភាព',
    guestName: 'ឈ្មោះរបស់អ្នក',
    scanPay: 'ស្កេនដើម្បីទូទាត់ជាមួយធនាគារសមាជិកបាគង',
    confirm: 'បញ្ជាក់ការទូទាត់ភ្លាមៗ',
    received: 'បានទទួលការទូទាត់ភ្លាមៗ',
  },
  ranking: {
    title: 'បញ្ជីខេត្តកំពូលនៅកម្ពុជា',
    subtitle: 'ចង្វាក់រស់រវើកនៃទីកន្លែងដែលអ្នកដំណើរស្រឡាញ់ បង្កើតពីការចូលទស្សនា និងការវាយតម្លៃពិត។',
  },
};

const translations: Record<Language, Dict> = { en, kh };

const aliases: Record<string, string> = {
  home: 'navigation.home',
  discover: 'navigation.discover',
  rankings: 'navigation.rankings',
  messages: 'navigation.messages',
  profile: 'navigation.profile',
  merchant: 'navigation.merchant',
  search: 'search.placeholder',
  feedTitle: 'feed.title',
  feedSubtitle: 'feed.subtitle',
  seeMore: 'common.seeMore',
  seeLess: 'common.seeLess',
  exploreBook: 'feed.exploreBook',
  discoveryTitle: 'discovery.title',
  discoverySubtitle: 'discovery.subtitle',
  allPlaces: 'common.allPlaces',
  nearby: 'discovery.nearby',
  budget: 'discovery.budget',
  travelChat: 'chat.title',
  all: 'common.all',
  localGuides: 'chat.localGuides',
  activeNow: 'chat.activeNow',
  typeMessage: 'chat.typeMessage',
  sharePlace: 'chat.sharePlace',
  pinLocation: 'chat.pinLocation',
  shareItinerary: 'chat.shareItinerary',
  choosePlace: 'chat.choosePlace',
  expertise: 'profile.expertise',
  services: 'profile.services',
  servicesSub: 'profile.servicesSubtitle',
  book: 'profile.book',
  securePayment: 'payment.secure',
  guestName: 'payment.guestName',
  scanPay: 'payment.scanPay',
  confirm: 'payment.confirm',
  received: 'payment.received',
  rankingTitle: 'ranking.title',
  rankingSub: 'ranking.subtitle',
  boost: 'feed.boost',
  featured: 'feed.featured',
  sponsored: 'common.sponsored',
  loading: 'common.loading',
  retry: 'common.retry',
};

function resolve(dict: Dict, path: string): string | undefined {
  const value = path.split('.').reduce<Dict | string | undefined>((node, key) => {
    if (!node || typeof node === 'string') return undefined;
    return node[key];
  }, dict);
  return typeof value === 'string' ? value : undefined;
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem('soksan-language') === 'kh' ? 'kh' : 'en',
  );

  useEffect(() => {
    localStorage.setItem('soksan-language', language);
    document.documentElement.lang = language === 'kh' ? 'km' : 'en';
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((prev) => (prev === 'en' ? 'kh' : 'en')),
      t: (key: string) => {
        const path = aliases[key] || key;
        return resolve(translations[language], path) || resolve(translations.en, path) || key;
      },
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
