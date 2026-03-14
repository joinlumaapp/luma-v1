// LUMA Profile Prompt Bank — Turkish prompt questions organized by category

export type PromptCategory = 'kisilik' | 'iliski' | 'yasam' | 'eglence';

export interface PromptOption {
  id: string;
  category: PromptCategory;
  textTr: string;
}

export interface PromptCategoryInfo {
  key: PromptCategory;
  label: string;
}

export const PROMPT_CATEGORIES: PromptCategoryInfo[] = [
  { key: 'kisilik', label: 'Kisilik' },
  { key: 'iliski', label: 'Iliski' },
  { key: 'yasam', label: 'Yasam' },
  { key: 'eglence', label: 'Eglence' },
];

export const MAX_PROMPTS = 3;
export const MAX_PROMPT_ANSWER_LENGTH = 200;

export const PROMPT_BANK: PromptOption[] = [
  // ── Kisilik (Personality) ──────────────────────────────────────
  {
    id: 'kisilik_01',
    category: 'kisilik',
    textTr: 'Beni en iyi anlatan 3 kelime...',
  },
  {
    id: 'kisilik_02',
    category: 'kisilik',
    textTr: 'Hafta sonu planim genellikle...',
  },
  {
    id: 'kisilik_03',
    category: 'kisilik',
    textTr: 'En cok guldugum an...',
  },
  {
    id: 'kisilik_04',
    category: 'kisilik',
    textTr: 'Ilk izlenimde insanlar benim hakkimda...',
  },
  {
    id: 'kisilik_05',
    category: 'kisilik',
    textTr: 'Gizli yetenegim...',
  },
  {
    id: 'kisilik_06',
    category: 'kisilik',
    textTr: 'Sabah insani mi gece kusu mu?',
  },
  {
    id: 'kisilik_07',
    category: 'kisilik',
    textTr: 'Hayatimdaki en cesur karar...',
  },
  {
    id: 'kisilik_08',
    category: 'kisilik',
    textTr: 'Arkadaslarim beni tanimlarken...',
  },
  {
    id: 'kisilik_09',
    category: 'kisilik',
    textTr: 'Kendimi en rahat hissettigim yer...',
  },
  {
    id: 'kisilik_10',
    category: 'kisilik',
    textTr: 'Beni mutlu eden kucuk seyler...',
  },

  // ── Iliski (Relationship) ─────────────────────────────────────
  {
    id: 'iliski_01',
    category: 'iliski',
    textTr: 'Ideal ilk bulusma...',
  },
  {
    id: 'iliski_02',
    category: 'iliski',
    textTr: 'Iliskide en onemli sey bence...',
  },
  {
    id: 'iliski_03',
    category: 'iliski',
    textTr: 'Ask benim icin...',
  },
  {
    id: 'iliski_04',
    category: 'iliski',
    textTr: 'Partner olarak en iyi ozelligim...',
  },
  {
    id: 'iliski_05',
    category: 'iliski',
    textTr: 'Birlikte yapmak istedigim sey...',
  },
  {
    id: 'iliski_06',
    category: 'iliski',
    textTr: 'Iliskide asla vazgecemeyecegim...',
  },
  {
    id: 'iliski_07',
    category: 'iliski',
    textTr: 'Beni etkilemenin en kolay yolu...',
  },
  {
    id: 'iliski_08',
    category: 'iliski',
    textTr: 'Romantik bir jest benim icin...',
  },
  {
    id: 'iliski_09',
    category: 'iliski',
    textTr: 'Iliskide en cok deger verdigim...',
  },
  {
    id: 'iliski_10',
    category: 'iliski',
    textTr: 'Hayalimdeki birlikte yasam...',
  },

  // ── Yasam (Lifestyle) ─────────────────────────────────────────
  {
    id: 'yasam_01',
    category: 'yasam',
    textTr: 'Hayatimda gurur duydugum sey...',
  },
  {
    id: 'yasam_02',
    category: 'yasam',
    textTr: '5 yil sonra kendimi... olarak goruyorum',
  },
  {
    id: 'yasam_03',
    category: 'yasam',
    textTr: 'Vazgeçemediğim aliskanlik...',
  },
  {
    id: 'yasam_04',
    category: 'yasam',
    textTr: 'Hayat motom...',
  },
  {
    id: 'yasam_05',
    category: 'yasam',
    textTr: 'En son ne zaman risk aldin?',
  },
  {
    id: 'yasam_06',
    category: 'yasam',
    textTr: 'Ruya meslegim...',
  },
  {
    id: 'yasam_07',
    category: 'yasam',
    textTr: 'Dunyayi degistirebilsem...',
  },
  {
    id: 'yasam_08',
    category: 'yasam',
    textTr: 'Evde mi disarida mi vakit gecirmeyi severim?',
  },
  {
    id: 'yasam_09',
    category: 'yasam',
    textTr: 'Bu yil kesfettigim en guzel sey...',
  },
  {
    id: 'yasam_10',
    category: 'yasam',
    textTr: 'Bir gun mutlaka yapmak istedigim...',
  },

  // ── Eglence (Fun) ─────────────────────────────────────────────
  {
    id: 'eglence_01',
    category: 'eglence',
    textTr: "Spotify'da en cok dinledigim...",
  },
  {
    id: 'eglence_02',
    category: 'eglence',
    textTr: 'Son izledigim dizi ve dusuncem...',
  },
  {
    id: 'eglence_03',
    category: 'eglence',
    textTr: 'Yemek yapmayi seviyorum cunku...',
  },
  {
    id: 'eglence_04',
    category: 'eglence',
    textTr: 'Seyahat ettigim en guzel yer...',
  },
  {
    id: 'eglence_05',
    category: 'eglence',
    textTr: 'Karantinada ogrendigim sey...',
  },
  {
    id: 'eglence_06',
    category: 'eglence',
    textTr: 'Evcil hayvan mi cocukluk hayalim...',
  },
  {
    id: 'eglence_07',
    category: 'eglence',
    textTr: 'Favori film repligim...',
  },
  {
    id: 'eglence_08',
    category: 'eglence',
    textTr: 'Bir super gucum olsa...',
  },
  {
    id: 'eglence_09',
    category: 'eglence',
    textTr: 'Herkesi sasirtan hobim...',
  },
  {
    id: 'eglence_10',
    category: 'eglence',
    textTr: 'Issiz bir adaya goturecegin 3 sey...',
  },
];

/** Get prompts filtered by category */
export const getPromptsByCategory = (category: PromptCategory): PromptOption[] =>
  PROMPT_BANK.filter((p) => p.category === category);

/** Get a prompt by its ID */
export const getPromptById = (id: string): PromptOption | undefined =>
  PROMPT_BANK.find((p) => p.id === id);
