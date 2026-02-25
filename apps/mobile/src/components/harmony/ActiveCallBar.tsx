// ActiveCallBar — compact bar shown at the top of HarmonyRoom during an active call.
// Displays call duration (mm:ss), mute/speaker/end call/video toggle buttons.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import type { CallType } from '../../services/socketService';
import type { CallState } from '../../services/webrtcService';

interface ActiveCallBarProps {
  /** Current call state */
  callState: CallState;
  /** Type of call: voice or video */
  callType: CallType;
  /** Whether the microphone is muted */
  isMuted: boolean;
  /** Whether the speaker is on */
  isSpeakerOn: boolean;
  /** Whether the local video is enabled (video calls only) */
  isVideoEnabled: boolean;
  /** Called when user toggles mute */
  onToggleMute: () => void;
  /** Called when user toggles speaker */
  onToggleSpeaker: () => void;
  /** Called when user toggles video (video calls only) */
  onToggleVideo: () => void;
  /** Called when user ends the call */
  onEndCall: () => void;
}

/**
 * Format seconds into mm:ss display.
 */
const formatCallDuration = (totalSeconds: number): string => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const ActiveCallBar: React.FC<ActiveCallBarProps> = ({
  callState,
  callType,
  isMuted,
  isSpeakerOn,
  isVideoEnabled,
  onToggleMute,
  onToggleSpeaker,
  onToggleVideo,
  onEndCall,
}) => {
  // ─── Call Duration Timer ──────────────────────────────────────

  const [durationSeconds, setDurationSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (callState === 'connected') {
      // Start the timer when connected
      setDurationSeconds(0);
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      // Stop the timer for any other state
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callState]);

  // ─── Connecting Animation ────────────────────────────────────

  const connectingDotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (callState === 'connecting' || callState === 'outgoing') {
      const dotAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(connectingDotAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(connectingDotAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      dotAnimation.start();
      return () => dotAnimation.stop();
    }
    connectingDotAnim.setValue(0);
    return undefined;
  }, [callState, connectingDotAnim]);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleEndCall = useCallback(() => {
    onEndCall();
  }, [onEndCall]);

  // ─── Status Text ──────────────────────────────────────────────

  const getStatusText = (): string => {
    switch (callState) {
      case 'outgoing':
        return 'Araniyor...';
      case 'connecting':
        return 'Baglaniyor...';
      case 'connected':
        return formatCallDuration(durationSeconds);
      case 'ended':
        return 'Arama sona erdi';
      default:
        return '';
    }
  };

  const callTypeLabel = callType === 'video' ? 'Goruntulu' : 'Sesli';

  // Don't render for idle state
  if (callState === 'idle') return null;

  return (
    <View style={styles.container}>
      {/* Left: Call status info */}
      <View style={styles.statusSection}>
        {/* Connecting indicator dot */}
        {(callState === 'connecting' || callState === 'outgoing') && (
          <Animated.View
            style={[
              styles.connectingDot,
              { opacity: connectingDotAnim },
            ]}
          />
        )}

        {/* Connected indicator dot */}
        {callState === 'connected' && (
          <View style={styles.connectedDot} />
        )}

        <View>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          <Text style={styles.callTypeLabel}>{callTypeLabel} Arama</Text>
        </View>
      </View>

      {/* Right: Action buttons */}
      <View style={styles.actionsSection}>
        {/* Mute toggle */}
        <TouchableOpacity
          style={[styles.actionButton, isMuted && styles.actionButtonActive]}
          onPress={onToggleMute}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionIcon, isMuted && styles.actionIconActive]}>
            {isMuted ? 'M' : 'm'}
          </Text>
        </TouchableOpacity>

        {/* Speaker toggle */}
        <TouchableOpacity
          style={[styles.actionButton, isSpeakerOn && styles.actionButtonActive]}
          onPress={onToggleSpeaker}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionIcon, isSpeakerOn && styles.actionIconActive]}>
            {isSpeakerOn ? 'S' : 's'}
          </Text>
        </TouchableOpacity>

        {/* Video toggle (video calls only) */}
        {callType === 'video' && (
          <TouchableOpacity
            style={[styles.actionButton, !isVideoEnabled && styles.actionButtonActive]}
            onPress={onToggleVideo}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionIcon, !isVideoEnabled && styles.actionIconActive]}>
              {isVideoEnabled ? 'V' : 'v'}
            </Text>
          </TouchableOpacity>
        )}

        {/* End call */}
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={handleEndCall}
          activeOpacity={0.8}
        >
          <Text style={styles.endCallIcon}>X</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary + 'E6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    ...shadows.medium,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  connectingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  callTypeLabel: {
    ...typography.captionSmall,
    color: colors.text,
    opacity: 0.8,
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionIcon: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '700',
  },
  actionIconActive: {
    color: colors.warning,
  },
  endCallButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallIcon: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '700',
  },
});
