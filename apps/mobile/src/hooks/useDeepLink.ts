// Deep link yonetimi — uygulama ici yonlendirme
// Genisletilmis rotalar: match, chat, profile, discovery, daily-picks, settings, membership

import { useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { parseDeepLink } from '../services/deepLinkService';
import type { ParsedDeepLink } from '../services/deepLinkService';

interface UseDeepLinkReturn {
  /** Deep link URL'sini elle isle */
  handleDeepLink: (url: string) => void;
}

/**
 * Deep link dinleyici hook'u.
 * Uygulama acikken ve kapaliyken gelen deep link'leri yakalar ve ilgili ekrana yonlendirir.
 *
 * Desteklenen rotalar:
 * - luma://match/:matchId           -> MatchDetailScreen
 * - luma://chat/:conversationId     -> ChatScreen
 * - luma://profile/:userId          -> ProfilePreviewScreen
 * - luma://discovery                -> DiscoveryScreen
 * - luma://daily-picks              -> DailyPicksScreen
 * - luma://settings                 -> SettingsScreen
 * - luma://membership               -> MembershipPlansScreen
 * - luma://likes                    -> LikesYouScreen
 * - luma://compatibility/:matchId   -> CompatibilityInsightScreen
 */
export const useDeepLink = (): UseDeepLinkReturn => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const navigateToParsed = useCallback(
    (parsed: ParsedDeepLink) => {
      if (!parsed) return;

      switch (parsed.screen) {
        case 'MatchDetail':
          navigation.navigate('MainTabs', {
            screen: 'MatchesTab',
            params: {
              screen: 'MatchDetail',
              params: parsed.params,
            },
          });
          break;

        case 'Chat':
          navigation.navigate('MainTabs', {
            screen: 'MatchesTab',
            params: {
              screen: 'Chat',
              params: parsed.params,
            },
          });
          break;

        case 'ProfilePreview':
          navigation.navigate('MainTabs', {
            screen: 'DiscoveryTab',
            params: {
              screen: 'ProfilePreview',
              params: parsed.params,
            },
          });
          break;

        case 'Discovery':
          navigation.navigate('MainTabs', {
            screen: 'DiscoveryTab',
            params: {
              screen: 'Discovery',
              params: undefined,
            },
          });
          break;

        case 'DailyPicks':
          navigation.navigate('MainTabs', {
            screen: 'DiscoveryTab',
            params: {
              screen: 'DailyPicks',
              params: undefined,
            },
          });
          break;

        case 'Settings':
          navigation.navigate('MainTabs', {
            screen: 'ProfileTab',
            params: {
              screen: 'Settings',
              params: undefined,
            },
          });
          break;

        case 'MembershipPlans':
          navigation.navigate('MainTabs', {
            screen: 'ProfileTab',
            params: {
              screen: 'MembershipPlans',
              params: undefined,
            },
          });
          break;

        case 'LikesYou':
          navigation.navigate('MainTabs', {
            screen: 'DiscoveryTab',
            params: {
              screen: 'LikesYou',
              params: undefined,
            },
          });
          break;

        case 'CompatibilityInsight':
          navigation.navigate('MainTabs', {
            screen: 'MatchesTab',
            params: {
              screen: 'CompatibilityInsight',
              params: parsed.params,
            },
          });
          break;
      }
    },
    [navigation],
  );

  const handleDeepLink = useCallback(
    (url: string) => {
      const parsed = parseDeepLink(url);
      if (parsed) {
        navigateToParsed(parsed);
      } else if (__DEV__) {
        console.warn(`[DeepLink] Bilinmeyen veya gecersiz URL: ${url}`);
      }
    },
    [navigateToParsed],
  );

  useEffect(() => {
    // Uygulama kapaliyken acilan deep link (cold start)
    const getInitialLink = async (): Promise<void> => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    getInitialLink();

    // Uygulama acikken gelen deep link (warm start)
    const subscription = Linking.addEventListener('url', (event: { url: string }) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  return { handleDeepLink };
};
