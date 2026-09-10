'use client';
/**
 * KEJA multilingual layer (proposal §14): English · Kiswahili · Français.
 *
 * Lightweight dictionary i18n — no runtime dependency, works offline in the
 * PWA and native shells. Longer term: Kinyarwanda, Luganda, Amharic, Arabic.
 * The AI advisor engine carries its own trilingual answer sets.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Lang = 'en' | 'sw' | 'fr';

const LS_KEY = 'keja:lang';

type Dict = Record<string, string>;

const en: Dict = {
  'nav.discover': 'Discover',
  'nav.verify': 'Verify',
  'nav.analyse': 'Analyse',
  'nav.finance': 'Finance',
  'nav.invest': 'Invest',
  'nav.transact': 'Transact',
  'nav.manage': 'Manage',
  'nav.data': 'Market Data',
  'nav.token': 'Tokenize',
  'nav.diaspora': 'Diaspora',
  'nav.developers': 'Developers',
  'nav.institutional': 'Institutional',
  'nav.partners': 'Partners',
  'nav.trust': 'Trust Center',
  'nav.ask': 'Ask Keja AI',
  'nav.account': 'Account',
  'hero.eyebrow': 'Africa\u2019s Real Estate Intelligence & Trust Infrastructure',
  'hero.title1': 'Discover. Verify. Analyse.',
  'hero.title2': 'Finance. Invest. Transact. Manage.',
  'hero.subtitle':
    'One intelligent ecosystem for every stakeholder in African real estate \u2014 buyers, sellers, landlords, tenants, investors, developers, banks and institutions.',
  'hero.cta': 'Explore Properties',
  'hero.cta2': 'Talk to Keja AI',
  'search.placeholder': 'Search area, type, budget\u2026 e.g. \u201C2BR Kilimani under 15M\u201D',
  'search.button': 'Search',
  'common.viewAll': 'View all',
  'common.learnMore': 'Learn more',
  'common.trustScore': 'KEJA Trust Score',
  'common.investmentScore': 'Investment Score',
  'common.monthlyRent': 'per month',
  'common.forSale': 'For sale',
  'common.bedrooms': 'beds',
  'common.bathrooms': 'baths',
  'common.demoNote': 'Trial platform \u2014 data is illustrative',
  'footer.tagline': 'Building the future of African real estate through AI, trusted data and technology.',
  'footer.product': 'Ecosystem',
  'footer.company': 'Company',
  'footer.resources': 'Resources',
  'footer.legal': 'Legal',
};

const sw: Dict = {
  'nav.discover': 'Gundua',
  'nav.verify': 'Thibitisha',
  'nav.analyse': 'Chambua',
  'nav.finance': 'Fedha',
  'nav.invest': 'Wekeza',
  'nav.transact': 'Fanya Mauzo',
  'nav.manage': 'Simamia',
  'nav.data': 'Takwimu za Soko',
  'nav.token': 'Tokenize',
  'nav.diaspora': 'Walioko Nje',
  'nav.developers': 'Wasanidi',
  'nav.institutional': 'Taasisi',
  'nav.partners': 'Washirika',
  'nav.trust': 'Kituo cha Uaminifu',
  'nav.ask': 'Uliza Keja AI',
  'nav.account': 'Akaunti',
  'hero.eyebrow': 'Miundombinu ya Ujasiri na Uaminifu wa Mali Isiyohamishika barani Afrika',
  'hero.title1': 'Gundua. Thibitisha. Chambua.',
  'hero.title2': 'Fadhili. Wekeza. Fanya Mauzo. Simamia.',
  'hero.subtitle':
    'Mfumo mmoja wa akili kwa wadau wote wa mali isiyohamishika Afrika \u2014 wanunuzi, wauzaji, wapangaji, wekezaji, wasanidi, benki na taasisi.',
  'hero.cta': 'Tafuta Mali',
  'hero.cta2': 'Zungumza na Keja AI',
  'search.placeholder': 'Tafuta eneo, aina, bajeti\u2026 mfano \u201C2BR Kilimani chini ya 15M\u201D',
  'search.button': 'Tafuta',
  'common.viewAll': 'Ona yote',
  'common.learnMore': 'Jifunze zaidi',
  'common.trustScore': 'Alama ya Uaminifu ya KEJA',
  'common.investmentScore': 'Alama ya Uwekezaji',
  'common.monthlyRent': 'kwa mwezi',
  'common.forSale': 'Inauzwa',
  'common.bedrooms': 'vyumba',
  'common.bathrooms': 'bafu',
  'common.demoNote': 'Jaribio \u2014 data ni ya mfano',
  'footer.tagline': 'Kujenga mustakabali wa mali isiyohamishika Afrika kwa AI, data ya kuaminika na teknolojia.',
  'footer.product': 'Mfumo',
  'footer.company': 'Kampuni',
  'footer.resources': 'Rasilimali',
  'footer.legal': 'Kisheria',
};

const fr: Dict = {
  'nav.discover': 'D\u00E9couvrir',
  'nav.verify': 'V\u00E9rifier',
  'nav.analyse': 'Analyser',
  'nav.finance': 'Financer',
  'nav.invest': 'Investir',
  'nav.transact': 'Transiger',
  'nav.manage': 'G\u00E9rer',
  'nav.data': 'Donn\u00E9es du March\u00E9',
  'nav.token': 'Tokeniser',
  'nav.diaspora': 'Diaspora',
  'nav.developers': 'Promoteurs',
  'nav.institutional': 'Institutionnel',
  'nav.partners': 'Partenaires',
  'nav.trust': 'Centre de Confiance',
  'nav.ask': 'Demander \u00E0 Keja AI',
  'nav.account': 'Compte',
  'hero.eyebrow': 'Infrastructure d\u2019Intelligence et de Confiance Immobili\u00E8re de l\u2019Afrique',
  'hero.title1': 'D\u00E9couvrir. V\u00E9rifier. Analyser.',
  'hero.title2': 'Financer. Investir. Transiger. G\u00E9rer.',
  'hero.subtitle':
    'Un \u00E9cosyst\u00E8me intelligent pour toutes les parties prenantes de l\u2019immobilier africain \u2014 acheteurs, vendeurs, bailleurs, locataires, investisseurs, promoteurs, banques et institutions.',
  'hero.cta': 'Explorer les Biens',
  'hero.cta2': 'Parler \u00E0 Keja AI',
  'search.placeholder': 'Rechercher zone, type, budget\u2026 ex. \u00AB 2BR Kilimani moins de 15M \u00BB',
  'search.button': 'Rechercher',
  'common.viewAll': 'Voir tout',
  'common.learnMore': 'En savoir plus',
  'common.trustScore': 'Score de Confiance KEJA',
  'common.investmentScore': 'Score d\u2019Investissement',
  'common.monthlyRent': 'par mois',
  'common.forSale': '\u00C0 vendre',
  'common.bedrooms': 'ch.',
  'common.bathrooms': 'sdb',
  'common.demoNote': 'Plateforme d\u2019essai \u2014 donn\u00E9es illustratives',
  'footer.tagline': 'B\u00E2tir l\u2019avenir de l\u2019immobilier africain par l\u2019IA, des donn\u00E9es fiables et la technologie.',
  'footer.product': '\u00C9cosyst\u00E8me',
  'footer.company': 'Entreprise',
  'footer.resources': 'Ressources',
  'footer.legal': 'Juridique',
};

const DICTS: Record<Lang, Dict> = { en, sw, fr };

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'sw', label: 'Kiswahili', flag: 'SW' },
  { code: 'fr', label: 'Fran\u00E7ais', flag: 'FR' },
];

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => undefined,
  t: (k, fb) => fb ?? k,
});

function readLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw === 'en' || raw === 'sw' || raw === 'fr') return raw;
  } catch {
    /* storage unavailable */
  }
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // client-only render (ssr:false) — storage is safe to read synchronously
  const [lang, setLangState] = useState<Lang>(readLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LS_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => DICTS[lang][key] ?? en[key] ?? fallback ?? key,
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
