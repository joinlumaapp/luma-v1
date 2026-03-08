// Subtle, premium "like sent" feedback toast
// Appears briefly after swiping right (non-match) without interrupting flow

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LikeSentToastProps {
  visible: boolean;
  onDismiss: () => void;
}

const DISPLAY_DURATION = 1800;
const FADE_IN = 250;
const FADE_OUT = 300;

export const LikeSentToast: React.FC<LikeSentToastProps> = ({
  visible,
  onDismiss,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 20,
        duration: FADE_OUT,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [opacity, translateY, onDismiss]);

  useEffect(() => {
    if (!visible) return;

    // Reset
    opacity.setValue(0);
    translateY.setValue(20);
    scale.setValue(0.95);

    // Entrance
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 100,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    timerRef.current = setTimeout(dismiss, DISPLAY_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, opacity, translateY, scale, dismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.toast}>
        <View style={styles.heartDot} />
        <View style={styles.textWrap}>
          <Text style={styles.title}>Beğeni gönderildi</Text>
          <Text style={styles.subtitle}>Belki birazdan eşleşirsiniz</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: SCREEN_WIDTH * 0.75,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  heartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
    opacity: 0.8,
  },
  textWrap: {
    flexShrink: 1,
  },
  title: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    marginTop: 1,
  },
});
