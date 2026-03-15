// Animated offline indicator — slides down from top when device loses network
// Shows amber warning when offline, green confirmation when reconnected

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNetworkStore } from '../../stores/networkStore';
import { palette } from '../../theme/colors';

type BannerState = 'hidden' | 'offline' | 'reconnected';

const RECONNECTED_DISPLAY_MS = 2500;

export const OfflineBanner: React.FC = () => {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const [bannerState, setBannerState] = useState<BannerState>('hidden');
  const wasOfflineRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isConnected) {
      // Going offline
      wasOfflineRef.current = true;
      setBannerState('offline');

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else if (wasOfflineRef.current) {
      // Coming back online after being offline
      setBannerState('reconnected');

      // Show reconnected message briefly, then slide up
      hideTimerRef.current = setTimeout(() => {
        Animated.spring(slideAnim, {
          toValue: -100,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }).start(() => {
          setBannerState('hidden');
          wasOfflineRef.current = false;
        });
        hideTimerRef.current = null;
      }, RECONNECTED_DISPLAY_MS);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isConnected, slideAnim]);

  if (bannerState === 'hidden') {
    return null;
  }

  const isReconnected = bannerState === 'reconnected';
  const backgroundColor = isReconnected ? palette.success : palette.warning;
  const iconName = isReconnected ? 'cloud-done-outline' : 'cloud-offline-outline';
  const message = isReconnected
    ? 'Bağlantı yeniden kuruldu'
    : 'Çevrimdışısınız \u2014 İnternet bağlantınızı kontrol edin';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          paddingTop: insets.top + 4,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <View style={styles.content}>
        <Ionicons
          name={iconName}
          size={16}
          color={palette.white}
          style={styles.icon}
        />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 10,
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: palette.white,
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});
