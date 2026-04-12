// LUMA Profile Prompt Bank — Turkish prompt questions organized by category
// 3 categories, 5 questions each = 15 total prompts
// Users can answer up to MAX_PROMPTS (15) to display on their profile.

export type PromptCategory = 'kisilik' | 'yasam_tarzi' | 'hayaller';

export interface PromptOption {
  id: string;
  category: PromptCategory;
  textTr: string;
  emoji: string;
}

export interface PromptCategoryInfo {
  key: PromptCategory;
  label: string;
  emoji: string;
  /** Pastel card gradient for prompts in this category */
  cardColors: [string, string];
}

export const PROMPT_CATEGORIES: PromptCategoryInfo[] = [
  { key: 'kisilik', label: 'Kişilik', emoji: '🎯', cardColors: ['#F3E8FF', '#EDE4FF'] },
  { key: 'yasam_tarzi', label: 'Yaşam Tarzı', emoji: '☕', cardColors: ['#FFF1F2', '#FFE4E6'] },
  { key: 'hayaller', label: 'Hayaller', emoji: '💭', cardColors: ['#EFF6FF', '#DBEAFE'] },
];

export const MAX_PROMPTS = 15;
export const MAX_PROMPT_ANSWER_LENGTH = 200;

export const PROMPT_BANK: PromptOption[] = [
  // ── Kişilik ──────────────────────────────────────────
  { id: 'k01', category: 'kisilik', emoji: '😊', textTr: 'Arkadaşların seni nasıl tanımlar?' },
  { id: 'k02', category: 'kisilik', emoji: '🤣', textTr: 'Seni en çok güldüren şey ne?' },
  { id: 'k03', category: 'kisilik', emoji: '💬', textTr: 'İlk buluşmada nelerden konuşursun?' },
  { id: 'k04', category: 'kisilik', emoji: '🙈', textTr: 'Kimsenin bilmediği bir özelliğin?' },
  { id: 'k05', category: 'kisilik', emoji: '❤️', textTr: 'Bir insanda en çok neye değer verirsin?' },

  // ── Yaşam Tarzı ──────────────────────────────────────
  { id: 'y01', category: 'yasam_tarzi', emoji: '☕', textTr: 'Mükemmel bir pazar günün nasıl geçer?' },
  { id: 'y02', category: 'yasam_tarzi', emoji: '🎵', textTr: 'Son dinlediğin şarkı?' },
  { id: 'y03', category: 'yasam_tarzi', emoji: '📺', textTr: 'Favori dizin/filmin?' },
  { id: 'y04', category: 'yasam_tarzi', emoji: '🍕', textTr: 'En sevdiğin yemek?' },
  { id: 'y05', category: 'yasam_tarzi', emoji: '🌆', textTr: 'Rüya şehrin neresi?' },

  // ── Hayaller ─────────────────────────────────────────
  { id: 'h01', category: 'hayaller', emoji: '💭', textTr: '5 yıl sonra kendini nerede görüyorsun?' },
  { id: 'h02', category: 'hayaller', emoji: '✈️', textTr: 'Gitmek istediğin bir yer?' },
  { id: 'h03', category: 'hayaller', emoji: '🎯', textTr: 'Hayatında değiştirmek istediğin bir şey?' },
  { id: 'h04', category: 'hayaller', emoji: '💑', textTr: 'İdeal ilk buluşma nasıl olurdu?' },
  { id: 'h05', category: 'hayaller', emoji: '🌟', textTr: 'Hayalindeki yaşam nasıl?' },
];

/** Get prompts filtered by category */
export const getPromptsByCategory = (category: PromptCategory): PromptOption[] =>
  PROMPT_BANK.filter((p) => p.category === category);

/** Get a prompt by its ID */
export const getPromptById = (id: string): PromptOption | undefined =>
  PROMPT_BANK.find((p) => p.id === id);
