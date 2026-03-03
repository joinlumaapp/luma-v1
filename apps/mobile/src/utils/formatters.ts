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
 * Format distance in kilometers
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return '< 1 km';
  }
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }
  return `${Math.round(distanceKm)} km`;
};

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
 * Format relative time (e.g., "2 dakika once", "3 saat once")
 */
export const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Simdi';
  if (diffMins < 60) return `${diffMins} dakika once`;
  if (diffHours < 24) return `${diffHours} saat once`;
  if (diffDays < 7) return `${diffDays} gun once`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta once`;
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
 * Format gold amount with Turkish locale
 */
export const formatGold = (amount: number): string => {
  return `${amount.toLocaleString('tr-TR')} Gold`;
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
  if (amount === 0) return 'Ucretsiz';
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
