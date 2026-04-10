// LUMA Profile Prompt Bank — Turkish prompt questions organized by category
// Hinge+Bumble inspired: 5 categories, emoji icons, pastel card colors
// Users can select up to MAX_PROMPTS (15) answers to display on their profile.

export type PromptCategory = 'kisilik' | 'yasam_tarzi' | 'hayaller' | 'eglence' | 'yemek_seyahat';

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
  { key: 'kisilik', label: 'Kisilik', emoji: '🎯', cardColors: ['#F3E8FF', '#EDE4FF'] },
  { key: 'yasam_tarzi', label: 'Yasam Tarzi', emoji: '☕', cardColors: ['#FFF1F2', '#FFE4E6'] },
  { key: 'hayaller', label: 'Hayaller', emoji: '💭', cardColors: ['#EFF6FF', '#DBEAFE'] },
  { key: 'eglence', label: 'Eglence', emoji: '🎵', cardColors: ['#ECFDF5', '#D1FAE5'] },
  { key: 'yemek_seyahat', label: 'Yemek & Seyahat', emoji: '🌍', cardColors: ['#FFFBEB', '#FEF3C7'] },
];

export const MAX_PROMPTS = 15;
export const MAX_PROMPT_ANSWER_LENGTH = 200;

export const PROMPT_BANK: PromptOption[] = [
  // ── Kisilik ──────────────────────────────────────────
  { id: 'k01', category: 'kisilik', emoji: '🎯', textTr: 'Beni en iyi anlatan 3 kelime...' },
  { id: 'k02', category: 'kisilik', emoji: '🌟', textTr: 'Arkadaslarim beni tanimlarken...' },
  { id: 'k03', category: 'kisilik', emoji: '💪', textTr: 'Hayatimdaki en cesur karar...' },
  { id: 'k04', category: 'kisilik', emoji: '🔮', textTr: 'Ilk izlenimde insanlar benim hakkimda...' },
  { id: 'k05', category: 'kisilik', emoji: '🎭', textTr: 'Gizli yetenegim...' },
  { id: 'k06', category: 'kisilik', emoji: '😊', textTr: 'Beni mutlu eden kucuk seyler...' },
  { id: 'k07', category: 'kisilik', emoji: '💎', textTr: 'En cok deger verdigim sey...' },
  { id: 'k08', category: 'kisilik', emoji: '😂', textTr: 'Hayatta en cok guldugum an...' },
  { id: 'k09', category: 'kisilik', emoji: '🧠', textTr: 'Beni en cok tanimlayan ozelligim...' },
  { id: 'k10', category: 'kisilik', emoji: '🔥', textTr: 'Tutkulu oldugum seyler...' },

  // ── Yasam Tarzi ──────────────────────────────────────
  { id: 'y01', category: 'yasam_tarzi', emoji: '☀️', textTr: 'Ideal bir hafta sonu nasil gecer?' },
  { id: 'y02', category: 'yasam_tarzi', emoji: '⏰', textTr: 'Sabah insani mi gece kusu mu?' },
  { id: 'y03', category: 'yasam_tarzi', emoji: '🏠', textTr: 'Evde mi disarida mi vakit gecirmeyi severim?' },
  { id: 'y04', category: 'yasam_tarzi', emoji: '☕', textTr: 'Bos zamanlarimda ne yapmayi severim...' },
  { id: 'y05', category: 'yasam_tarzi', emoji: '📖', textTr: 'Vazgecemedegim aliskanlik...' },
  { id: 'y06', category: 'yasam_tarzi', emoji: '🧘', textTr: 'Kendimi en rahat hissettigim yer...' },
  { id: 'y07', category: 'yasam_tarzi', emoji: '📅', textTr: 'Bir gunum genelde boyle gecer...' },
  { id: 'y08', category: 'yasam_tarzi', emoji: '🌆', textTr: 'Hafta sonu beni bulabileceginiz yer...' },
  { id: 'y09', category: 'yasam_tarzi', emoji: '🍳', textTr: 'Yemek yapma konusunda...' },
  { id: 'y10', category: 'yasam_tarzi', emoji: '✨', textTr: 'Sabah rutinimde olmazsa olmaz...' },

  // ── Hayaller ─────────────────────────────────────────
  { id: 'h01', category: 'hayaller', emoji: '💭', textTr: 'Hayatta en cok neye deger verirsin?' },
  { id: 'h02', category: 'hayaller', emoji: '🚀', textTr: '5 yil sonra kendimi... olarak goruyorum' },
  { id: 'h03', category: 'hayaller', emoji: '🌍', textTr: 'Dunyayi degistirebilsem...' },
  { id: 'h04', category: 'hayaller', emoji: '✨', textTr: 'Bir gun mutlaka yapmak istedigim...' },
  { id: 'h05', category: 'hayaller', emoji: '💫', textTr: 'Ruya meslegim...' },
  { id: 'h06', category: 'hayaller', emoji: '🎯', textTr: 'Hayat motom...' },
  { id: 'h07', category: 'hayaller', emoji: '🏝️', textTr: 'Hayalimdeki tatil...' },
  { id: 'h08', category: 'hayaller', emoji: '⚡', textTr: 'Bir super gucum olsaydi...' },
  { id: 'h09', category: 'hayaller', emoji: '📝', textTr: 'Kova listemde olan bir sey...' },
  { id: 'h10', category: 'hayaller', emoji: '🌱', textTr: 'Dunyada degistirmek istedigim bir sey...' },

  // ── Eglence ──────────────────────────────────────────
  { id: 'e01', category: 'eglence', emoji: '🎵', textTr: "Spotify'da en cok dinledigim..." },
  { id: 'e02', category: 'eglence', emoji: '📺', textTr: 'Son izledigim dizi ve dusuncem...' },
  { id: 'e03', category: 'eglence', emoji: '⚡', textTr: 'Super gucun olsa ne olurdu?' },
  { id: 'e04', category: 'eglence', emoji: '😂', textTr: 'En son ne zaman cok guldun?' },
  { id: 'e05', category: 'eglence', emoji: '🎬', textTr: 'Favori film repligim...' },
  { id: 'e06', category: 'eglence', emoji: '🏝️', textTr: 'Issiz bir adaya goturecegen 3 sey...' },
  { id: 'e07', category: 'eglence', emoji: '🎮', textTr: 'Gunumu keyifli yapan bir sey...' },

  // ── Yemek & Seyahat ─────────────────────────────────
  { id: 's01', category: 'yemek_seyahat', emoji: '✈️', textTr: 'Hayalindeki tatil nerede?' },
  { id: 's02', category: 'yemek_seyahat', emoji: '🗺️', textTr: 'Seyahat ettigim en guzel yer...' },
  { id: 's03', category: 'yemek_seyahat', emoji: '🍳', textTr: 'Yemek yapmayi seviyorum cunku...' },
  { id: 's04', category: 'yemek_seyahat', emoji: '🍕', textTr: 'Bir yemek olsan ne olurdun?' },
  { id: 's05', category: 'yemek_seyahat', emoji: '🌮', textTr: 'En sevdigim mutfak...' },
  { id: 's06', category: 'yemek_seyahat', emoji: '🧳', textTr: 'Bu yil kesfettigim en guzel sey...' },
  { id: 's07', category: 'yemek_seyahat', emoji: '🗼', textTr: 'En sevdigim seyahat anim...' },
];

/** Get prompts filtered by category */
export const getPromptsByCategory = (category: PromptCategory): PromptOption[] =>
  PROMPT_BANK.filter((p) => p.category === category);

/** Get a prompt by its ID */
export const getPromptById = (id: string): PromptOption | undefined =>
  PROMPT_BANK.find((p) => p.id === id);
