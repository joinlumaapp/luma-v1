// Animated offline indicator — slides down from top when device loses network

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStore } from '../../stores/networkStore';
import { palette } from '../../theme/colors';

export const OfflineBanner: React.FC = () => {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isConnected ? -80 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [isConnected, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 4,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.content}>
        <View style={styles.dot} />
        <Text style={styles.text}>
          {'Çevrimdışı \u2014 İnternet bağlantısı yok'}
        </Text>
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
    backgroundColor: palette.error,
    paddingBottom: 10,
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.white,
    marginRight: 8,
    opacity: 0.7,
  },
  text: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
