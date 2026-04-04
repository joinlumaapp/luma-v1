// Uygulama içi bildirim banner'ı — ön planda gelen bildirimler için
// Yukarıdan aşağı kayarak görünür, 4 saniye sonra otomatik kapanır
// Dokunarak ilgili ekrana yönlendirilir, yukarı kaydırarak kapatılır

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import {
  registerForegroundListener,
  mapNotificationToScreen,
} from '../../services/notificationHandlerService';
import type { InAppNotificationData } from '../../services/notificationHandlerService';
import type { ParsedDeepLink } from '../../services/deepLinkService';

// ─── Bildirim türüne göre ikon eşlemesi ──────────────────────────────

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  NEW_MATCH: 'heart',
  NEW_MESSAGE: 'chatbubble',
  MESSAGE: 'chatbubble',
  PROFILE_LIKE: 'thumbs-up',
  NEW_LIKE: 'thumbs-up',
  DAILY_PICKS: 'sparkles',
  BOOST_ACTIVE: 'rocket',
  HARMONY_INVITE: 'musical-notes',
  HARMONY_REMINDER: 'musical-notes',
  COMPATIBILITY_UPDATE: 'analytics',
  SUBSCRIPTION_EXPIRING: 'card',
  SYSTEM: 'notifications',
  RE_ENGAGEMENT: 'notifications',
  FOMO: 'flame',
  MATCH_URGENCY: 'heart',
  WEEKLY_CONTENT: 'calendar',
  DATE_PLAN_REMINDER: 'calendar',
  MISSED_LIKES: 'eye',
  NEW_FOLLOWER: 'person-add',
  POST_LIKE: 'heart',
  POST_COMMENT: 'chatbubble-ellipses',
  COMMENT_REPLY: 'return-down-forward',
  RELATIONSHIP_REQUEST: 'heart-circle',
};

/** Bildirim türüne göre ikon adı döndürür */
function getNotificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  return NOTIFICATION_ICONS[type.toUpperCase()] || 'notifications-outline';
}

// ─── Otomatik kapanma süresi ─────────────────────────────────────────

const AUTO_DISMISS_MS = 4000;
const ANIMATION_DURATION = 300;

// ─── Component ───────────────────────────────────────────────────────

export const InAppNotificationBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [currentNotification, setCurrentNotification] = useState<InAppNotificationData | null>(null);
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisible = useRef(false);

  // Kapatma animasyonu
  const dismissBanner = useCallback(() => {
    if (!isVisible.current) return;
    isVisible.current = false;

    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentNotification(null);
    });
  }, [translateY, opacity]);

  // Gösterme animasyonu
  const showBanner = useCallback(
    (notification: InAppNotificationData) => {
      // Mevcut banner varsa önce kapat
      if (isVisible.current) {
        dismissBanner();
        // Kısa gecikme ile yenisini göster
        setTimeout(() => {
          setCurrentNotification(notification);
          isVisible.current = true;

          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 80,
              friction: 12,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: ANIMATION_DURATION,
              useNativeDriver: true,
            }),
          ]).start();

          // Otomatik kapanma
          dismissTimer.current = setTimeout(dismissBanner, AUTO_DISMISS_MS);
        }, ANIMATION_DURATION + 50);
      } else {
        setCurrentNotification(notification);
        isVisible.current = true;

        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
        ]).start();

        // Otomatik kapanma
        dismissTimer.current = setTimeout(dismissBanner, AUTO_DISMISS_MS);
      }
    },
    [translateY, opacity, dismissBanner],
  );

  // Yukarı kaydırma ile kapatma — PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Sadece yukarı kaydırma
        return gestureState.dy < -10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -40) {
          // Yeterince yukarı kaydırıldı, kapat
          dismissBanner();
        } else {
          // Geri döndür
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    }),
  ).current;

  // Ön plan bildirim dinleyicisini kaydet
  useEffect(() => {
    const cleanup = registerForegroundListener((notification) => {
      showBanner(notification);
    });

    return () => {
      cleanup();
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [showBanner]);

  // Bildirime dokunulduğunda
  const handlePress = useCallback(() => {
    if (!currentNotification) return;

    dismissBanner();

    const parsed: ParsedDeepLink = mapNotificationToScreen(currentNotification.data);
    if (parsed) {
      // NavigationProp doğrudan NavigationContainerRef gibi kullanılamaz,
      // bu yüzden navigation.navigate ile yönlendiriyoruz
      const nav = navigation as unknown as { navigate: (screen: string, params: Record<string, unknown>) => void };

      switch (parsed.screen) {
        case 'MatchDetail':
          nav.navigate('MainTabs', {
            screen: 'MatchesTab',
            params: { screen: 'MatchDetail', params: parsed.params },
          });
          break;
        case 'Chat':
          nav.navigate('MainTabs', {
            screen: 'MatchesTab',
            params: { screen: 'Chat', params: parsed.params },
          });
          break;
        case 'ProfilePreview':
          nav.navigate('MainTabs', {
            screen: 'DiscoveryTab',
            params: { screen: 'ProfilePreview', params: parsed.params },
          });
          break;
        case 'Discovery':
          nav.navigate('MainTabs', {
            screen: 'DiscoveryTab',
            params: { screen: 'Discovery', params: undefined },
          });
          break;
        case 'DailyPicks':
          nav.navigate('MainTabs', {
            screen: 'DiscoveryTab',
            params: { screen: 'DailyPicks', params: undefined },
          });
          break;
        case 'Settings':
          nav.navigate('MainTabs', {
            screen: 'ProfileTab',
            params: { screen: 'Settings', params: undefined },
          });
          break;
        case 'MembershipPlans':
          nav.navigate('MainTabs', {
            screen: 'ProfileTab',
            params: { screen: 'MembershipPlans', params: undefined },
          });
          break;
        case 'LikesYou':
          nav.navigate('MainTabs', {
            screen: 'DiscoveryTab',
            params: { screen: 'LikesYou', params: undefined },
          });
          break;
        case 'CompatibilityInsight':
          nav.navigate('MainTabs', {
            screen: 'MatchesTab',
            params: { screen: 'CompatibilityInsight', params: parsed.params },
          });
          break;
      }
    }
  }, [currentNotification, navigation, dismissBanner]);

  if (!currentNotification) return null;

  const iconName = getNotificationIcon(currentNotification.type);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
        <TouchableOpacity
          style={styles.content}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          {/* Bildirim ikonu */}
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={20} color="#FFFFFF" />
          </View>

          {/* Bildirim metni */}
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {currentNotification.title}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {currentNotification.body}
            </Text>
          </View>

          {/* Kapatma ipucu */}
          <View style={styles.dismissHint}>
            <View style={styles.dismissLine} />
          </View>
        </TouchableOpacity>
      </BlurView>
    </Animated.View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 9999,
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 20, 34, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  dismissHint: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
  },
  dismissLine: {
    width: 3,
    height: 20,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
