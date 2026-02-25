// Deep link yönetimi — uygulama içi yönlendirme
// luma://profile/:userId, luma://match/:matchId, luma://harmony/:sessionId

import { useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { DEEP_LINK_SCHEME } from '../constants/appInfo';

/** Desteklenen deep link rotaları */
type DeepLinkRoute =
  | { type: 'profile'; userId: string }
  | { type: 'match'; matchId: string }
  | { type: 'harmony'; sessionId: string }
  | { type: 'unknown' };

/**
 * Deep link URL'sini ayrıştırarak rota bilgisine dönüştürür.
 */
const parseDeepLink = (url: string): DeepLinkRoute => {
  try {
    // luma://profile/abc123 veya https://luma.dating/profile/abc123
    const cleanUrl = url.replace(`${DEEP_LINK_SCHEME}://`, '');
    const segments = cleanUrl.split('/').filter(Boolean);

    if (segments.length < 2) {
      return { type: 'unknown' };
    }

    const [route, id] = segments;

    switch (route) {
      case 'profile':
        return { type: 'profile', userId: id as string };
      case 'match':
        return { type: 'match', matchId: id as string };
      case 'harmony':
        return { type: 'harmony', sessionId: id as string };
      default:
        return { type: 'unknown' };
    }
  } catch {
    return { type: 'unknown' };
  }
};

interface UseDeepLinkReturn {
  /** Deep link URL'sini elle işle */
  handleDeepLink: (url: string) => void;
}

/**
 * Deep link dinleyici hook'u.
 * Uygulama açıkken ve kapalıyken gelen deep link'leri yakalar ve ilgili ekrana yönlendirir.
 */
export const useDeepLink = (): UseDeepLinkReturn => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleDeepLink = useCallback(
    (url: string) => {
      const route = parseDeepLink(url);

      switch (route.type) {
        case 'profile':
          // Profil önizleme ekranına yönlendir
          navigation.navigate('MainTabs', {
            screen: 'DiscoveryTab',
            params: {
              screen: 'ProfilePreview',
              params: { userId: route.userId },
            },
          });
          break;

        case 'match':
          // Eşleşme detay ekranına yönlendir
          navigation.navigate('MainTabs', {
            screen: 'MatchesTab',
            params: {
              screen: 'MatchDetail',
              params: { matchId: route.matchId },
            },
          });
          break;

        case 'harmony':
          // Harmony Room ekranına yönlendir
          navigation.navigate('MainTabs', {
            screen: 'HarmonyTab',
            params: {
              screen: 'HarmonyRoom',
              params: { sessionId: route.sessionId, matchId: '' },
            },
          });
          break;

        case 'unknown':
          // Bilinmeyen rota — sessizce yoksay
          break;
      }
    },
    [navigation],
  );

  useEffect(() => {
    // Uygulama kapalıyken açılan deep link (cold start)
    const getInitialLink = async (): Promise<void> => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    getInitialLink();

    // Uygulama açıkken gelen deep link (warm start)
    const subscription = Linking.addEventListener('url', (event: { url: string }) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  return { handleDeepLink };
};
