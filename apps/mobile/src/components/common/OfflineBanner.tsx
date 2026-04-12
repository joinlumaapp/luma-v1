// Animated offline indicator — slides down from top when device loses network
// Shows amber warning when offline, brief "reconnecting" state, green confirmation when reconnected

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNetworkStore } from '../../stores/networkStore';
import { offlineQueue } from '../../services/offlineQueue';
import { palette } from '../../theme/colors';

type BannerState = 'hidden' | 'offline' | 'reconnecting' | 'reconnected';

/** How long "Bağlantı kuruluyor..." is shown before switching to "reconnected" */
const RECONNECTING_DISPLAY_MS = 1200;
/** How long "Bağlantı sağlandı" is shown before auto-hiding */
const RECONNECTED_DISPLAY_MS = 2000;

export const OfflineBanner: React.FC = () => {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const [bannerState, setBannerState] = useState<BannerState>('hidden');
  const [pendingCount, setPendingCount] = useState(0);
  const wasOfflineRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track pending offline actions for display
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(() => {
        setPendingCount(offlineQueue.getQueueSize());
      }, 1000);
      // Set initial value immediately
      setPendingCount(offlineQueue.getQueueSize());
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected) {
      // Going offline
      wasOfflineRef.current = true;
      setBannerState('offline');

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else if (wasOfflineRef.current) {
      // Coming back online — show "reconnecting" first
      setBannerState('reconnecting');

      reconnectTimerRef.current = setTimeout(() => {
        setBannerState('reconnected');
        reconnectTimerRef.current = null;

        // Then auto-hide after showing "reconnected"
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
      }, RECONNECTING_DISPLAY_MS);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [isConnected, slideAnim]);

  if (bannerState === 'hidden') {
    return null;
  }

  const isReconnected = bannerState === 'reconnected';
  const isReconnecting = bannerState === 'reconnecting';

  let backgroundColor: string;
  let iconName: keyof typeof Ionicons.glyphMap;
  let message: string;
  let showSpinner = false;

  if (isReconnected) {
    backgroundColor = palette.success;
    iconName = 'cloud-done-outline';
    message = 'Bağlantı sağlandı';
  } else if (isReconnecting) {
    backgroundColor = palette.info;
    iconName = 'sync-outline';
    message = 'Bağlantı kuruluyor...';
    showSpinner = true;
  } else {
    backgroundColor = palette.warning;
    iconName = 'cloud-offline-outline';
    message =
      pendingCount > 0
        ? `Bağlantı yok \u2014 Çevrimdışı mod (${pendingCount} bekleyen)`
        : 'Bağlantı yok \u2014 Çevrimdışı mod';
  }

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
        {showSpinner ? (
          <ActivityIndicator
            size="small"
            color={palette.white}
            style={styles.icon}
          />
        ) : (
          <Ionicons
            name={iconName}
            size={16}
            color={palette.white}
            style={styles.icon}
          />
        )}
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
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
});
