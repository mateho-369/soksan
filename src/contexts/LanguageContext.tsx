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
    empty: 'No stories here yet',
    emptyHelp: 'Be the first to share a place worth finding.',
    emptySearch: 'No stories match your search',
    emptySearchHelp: 'Try another place name, province, or hashtag.',
  },
  social: {
    forYou: 'For you',
    communityFeed: 'Free community travel feed',
    watchClips: 'Watch short clips',
    composerPrompt: 'Share freely: a place, event, or joyful moment...',
    storyPrompt: 'Tell people what makes this place worth finding...',
    placeName: 'Place, venue, or event name',
    chooseProvince: 'Choose province or city',
    chooseDistrict: 'District / Khan (auto from commune)',
    chooseCommune: 'Commune / Sangkat',
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
    save: 'Save place',
    firstComment: 'Be the first to share a thought',
    commentPlaceholder: 'Write a comment...',
    everyProvince: 'Joy and hidden gems from every province',
  },
  clips: {
    title: 'SokSan Clips',
    subtitle: '30 seconds of Cambodia',
    empty: 'The first clip is waiting to be shared',
    emptyHelp: 'Post a short travel video from the community feed.',
    views: 'views',
    mute: 'Mute',
    unmute: 'Unmute',
    endMessage: 'You are all caught up — check back soon for more of Cambodia.',
    retryVideo: 'This clip could not load. Tap to retry.',
    dataSaverNote: 'Data saver is on — tap to play videos',
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
    empty: 'No places found',
    emptyHelp: 'Try another category or search term.',
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
  auth: {
    loginTitle: 'Welcome back',
    loginSubtitle: 'Log in to post places, save gems and follow local storytellers.',
    registerTitle: 'Join SokSan free',
    registerSubtitle: 'Create a free account to share Cambodia’s hidden gems.',
    name: 'Your name',
    namePlaceholder: 'e.g. Dara Sok',
    email: 'Email',
    password: 'Password',
    confirm: 'Confirm password',
    loginAction: 'Log in',
    registerAction: 'Create account',
    noAccount: 'New to SokSan?',
    haveAccount: 'Already have an account?',
    logout: 'Log out',
    loginNav: 'Log in',
    joinNav: 'Join free',
    nameError: 'Please enter your name (at least 2 characters).',
    emailError: 'Please enter a valid email address.',
    passwordError: 'Password must be at least 8 characters.',
    confirmError: 'Passwords do not match.',
    genericError: 'Something went wrong. Please try again.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    composerLoginTitle: 'Log in to share your places',
    composerLoginBody: 'Posting, liking, commenting and saving are free — you just need an account.',
    composerLoginCta: 'Log in or join free',
    savedOnly: 'Log in to save places to your list.',
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
    empty: 'មិនទាន់មានរឿងរ៉ាវនៅទីនេះ',
    emptyHelp: 'ក្លាយជាអ្នកដំបូងដែលចែករំលែកកន្លែងគួរឱ្យទៅ។',
    emptySearch: 'គ្មានរឿងរ៉ាវត្រូវនឹងការស្វែងរករបស់អ្នក',
    emptySearchHelp: 'សាកល្បងឈ្មោះកន្លែង ខេត្ត ឬហែសថែកផ្សេង។',
  },
  social: {
    forYou: 'សម្រាប់អ្នក',
    communityFeed: 'ព័ត៌មានដំណើរសហគមន៍ឥតគិតថ្លៃ',
    watchClips: 'មើលវីដេអូខ្លី',
    composerPrompt: 'ចែករំលែកដោយឥតគិតថ្លៃ៖ ទីកន្លែង ព្រឹត្តិការណ៍ ឬពេលវេលារីករាយ...',
    storyPrompt: 'ប្រាប់អ្នកដទៃថាហេតុអ្វីទីកន្លែងនេះគួរឱ្យចង់ទៅ...',
    placeName: 'ឈ្មោះទីកន្លែង ឬព្រឹត្តិការណ៍',
    chooseProvince: 'ជ្រើសរើសខេត្ត ឬក្រុង',
    chooseDistrict: 'ស្រុក / ខណ្ឌ (ស្វ័យប្រវត្តិពីឃុំ)',
    chooseCommune: 'ឃុំ / សង្កាត់',
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
    save: 'រក្សាទុកកន្លែង',
    firstComment: 'ក្លាយជាអ្នកដំបូងដែលចែករំលែកមតិ',
    commentPlaceholder: 'សរសេរមតិ...',
    everyProvince: 'ភាពរីករាយ និងកន្លែងលាក់ខ្លួនពីគ្រប់ខេត្ត',
  },
  clips: {
    title: 'វីដេអូខ្លីសុខសាន្ត',
    subtitle: '៣០វិនាទីនៃកម្ពុជា',
    empty: 'វីដេអូដំបូងកំពុងរង់ចាំការចែករំលែក',
    emptyHelp: 'បង្ហោះវីដេអូដំណើរខ្លីពីទំព័រព័ត៌មានសហគមន៍។',
    views: 'អ្នកមើល',
    mute: 'បិទសម្លេង',
    unmute: 'បើកសម្លេង',
    endMessage: 'អ្នកបានមើលអស់ហើយ — ត្រឡប់មកវិញពេលក្រោយ សម្រាប់កម្ពុជាបន្ថែម។',
    retryVideo: 'វីដេអូនេះផ្ទុកមិនបាន។ ចុចដើម្បីព្យាយាមម្ដងទៀត។',
    dataSaverNote: 'របៀបសន្សំទិន្នន័យបើក — ចុចដើម្បីមើលវីដេអូ',
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
    empty: 'រកមិនឃើញកន្លែង',
    emptyHelp: 'សាកល្បងប្រភេទ ឬពាក្យស្វែងរកផ្សេង។',
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
  auth: {
    loginTitle: 'សូមស្វាគមន៍ត្រឡប់មកវិញ',
    loginSubtitle: 'ចូលគណនី ដើម្បីបង្ហោះកន្លែង រក្សាទុកកន្លែងពិសេស និងតាមដានអ្នកចែករំលែកក្នុងស្រុក។',
    registerTitle: 'ចូលរួមជាមួយសុខសាន្តដោយឥតគិតថ្លៃ',
    registerSubtitle: 'បង្កើតគណនីឥតគិតថ្លៃ ដើម្បីចែករំលែកកន្លែងលាក់ខ្លួនរបស់កម្ពុជា។',
    name: 'ឈ្មោះរបស់អ្នក',
    namePlaceholder: 'ឧ. ដារ៉ា សុខ',
    email: 'អ៊ីមែល',
    password: 'ពាក្យសម្ងាត់',
    confirm: 'បញ្ជាក់ពាក្យសម្ងាត់',
    loginAction: 'ចូលគណនី',
    registerAction: 'បង្កើតគណនី',
    noAccount: 'មិនទាន់មានគណនី?',
    haveAccount: 'មានគណនីរួចហើយ?',
    logout: 'ចាកចេញ',
    loginNav: 'ចូលគណនី',
    joinNav: 'ចុះឈ្មោះឥតគិតថ្លៃ',
    nameError: 'សូមបញ្ចូលឈ្មោះរបស់អ្នក (យ៉ាងតិច ២ តួអក្សរ)។',
    emailError: 'សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលដែលត្រឹមត្រូវ។',
    passwordError: 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៨ តួអក្សរ។',
    confirmError: 'ពាក្យសម្ងាត់មិនដូចគ្នា។',
    genericError: 'មានកំហុសកើតឡើង។ សូមព្យាយាមម្ដងទៀត។',
    showPassword: 'បង្ហាញពាក្យសម្ងាត់',
    hidePassword: 'លាក់ពាក្យសម្ងាត់',
    composerLoginTitle: 'ចូលគណនី ដើម្បីចែករំលែកកន្លែងរបស់អ្នក',
    composerLoginBody: 'បង្ហោះ ចូលចិត្ត មតិ និងរក្សាទុក គឺឥតគិតថ្លៃ — អ្នកគ្រាន់តែត្រូវការគណនី។',
    composerLoginCta: 'ចូលគណនី ឬចុះឈ្មោះឥតគិតថ្លៃ',
    savedOnly: 'ចូលគណនី ដើម្បីរក្សាទុកកន្លែងក្នុងបញ្ជីរបស់អ្នក។',
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
