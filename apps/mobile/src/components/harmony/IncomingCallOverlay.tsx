// IncomingCallOverlay — full-screen overlay shown when receiving an incoming call.
// Displays caller info, animated pulsing icon, accept/reject buttons,
// call type indicator (voice/video), and auto-dismisses after 30 seconds.

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import type { CallType } from '../../services/socketService';

/** Auto-dismiss timeout for unanswered incoming calls */
const AUTO_DISMISS_MS = 30_000;

interface IncomingCallOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** ID of the caller (display name should be resolved by parent) */
  callerName: string;
  /** Type of call: voice or video */
  callType: CallType;
  /** Called when user accepts the call */
  onAccept: () => void;
  /** Called when user rejects the call */
  onReject: () => void;
}

export const IncomingCallOverlay: React.FC<IncomingCallOverlayProps> = ({
  visible,
  callerName,
  callType,
  onAccept,
  onReject,
}) => {
  // ─── Animations ───────────────────────────────────────────────

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const overlayFadeAnim = useRef(new Animated.Value(0)).current;

  // Pulsing phone icon animation
  useEffect(() => {
    if (!visible) return;

    // Fade in overlay
    Animated.timing(overlayFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Pulsing icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    // Ring glow animation
    const ring = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    ring.start();

    return () => {
      pulse.stop();
      ring.stop();
      overlayFadeAnim.setValue(0);
      pulseAnim.setValue(1);
      ringAnim.setValue(0);
    };
  }, [visible, pulseAnim, ringAnim, overlayFadeAnim]);

  // ─── Auto-dismiss ─────────────────────────────────────────────

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      onReject();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [visible, onReject]);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleAccept = useCallback(() => {
    Animated.timing(overlayFadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onAccept();
    });
  }, [onAccept, overlayFadeAnim]);

  const handleReject = useCallback(() => {
    Animated.timing(overlayFadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onReject();
    });
  }, [onReject, overlayFadeAnim]);

  // ─── Render ───────────────────────────────────────────────────

  const callTypeIcon = callType === 'video' ? '[]' : '()';
  const callTypeLabel = callType === 'video' ? 'Goruntulu Arama' : 'Sesli Arama';

  // Ring glow opacity
  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: overlayFadeAnim }]}>
        {/* Call type badge */}
        <View style={styles.callTypeBadge}>
          <Text style={styles.callTypeBadgeIcon}>{callTypeIcon}</Text>
          <Text style={styles.callTypeBadgeText}>{callTypeLabel}</Text>
        </View>

        {/* Caller info */}
        <View style={styles.callerSection}>
          {/* Pulsing ring behind avatar */}
          <View style={styles.avatarContainer}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.avatarCircle,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Text style={styles.avatarText}>
                {callerName.charAt(0).toUpperCase()}
              </Text>
            </Animated.View>
          </View>

          <Text style={styles.callerName}>{callerName}</Text>
          <Text style={styles.callingLabel}>
            {callType === 'video'
              ? 'Goruntulu arama yapiyor...'
              : 'Sesli arama yapiyor...'}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.buttonsRow}>
          {/* Reject */}
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={handleReject}
            activeOpacity={0.8}
          >
            <Text style={styles.rejectIcon}>X</Text>
            <Text style={styles.rejectText}>Reddet</Text>
          </TouchableOpacity>

          {/* Accept */}
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAccept}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptIcon}>{callTypeIcon}</Text>
            <Text style={styles.acceptText}>Kabul Et</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 35, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight + '80',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    position: 'absolute',
    top: 80,
  },
  callTypeBadgeIcon: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  callTypeBadgeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  callerSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
  },
  avatarText: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  callerName: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  callingLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxl,
    position: 'absolute',
    bottom: 120,
  },
  rejectButton: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  rejectIcon: {
    ...typography.h3,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 64,
    color: colors.text,
    fontWeight: '700',
    overflow: 'hidden',
  },
  rejectText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
  acceptButton: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  acceptIcon: {
    ...typography.h3,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 64,
    color: colors.text,
    fontWeight: '700',
    overflow: 'hidden',
  },
  acceptText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '600',
  },
});
