// Deep link servisi — URL ayrıştırma ve ekran yönlendirme
// Desteklenen scheme: luma://
// Desteklenen rotalar: match, chat, profile, discovery, daily-picks, settings, membership

import type { NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { DEEP_LINK_SCHEME, DEEP_LINK_PREFIX } from '../constants/appInfo';

// ─── Parsed Deep Link Types ──────────────────────────────────────────

export type ParsedDeepLink =
  | { screen: 'MatchDetail'; params: { matchId: string } }
  | { screen: 'Chat'; params: { matchId: string; partnerName: string; partnerPhotoUrl: string } }
  | { screen: 'ProfilePreview'; params: { userId: string } }
  | { screen: 'Discovery'; params: undefined }
  | { screen: 'DailyPicks'; params: undefined }
  | { screen: 'Settings'; params: undefined }
  | { screen: 'MembershipPlans'; params: undefined }
  | { screen: 'LikesYou'; params: undefined }
  | { screen: 'CompatibilityInsight'; params: { matchId: string; partnerName: string } }
  | { screen: 'SocialFeed'; params: undefined }
  | null;

// ─── URL Parsing ─────────────────────────────────────────────────────

/**
 * Deep link URL'sini ayrıştırarak hedef ekran ve parametrelere dönüştürür.
 *
 * Desteklenen rotalar:
 * - luma://match/:matchId           -> MatchDetailScreen
 * - luma://chat/:conversationId     -> ChatScreen
 * - luma://profile/:userId          -> ProfilePreviewScreen
 * - luma://discovery                -> DiscoveryScreen (tab)
 * - luma://daily-picks              -> DailyPicksScreen
 * - luma://settings                 -> SettingsScreen
 * - luma://membership               -> MembershipPlansScreen
 * - luma://likes                    -> LikesYouScreen
 */
export function parseDeepLink(url: string): ParsedDeepLink {
  try {
    // luma://match/abc123 veya https://luma.dating/match/abc123
    let cleanUrl = url;

    // Scheme prefix temizle
    if (cleanUrl.startsWith(DEEP_LINK_PREFIX)) {
      cleanUrl = cleanUrl.replace(DEEP_LINK_PREFIX, '');
    } else if (cleanUrl.startsWith(`${DEEP_LINK_SCHEME}://`)) {
      cleanUrl = cleanUrl.replace(`${DEEP_LINK_SCHEME}://`, '');
    } else if (cleanUrl.startsWith('https://luma.dating/')) {
      cleanUrl = cleanUrl.replace('https://luma.dating/', '');
    } else if (cleanUrl.startsWith('https://www.luma.dating/')) {
      cleanUrl = cleanUrl.replace('https://www.luma.dating/', '');
    }

    // Query parametrelerini ayır
    const [path, queryString] = cleanUrl.split('?');
    const segments = path.split('/').filter(Boolean);
    const queryParams = parseQueryString(queryString);

    if (segments.length === 0) {
      return null;
    }

    const route = segments[0];
    const id = segments[1];

    switch (route) {
      case 'match':
        if (!id) return null;
        return { screen: 'MatchDetail', params: { matchId: id } };

      case 'chat':
        if (!id) return null;
        return {
          screen: 'Chat',
          params: {
            matchId: id,
            partnerName: (queryParams.name as string) || '',
            partnerPhotoUrl: (queryParams.photo as string) || '',
          },
        };

      case 'profile':
        if (!id) return null;
        return { screen: 'ProfilePreview', params: { userId: id } };

      case 'discovery':
        return { screen: 'Discovery', params: undefined };

      case 'daily-picks':
        return { screen: 'DailyPicks', params: undefined };

      case 'settings':
        return { screen: 'Settings', params: undefined };

      case 'membership':
      case 'membership-plans':
        return { screen: 'MembershipPlans', params: undefined };

      case 'likes':
        return { screen: 'LikesYou', params: undefined };

      case 'compatibility':
        if (!id) return null;
        return {
          screen: 'CompatibilityInsight',
          params: {
            matchId: id,
            partnerName: (queryParams.name as string) || '',
          },
        };

      default:
        if (__DEV__) {
          console.warn(`[DeepLink] Bilinmeyen rota: ${route}`);
        }
        return null;
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[DeepLink] URL ayrıştırma hatası:', error);
    }
    return null;
  }
}

// ─── Navigation ──────────────────────────────────────────────────────

/**
 * Ayrıştırılmış deep link bilgisine göre ilgili ekrana yönlendirir.
 * NavigationContainerRef kullanır — hook dışında da çağrılabilir.
 */
export function navigateToDeepLink(
  navigationRef: NavigationContainerRef<RootStackParamList>,
  url: string,
): void {
  const parsed = parseDeepLink(url);
  if (!parsed) {
    if (__DEV__) {
      console.warn(`[DeepLink] Yönlendirilemiyor, geçersiz URL: ${url}`);
    }
    return;
  }

  navigateToScreen(navigationRef, parsed);
}

/**
 * ParsedDeepLink bilgisine göre doğrudan ekrana yönlendirir.
 * Bildirim handler ve deep link handler tarafından ortaklaşa kullanılır.
 */
export function navigateToScreen(
  navigationRef: NavigationContainerRef<RootStackParamList>,
  parsed: ParsedDeepLink,
): void {
  if (!parsed) return;

  if (!navigationRef.isReady()) {
    if (__DEV__) {
      console.warn('[DeepLink] Navigator henüz hazır değil, yönlendirme bekleniyor...');
    }
    // Navigator hazır olunca tekrar dene
    const unsubscribe = navigationRef.addListener('state', () => {
      unsubscribe();
      navigateToScreen(navigationRef, parsed);
    });
    return;
  }

  switch (parsed.screen) {
    case 'MatchDetail':
      navigationRef.navigate('MainTabs', {
        screen: 'MatchesTab',
        params: {
          screen: 'MatchDetail',
          params: parsed.params,
        },
      });
      break;

    case 'Chat':
      navigationRef.navigate('MainTabs', {
        screen: 'MatchesTab',
        params: {
          screen: 'Chat',
          params: parsed.params,
        },
      });
      break;

    case 'ProfilePreview':
      navigationRef.navigate('MainTabs', {
        screen: 'DiscoveryTab',
        params: {
          screen: 'ProfilePreview',
          params: parsed.params,
        },
      });
      break;

    case 'Discovery':
      navigationRef.navigate('MainTabs', {
        screen: 'DiscoveryTab',
        params: {
          screen: 'Discovery',
          params: undefined,
        },
      });
      break;

    case 'DailyPicks':
      navigationRef.navigate('MainTabs', {
        screen: 'DiscoveryTab',
        params: {
          screen: 'DailyPicks',
          params: undefined,
        },
      });
      break;

    case 'Settings':
      navigationRef.navigate('MainTabs', {
        screen: 'ProfileTab',
        params: {
          screen: 'Settings',
          params: undefined,
        },
      });
      break;

    case 'MembershipPlans':
      navigationRef.navigate('MainTabs', {
        screen: 'ProfileTab',
        params: {
          screen: 'MembershipPlans',
          params: undefined,
        },
      });
      break;

    case 'LikesYou':
      navigationRef.navigate('MainTabs', {
        screen: 'DiscoveryTab',
        params: {
          screen: 'LikesYou',
          params: undefined,
        },
      });
      break;

    case 'CompatibilityInsight':
      navigationRef.navigate('MainTabs', {
        screen: 'MatchesTab',
        params: {
          screen: 'CompatibilityInsight',
          params: parsed.params,
        },
      });
      break;

    case 'SocialFeed':
      navigationRef.navigate('MainTabs', {
        screen: 'FeedTab',
        params: {
          screen: 'SocialFeed',
          params: undefined,
        },
      });
      break;
  }
}

// ─── React Navigation Linking Config ─────────────────────────────────

/**
 * React Navigation'ın <NavigationContainer linking> prop'u için yapılandırma.
 * Bu yapılandırma ile deep link'ler otomatik olarak doğru ekrana yönlendirilir.
 */
export const linkingConfig = {
  prefixes: [
    `${DEEP_LINK_SCHEME}://`,
    'https://luma.dating',
    'https://www.luma.dating',
  ],
  config: {
    screens: {
      MainTabs: {
        screens: {
          DiscoveryTab: {
            screens: {
              Discovery: 'discovery',
              ProfilePreview: 'profile/:userId',
              DailyPicks: 'daily-picks',
              LikesYou: 'likes',
            },
          },
          MatchesTab: {
            screens: {
              MatchesList: 'matches',
              MatchDetail: 'match/:matchId',
              Chat: 'chat/:matchId',
              CompatibilityInsight: 'compatibility/:matchId',
            },
          },
          ProfileTab: {
            screens: {
              Profile: 'profile',
              Settings: 'settings',
              MembershipPlans: 'membership-plans',
            },
          },
        },
      },
    },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Query string'i key-value çiftlerine dönüştürür.
 */
function parseQueryString(queryString: string | undefined): Record<string, string> {
  if (!queryString) return {};

  const params: Record<string, string> = {};
  const pairs = queryString.split('&');

  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value !== undefined) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }

  return params;
}

/**
 * Belirli bir ekran için deep link URL'si oluşturur.
 * Paylaşım ve bildirim payload'ları için kullanılır.
 */
export function buildDeepLink(
  screen: string,
  params?: Record<string, string>,
): string {
  let url = `${DEEP_LINK_PREFIX}${screen}`;

  if (params) {
    const paramSegment = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}/${value}`)
      .join('/');

    if (paramSegment) {
      url = `${url}/${paramSegment}`;
    }
  }

  return url;
}
