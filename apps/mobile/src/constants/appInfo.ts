// LUMA application metadata and constant information

import { Platform } from 'react-native';

// --- Core app identity ---
export const APP_NAME = 'LUMA' as const;
export const APP_DISPLAY_NAME = 'LUMA - Ruh Esin Bul' as const;
export const APP_TAGLINE = 'Gerçekten uyumlu insanlarla tanışma platformu' as const;
export const APP_VERSION = '1.0.0' as const;
export const BUILD_NUMBER = '1' as const;
export const APP_IDENTIFIER = 'com.luma.dating' as const;
export const APP_SCHEME = 'luma' as const;

// --- Version metadata ---
export const VERSION_INFO = {
  /** Semantic version displayed to users */
  appVersion: APP_VERSION,
  /** Build number for store submissions (incremented by EAS) */
  buildNumber: BUILD_NUMBER,
  /** Minimum version required — force-update if user is below this */
  minSupportedVersion: '1.0.0' as const,
  /** Used by OTA update channel selection */
  releaseChannel: __DEV__ ? 'development' : 'production',
} as const;

// --- Support and legal links ---
export const SUPPORT_EMAIL = 'destek@luma.dating' as const;
export const SUPPORT_PHONE = '+90 850 000 0000' as const;
export const PRIVACY_URL = 'https://luma.dating/gizlilik' as const;
export const TERMS_URL = 'https://luma.dating/kullanim-kosullari' as const;
export const FAQ_URL = 'https://luma.dating/sss' as const;
export const CONTACT_URL = 'https://luma.dating/iletisim' as const;
export const EULA_URL = 'https://luma.dating/eula' as const;
export const COOKIE_POLICY_URL = 'https://luma.dating/cerez-politikasi' as const;
export const DATA_DELETION_URL = 'https://luma.dating/veri-silme' as const;

// --- Store URLs ---
export const STORE_URLS = {
  APPLE: 'https://apps.apple.com/tr/app/luma-dating/id0000000000',
  GOOGLE: 'https://play.google.com/store/apps/details?id=com.luma.dating',
} as const;

/**
 * Returns the store URL for the current platform.
 */
export const getStoreUrl = (): string => {
  return Platform.OS === 'ios' ? STORE_URLS.APPLE : STORE_URLS.GOOGLE;
};

/**
 * Returns a deep link to the store review/rating page for the current platform.
 */
export const getStoreReviewUrl = (): string => {
  if (Platform.OS === 'ios') {
    // Apple SKStoreReviewController uses this action parameter
    return `${STORE_URLS.APPLE}?action=write-review`;
  }
  return `${STORE_URLS.GOOGLE}&reviewId=0`;
};

// --- Social media links ---
export const SOCIAL_LINKS = {
  INSTAGRAM: 'https://instagram.com/lumaapp',
  TWITTER: 'https://twitter.com/lumaapp',
  TIKTOK: 'https://tiktok.com/@lumaapp',
  LINKEDIN: 'https://linkedin.com/company/lumaapp',
  WEBSITE: 'https://luma.dating',
} as const;

// --- Minimum supported OS versions ---
export const MINIMUM_OS_VERSION = {
  IOS: '15.0',
  ANDROID_SDK: 29, // Android 10
  ANDROID_DISPLAY: '10',
} as const;

// --- Website ---
export const WEBSITE_URL = 'https://luma.dating' as const;

// --- Deep link schema ---
export const DEEP_LINK_SCHEME = APP_SCHEME;
export const DEEP_LINK_PREFIX = `${DEEP_LINK_SCHEME}://` as const;
export const UNIVERSAL_LINK_DOMAIN = 'luma.dating' as const;
export const UNIVERSAL_LINK_PREFIXES = [
  `https://${UNIVERSAL_LINK_DOMAIN}`,
  `https://www.${UNIVERSAL_LINK_DOMAIN}`,
  DEEP_LINK_PREFIX,
] as const;

// --- Minimum supported versions ---
export const MIN_SUPPORTED_VERSION = '1.0.0' as const;

// --- App Store submission metadata (Turkish — user-facing) ---
export const APP_STORE_META = {
  /** Short description for store listing (max 80 chars) */
  subtitle: 'Uyumlu insanlarla tanışma platformu',
  /** Promotional text (can be updated without new build) */
  promotionalText: 'LUMA ile gerçekten uyumlu insanları keşfet!',
  /** Keywords for App Store search optimization */
  keywords:
    'tanışma,flört,aşk,dating,uyumluluk,eşleştirme,ilişki,arkadaş,premium',
  /** App Store category */
  primaryCategory: 'SOCIAL_NETWORKING',
  secondaryCategory: 'LIFESTYLE',
  /** Content rating */
  contentRating: '17+',
  /** Copyright notice */
  copyright: `Copyright ${new Date().getFullYear()} LUMA Dating. Tüm hakları saklıdır.`,
} as const;

// --- Consolidated app info export ---
export const APP_INFO = {
  name: APP_NAME,
  displayName: APP_DISPLAY_NAME,
  tagline: APP_TAGLINE,
  version: APP_VERSION,
  buildNumber: BUILD_NUMBER,
  identifier: APP_IDENTIFIER,
  scheme: APP_SCHEME,
  supportEmail: SUPPORT_EMAIL,
  supportPhone: SUPPORT_PHONE,
  privacyUrl: PRIVACY_URL,
  termsUrl: TERMS_URL,
  eulaUrl: EULA_URL,
  faqUrl: FAQ_URL,
  contactUrl: CONTACT_URL,
  dataDeletionUrl: DATA_DELETION_URL,
  storeUrls: STORE_URLS,
  socialLinks: SOCIAL_LINKS,
  deepLinkScheme: DEEP_LINK_SCHEME,
  versionInfo: VERSION_INFO,
  storeMeta: APP_STORE_META,
} as const;

export type AppInfo = typeof APP_INFO;
