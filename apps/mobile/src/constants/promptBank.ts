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
  { key: 'kisilik', label: 'Kişilik' },
  { key: 'iliski', label: 'İlişki' },
  { key: 'yasam', label: 'Yaşam' },
  { key: 'eglence', label: 'Eğlence' },
];

export const MAX_PROMPTS = 3;
export const MAX_PROMPT_ANSWER_LENGTH = 200;

export const PROMPT_BANK: PromptOption[] = [
  // ── Kişilik (Personality) ──────────────────────────────────────
  {
    id: 'kisilik_01',
    category: 'kisilik',
    textTr: 'Beni en iyi anlatan 3 kelime...',
  },
  {
    id: 'kisilik_02',
    category: 'kisilik',
    textTr: 'Hafta sonu planım genellikle...',
  },
  {
    id: 'kisilik_03',
    category: 'kisilik',
    textTr: 'En çok güldüğüm an...',
  },
  {
    id: 'kisilik_04',
    category: 'kisilik',
    textTr: 'İlk izlenimde insanlar benim hakkımda...',
  },
  {
    id: 'kisilik_05',
    category: 'kisilik',
    textTr: 'Gizli yeteneğim...',
  },
  {
    id: 'kisilik_06',
    category: 'kisilik',
    textTr: 'Sabah insanı mı gece kuşu mu?',
  },
  {
    id: 'kisilik_07',
    category: 'kisilik',
    textTr: 'Hayatımdaki en cesur karar...',
  },
  {
    id: 'kisilik_08',
    category: 'kisilik',
    textTr: 'Arkadaşlarım beni tanımlarken...',
  },
  {
    id: 'kisilik_09',
    category: 'kisilik',
    textTr: 'Kendimi en rahat hissettiğim yer...',
  },
  {
    id: 'kisilik_10',
    category: 'kisilik',
    textTr: 'Beni mutlu eden küçük şeyler...',
  },

  // ── İlişki (Relationship) ─────────────────────────────────────
  {
    id: 'iliski_01',
    category: 'iliski',
    textTr: 'İdeal ilk buluşma...',
  },
  {
    id: 'iliski_02',
    category: 'iliski',
    textTr: 'İlişkide en önemli şey bence...',
  },
  {
    id: 'iliski_03',
    category: 'iliski',
    textTr: 'Aşk benim için...',
  },
  {
    id: 'iliski_04',
    category: 'iliski',
    textTr: 'Partner olarak en iyi özelliğim...',
  },
  {
    id: 'iliski_05',
    category: 'iliski',
    textTr: 'Birlikte yapmak istediğim şey...',
  },
  {
    id: 'iliski_06',
    category: 'iliski',
    textTr: 'İlişkide asla vazgeçemeyeceğim...',
  },
  {
    id: 'iliski_07',
    category: 'iliski',
    textTr: 'Beni etkilemenin en kolay yolu...',
  },
  {
    id: 'iliski_08',
    category: 'iliski',
    textTr: 'Romantik bir jest benim için...',
  },
  {
    id: 'iliski_09',
    category: 'iliski',
    textTr: 'İlişkide en çok değer verdiğim...',
  },
  {
    id: 'iliski_10',
    category: 'iliski',
    textTr: 'Hayalimdeki birlikte yaşam...',
  },

  // ── Yaşam (Lifestyle) ─────────────────────────────────────────
  {
    id: 'yasam_01',
    category: 'yasam',
    textTr: 'Hayatımda gurur duyduğum şey...',
  },
  {
    id: 'yasam_02',
    category: 'yasam',
    textTr: '5 yıl sonra kendimi... olarak görüyorum',
  },
  {
    id: 'yasam_03',
    category: 'yasam',
    textTr: 'Vazgeçemediğim alışkanlık...',
  },
  {
    id: 'yasam_04',
    category: 'yasam',
    textTr: 'Hayat motom...',
  },
  {
    id: 'yasam_05',
    category: 'yasam',
    textTr: 'En son ne zaman risk aldın?',
  },
  {
    id: 'yasam_06',
    category: 'yasam',
    textTr: 'Rüya mesleğim...',
  },
  {
    id: 'yasam_07',
    category: 'yasam',
    textTr: 'Dünyayı değiştirebilsem...',
  },
  {
    id: 'yasam_08',
    category: 'yasam',
    textTr: 'Evde mi dışarıda mı vakit geçirmeyi severim?',
  },
  {
    id: 'yasam_09',
    category: 'yasam',
    textTr: 'Bu yıl keşfettiğim en güzel şey...',
  },
  {
    id: 'yasam_10',
    category: 'yasam',
    textTr: 'Bir gün mutlaka yapmak istediğim...',
  },

  // ── Eğlence (Fun) ─────────────────────────────────────────────
  {
    id: 'eglence_01',
    category: 'eglence',
    textTr: "Spotify'da en çok dinlediğim...",
  },
  {
    id: 'eglence_02',
    category: 'eglence',
    textTr: 'Son izlediğim dizi ve düşüncem...',
  },
  {
    id: 'eglence_03',
    category: 'eglence',
    textTr: 'Yemek yapmayı seviyorum çünkü...',
  },
  {
    id: 'eglence_04',
    category: 'eglence',
    textTr: 'Seyahat ettiğim en güzel yer...',
  },
  {
    id: 'eglence_05',
    category: 'eglence',
    textTr: 'Karantinada öğrendiğim şey...',
  },
  {
    id: 'eglence_06',
    category: 'eglence',
    textTr: 'Evcil hayvan mı çocukluk hayalim...',
  },
  {
    id: 'eglence_07',
    category: 'eglence',
    textTr: 'Favori film repliğim...',
  },
  {
    id: 'eglence_08',
    category: 'eglence',
    textTr: 'Bir süper gücüm olsa...',
  },
  {
    id: 'eglence_09',
    category: 'eglence',
    textTr: 'Herkesi şaşırtan hobim...',
  },
  {
    id: 'eglence_10',
    category: 'eglence',
    textTr: 'Issız bir adaya götüreceğin 3 şey...',
  },
];

/** Get prompts filtered by category */
export const getPromptsByCategory = (category: PromptCategory): PromptOption[] =>
  PROMPT_BANK.filter((p) => p.category === category);

/** Get a prompt by its ID */
export const getPromptById = (id: string): PromptOption | undefined =>
  PROMPT_BANK.find((p) => p.id === id);
