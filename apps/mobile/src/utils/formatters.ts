// Formatting utilities for LUMA app

/**
 * Calculate and format age from birth date string
 */
export const formatAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

/**
 * Format distance in kilometers (compact, no suffix — used for card badges)
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    const rounded = Math.max(100, Math.round(meters / 100) * 100);
    return `${rounded} m`;
  }
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }
  return `${Math.round(distanceKm)} km`;
};

/**
 * Format distance in Turkish with "uzaginda" suffix — used for card display.
 * Re-exported from locationService to maintain a single source of truth.
 */
export { formatDistanceTr as formatDistanceTurkish } from '../services/locationService';

/**
 * Format a date to Turkish locale
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Format relative time (e.g., "2 dakika önce", "3 saat önce")
 */
export const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Şimdi';
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
  return formatDate(dateString);
};

/**
 * Format match activity timestamp for match list display.
 * Today → "Bugün HH:MM"
 * Yesterday → "Dün"
 * 2-6 days → "X gün önce"
 * 7+ days → "X hafta önce" or full date
 */
export const formatMatchActivity = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);

  if (isNaN(date.getTime())) return '';

  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((nowDate.getTime() - inputDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `Bugün ${hours}:${minutes}`;
  }
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 4) return `${weeks} hafta önce`;
  return formatDate(dateString);
};

/**
 * Format user activity status for display.
 * Online (within 2 min) → "Şu an aktif"
 * Recently → "5 dk önce aktifti", "1 saat önce aktifti"
 * Today → "Bugün aktifti"
 * Older → null (don't show)
 */
export const formatActivityStatus = (
  lastActiveAt: string | null | undefined,
): { text: string; isOnline: boolean } | null => {
  if (!lastActiveAt) return null;
  const date = new Date(lastActiveAt);
  if (isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 2) return { text: 'Şu an aktif', isOnline: true };
  if (diffMins < 60) return { text: `${diffMins} dk önce aktifti`, isOnline: false };
  if (diffHours < 24) return { text: `${diffHours} saat önce aktifti`, isOnline: false };

  // Check if today
  const now = new Date();
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return { text: 'Bugün aktifti', isOnline: false };
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return { text: 'Dün aktifti', isOnline: false };
  }

  // Days ago
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return { text: `${diffDays} gün önce aktifti`, isOnline: false };

  // Weeks ago
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 4) return { text: `${weeks} hafta önce aktifti`, isOnline: false };

  // Older — still show something
  return { text: '1 ay+ önce aktifti', isOnline: false };
};

/**
 * Format gold amount with Turkish locale
 */
export const formatGold = (amount: number): string => {
  return `${amount.toLocaleString('tr-TR')} Jeton`;
};

/**
 * Format compatibility percentage
 */
export const formatCompatibility = (percent: number): string => {
  return `%${Math.round(percent)}`;
};

/**
 * Get compatibility level label
 */
export const getCompatibilityLevel = (percent: number): string => {
  if (percent >= 90) return 'Mukemmel Uyum';
  if (percent >= 75) return 'Yuksek Uyum';
  if (percent >= 60) return 'Iyi Uyum';
  if (percent >= 40) return 'Orta Uyum';
  return 'Dusuk Uyum';
};

/**
 * Get personality-driven compatibility label with color and emoji
 * Used on feed profile screens and public profile views
 */
export interface CompatibilityPersonality {
  label: string;
  description: string;
  emoji: string;
  color: string;
  tier: 'soulmate' | 'very_high' | 'high' | 'explore' | 'independent';
}

export const getCompatibilityPersonality = (percent: number): CompatibilityPersonality => {
  if (percent >= 90) {
    return {
      label: 'Ruh İkizi',
      description: 'Düşünce yapınız ve değerleriniz çok benzer!',
      emoji: '\u2728',
      color: '#F59E0B',
      tier: 'soulmate',
    };
  }
  if (percent >= 75) {
    return {
      label: 'Çok Uyumlu',
      description: 'Güçlü ortak noktalarınız var.',
      emoji: '\uD83D\uDC9C',
      color: '#8B5CF6',
      tier: 'very_high',
    };
  }
  if (percent >= 60) {
    return {
      label: 'Uyumlu',
      description: 'Birbirinizi tamamlayan yönleriniz var.',
      emoji: '\uD83E\uDD1D',
      color: '#3B82F6',
      tier: 'high',
    };
  }
  if (percent >= 40) {
    return {
      label: 'Keşfedilecek',
      description: 'Farklılıklarınız ilginç bir dinamik yaratabilir.',
      emoji: '\uD83D\uDD0D',
      color: '#8B7355',
      tier: 'explore',
    };
  }
  return {
    label: 'Başına Buyruk',
    description: 'Farklı dünyalardan geliyorsunuz — bu bir zenginlik!',
    emoji: '\uD83C\uDF0A',
    color: '#6B7280',
    tier: 'independent',
  };
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+90') && cleaned.length === 13) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  return cleaned;
};

/**
 * Format price in TL
 */
export const formatPrice = (amount: number): string => {
  if (amount === 0) return 'Ücretsiz';
  return `${amount.toFixed(2)} TL`;
};

/**
 * Format timer seconds to MM:SS
 */
export const formatTimer = (totalSeconds: number): string => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
};

// ─── Enum → Turkish label translations ───────────────────────────

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Erkek',
  male: 'Erkek',
  FEMALE: 'Kadın',
  female: 'Kadın',
  OTHER: 'Diğer',
  other: 'Diğer',
};

const SMOKING_LABELS: Record<string, string> = {
  NEVER: 'İçmiyor',
  never: 'İçmiyor',
  SOMETIMES: 'Ara sıra',
  sometimes: 'Ara sıra',
  OFTEN: 'Sık sık',
  often: 'Sık sık',
  QUIT: 'Bıraktım',
  quit: 'Bıraktım',
  REGULAR: 'İçiyor',
  regular: 'İçiyor',
  TOLERATE: 'İçmez ama karışmaz',
  tolerate: 'İçmez ama karışmaz',
};

const SPORTS_LABELS: Record<string, string> = {
  NEVER: 'Pek yapmam',
  never: 'Pek yapmam',
  SOMETIMES: 'Ara sıra',
  sometimes: 'Ara sıra',
  REGULAR: 'Düzenli',
  regular: 'Düzenli',
  OFTEN: 'Düzenli',
  often: 'Düzenli',
  DAILY: 'Her gün',
  daily: 'Her gün',
};

const CHILDREN_LABELS: Record<string, string> = {
  HAVE: 'Var',
  have: 'Var',
  NO_CHILDREN: 'Yok',
  no_children: 'Yok',
  WANT: 'İstiyor',
  want: 'İleride olabilir',
  MAYBE: 'Belki',
  maybe: 'Belki',
  DONT_WANT: 'İstemiyor',
  dont_want: 'İstemiyor',
};

const INTENTION_TAG_LABELS: Record<string, string> = {
  SERIOUS_RELATIONSHIP: 'Ciddi İlişki',
  serious: 'Ciddi İlişki',
  EXPLORING: 'Keşfediyorum',
  exploring: 'Keşfediyorum',
  NOT_SURE: 'Emin Değilim',
  not_sure: 'Emin Değilim',
};

const PACKAGE_TIER_LABELS: Record<string, string> = {
  FREE: 'Ücretsiz',
  GOLD: 'Premium',
  PRO: 'Pro',
  RESERVED: 'Supreme',
};

/** Translate gender enum to Turkish display label */
export const translateGender = (value: string | null | undefined): string =>
  value ? GENDER_LABELS[value] ?? value : 'Belirtilmedi';

/** Translate smoking enum to Turkish display label */
export const translateSmoking = (value: string | null | undefined): string =>
  value ? SMOKING_LABELS[value] ?? value : 'Belirtilmedi';

/** Translate sports/exercise enum to Turkish display label */
export const translateSports = (value: string | null | undefined): string =>
  value ? SPORTS_LABELS[value] ?? value : 'Belirtilmedi';

/** Translate children enum to Turkish display label */
export const translateChildren = (value: string | null | undefined): string =>
  value ? CHILDREN_LABELS[value] ?? value : 'Belirtilmedi';

/** Translate intention tag enum to Turkish display label */
export const translateIntentionTag = (value: string | null | undefined): string =>
  value ? INTENTION_TAG_LABELS[value] ?? value : 'Belirtilmedi';

/** Translate package tier enum to Turkish display label */
export const translatePackageTier = (value: string | null | undefined): string =>
  value ? PACKAGE_TIER_LABELS[value] ?? value : 'Ücretsiz';
