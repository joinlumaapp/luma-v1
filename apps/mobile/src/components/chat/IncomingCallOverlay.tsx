// Incoming call overlay — full-screen overlay shown when receiving a voice/video call.
// Features: pulsing avatar, caller info, accept/reject buttons, 30s auto-reject.

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MatchesStackParamList } from '../../navigation/types';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, shadows } from '../../theme/spacing';
import { useCallStore } from '../../stores/callStore';

/** Auto-reject timeout in milliseconds */
const AUTO_REJECT_MS = 30_000;

/** Vibration pattern: vibrate 500ms, pause 500ms, repeat */
const VIBRATION_PATTERN = [0, 500, 500];

export const IncomingCallOverlay: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MatchesStackParamList>>();

  const callState = useCallStore((s) => s.callState);
  const callType = useCallStore((s) => s.callType);
  const remoteUser = useCallStore((s) => s.remoteUser);
  const acceptCall = useCallStore((s) => s.acceptCall);
  const rejectCall = useCallStore((s) => s.rejectCall);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const autoRejectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVisible = callState === 'incoming' && remoteUser !== null;

  // Pulse animation for avatar
  useEffect(() => {
    if (!isVisible) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => {
      animation.stop();
      pulseAnim.setValue(1);
    };
  }, [isVisible, pulseAnim]);

  // Vibration pattern
  useEffect(() => {
    if (!isVisible) return;

    Vibration.vibrate(VIBRATION_PATTERN, true);

    return () => {
      Vibration.cancel();
    };
  }, [isVisible]);

  // Auto-reject after 30 seconds
  useEffect(() => {
    if (!isVisible) {
      if (autoRejectTimer.current) {
        clearTimeout(autoRejectTimer.current);
        autoRejectTimer.current = null;
      }
      return;
    }

    autoRejectTimer.current = setTimeout(() => {
      rejectCall();
    }, AUTO_REJECT_MS);

    return () => {
      if (autoRejectTimer.current) {
        clearTimeout(autoRejectTimer.current);
        autoRejectTimer.current = null;
      }
    };
  }, [isVisible, rejectCall]);

  const handleAccept = useCallback(() => {
    Vibration.cancel();
    acceptCall();
    // Navigate to call screen
    if (remoteUser) {
      navigation.navigate('Call', {
        matchId: remoteUser.id,
        partnerName: remoteUser.name,
        callType: callType ?? 'voice',
      });
    }
  }, [acceptCall, navigation, remoteUser, callType]);

  const handleReject = useCallback(() => {
    Vibration.cancel();
    rejectCall();
  }, [rejectCall]);

  if (!isVisible || !remoteUser) return null;

  const callTypeLabel = callType === 'video' ? 'Goruntulu Arama' : 'Sesli Arama';

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        {/* Call type label */}
        <Text style={styles.callTypeLabel}>{callTypeLabel}</Text>

        {/* Pulsing avatar */}
        <View style={styles.avatarArea}>
          <Animated.View style={[styles.avatarOuter, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{remoteUser.name.charAt(0)}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Caller name */}
        <Text style={styles.callerName}>{remoteUser.name}</Text>
        <Text style={styles.callerSubtext}>seni ariyor</Text>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          {/* Reject */}
          <TouchableOpacity
            onPress={handleReject}
            activeOpacity={0.7}
            accessibilityLabel="Aramayi reddet"
            accessibilityRole="button"
            style={styles.actionWrapper}
          >
            <View style={[styles.actionButton, styles.rejectButton]}>
              <Text style={styles.actionIcon}>{'\uD83D\uDCF5'}</Text>
            </View>
            <Text style={styles.actionLabel}>Reddet</Text>
          </TouchableOpacity>

          {/* Accept */}
          <TouchableOpacity
            onPress={handleAccept}
            activeOpacity={0.7}
            accessibilityLabel="Aramayi kabul et"
            accessibilityRole="button"
            style={styles.actionWrapper}
          >
            <View style={[styles.actionButton, styles.acceptButton]}>
              <Text style={styles.actionIcon}>{'\uD83D\uDCDE'}</Text>
            </View>
            <Text style={styles.actionLabel}>Kabul Et</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 20, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  callTypeLabel: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    marginBottom: spacing.xxl,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  avatarArea: {
    marginBottom: spacing.xl,
  },
  avatarOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: palette.purple[500] + '25',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.gold[400] + '40',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: palette.purple[500] + '50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: palette.purple[400],
  },
  avatarText: {
    fontSize: 48,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: palette.white,
  },
  callerName: {
    ...typography.h3,
    color: palette.white,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  callerSubtext: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: spacing.xxl * 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl * 1.5,
  },
  actionWrapper: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  rejectButton: {
    backgroundColor: palette.error,
  },
  acceptButton: {
    backgroundColor: palette.success,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
});
