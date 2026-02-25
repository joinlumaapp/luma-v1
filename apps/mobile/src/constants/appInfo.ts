// LUMA uygulama meta verileri ve sabit bilgiler

import { Platform } from 'react-native';

// --- Uygulama temel bilgileri ---
export const APP_NAME = 'LUMA' as const;
export const APP_VERSION = '1.0.0' as const;
export const BUILD_NUMBER = '1' as const;
export const APP_IDENTIFIER = 'com.luma.app' as const;

// --- Destek ve yasal bağlantılar ---
export const SUPPORT_EMAIL = 'destek@luma.dating' as const;
export const PRIVACY_URL = 'https://luma.dating/gizlilik' as const;
export const TERMS_URL = 'https://luma.dating/kullanim-kosullari' as const;
export const FAQ_URL = 'https://luma.dating/sss' as const;
export const CONTACT_URL = 'https://luma.dating/iletisim' as const;

// --- Mağaza bağlantıları ---
export const STORE_URLS = {
  APPLE: 'https://apps.apple.com/app/luma-dating/id0000000000',
  GOOGLE: 'https://play.google.com/store/apps/details?id=com.luma.app',
} as const;

/**
 * Mevcut platforma göre mağaza bağlantısını döndürür.
 */
export const getStoreUrl = (): string => {
  return Platform.OS === 'ios' ? STORE_URLS.APPLE : STORE_URLS.GOOGLE;
};

// --- Sosyal medya bağlantıları ---
export const SOCIAL_LINKS = {
  INSTAGRAM: 'https://instagram.com/lumaapp',
  TWITTER: 'https://twitter.com/lumaapp',
  TIKTOK: 'https://tiktok.com/@lumaapp',
  LINKEDIN: 'https://linkedin.com/company/lumaapp',
} as const;

// --- Deep link şeması ---
export const DEEP_LINK_SCHEME = 'luma' as const;
export const DEEP_LINK_PREFIX = `${DEEP_LINK_SCHEME}://` as const;
export const UNIVERSAL_LINK_DOMAIN = 'luma.dating' as const;

// --- Minimum desteklenen sürümler ---
export const MIN_SUPPORTED_VERSION = '1.0.0' as const;

// --- Uygulama bilgi özeti (dışa aktarım kolaylığı için) ---
export const APP_INFO = {
  name: APP_NAME,
  version: APP_VERSION,
  buildNumber: BUILD_NUMBER,
  identifier: APP_IDENTIFIER,
  supportEmail: SUPPORT_EMAIL,
  privacyUrl: PRIVACY_URL,
  termsUrl: TERMS_URL,
  faqUrl: FAQ_URL,
  contactUrl: CONTACT_URL,
  storeUrls: STORE_URLS,
  socialLinks: SOCIAL_LINKS,
  deepLinkScheme: DEEP_LINK_SCHEME,
} as const;

export type AppInfo = typeof APP_INFO;
