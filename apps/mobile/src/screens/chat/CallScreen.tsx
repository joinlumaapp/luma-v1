// Call screen — full voice/video call UI
// Shows ringing state, connected call with timer, and video streams.
// Premium feature: Gold+ only. Free users see upgrade prompt.

import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchesStackParamList } from '../../navigation/types';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { useCallStore } from '../../stores/callStore';
import { useAuthStore } from '../../stores/authStore';
import { useScreenTracking } from '../../hooks/useAnalytics';

type CallNavigationProp = NativeStackNavigationProp<MatchesStackParamList, 'Call'>;
type CallRouteProp = RouteProp<MatchesStackParamList, 'Call'>;

/** Format seconds into MM:SS string */
const formatDuration = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/** Signal quality bar component */
const QualityIndicator: React.FC<{ level: number }> = ({ level }) => (
  <View style={qualityStyles.container}>
    {[1, 2, 3].map((bar) => (
      <View
        key={bar}
        style={[
          qualityStyles.bar,
          { height: 6 + bar * 4 },
          bar <= level ? qualityStyles.barActive : qualityStyles.barInactive,
        ]}
      />
    ))}
  </View>
);

const qualityStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
  barActive: {
    backgroundColor: palette.success,
  },
  barInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

/** Round control button used in the call UI */
const ControlButton: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'active' | 'danger';
  size?: 'normal' | 'large';
}> = ({ icon, label, onPress, variant = 'default', size = 'normal' }) => {
  const buttonSize = size === 'large' ? 72 : 56;
  const iconSize = size === 'large' ? 28 : 22;

  const bgColor =
    variant === 'danger'
      ? palette.error
      : variant === 'active'
        ? palette.white
        : 'rgba(255, 255, 255, 0.15)';

  const textColor =
    variant === 'active' ? '#1A1A1A' : palette.white;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={styles.controlWrapper}
    >
      <View
        style={[
          styles.controlButton,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: bgColor,
          },
        ]}
      >
        <Text style={[styles.controlIcon, { fontSize: iconSize, color: textColor }]}>
          {icon}
        </Text>
      </View>
      <Text style={styles.controlLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

export const CallScreen: React.FC = () => {
  useScreenTracking('Call');
  const navigation = useNavigation<CallNavigationProp>();
  const route = useRoute<CallRouteProp>();
  const insets = useSafeAreaInsets();

  const { partnerName, callType: routeCallType } = route.params;

  const callState = useCallStore((s) => s.callState);
  const callType = useCallStore((s) => s.callType) ?? routeCallType;
  const remoteUser = useCallStore((s) => s.remoteUser);
  const isMuted = useCallStore((s) => s.isMuted);
  const isSpeaker = useCallStore((s) => s.isSpeaker);
  const isCameraOff = useCallStore((s) => s.isCameraOff);
  const callDuration = useCallStore((s) => s.callDuration);
  const callQuality = useCallStore((s) => s.callQuality);
  const endCall = useCallStore((s) => s.endCall);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleSpeaker = useCallStore((s) => s.toggleSpeaker);
  const toggleCamera = useCallStore((s) => s.toggleCamera);
  const flipCamera = useCallStore((s) => s.flipCamera);
  const setMinimized = useCallStore((s) => s.setMinimized);

  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'free');
  const isPremium = packageTier !== 'free';

  const displayName = remoteUser?.name ?? partnerName;

  // Quality level mapping
  const qualityLevel = useMemo(() => {
    switch (callQuality) {
      case 'excellent': return 3;
      case 'good': return 2;
      case 'poor': return 1;
      default: return 3;
    }
  }, [callQuality]);

  // Navigate back when call ends
  useEffect(() => {
    if (callState === 'idle') {
      // Small delay for "call ended" feedback
      const timer = setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [callState, navigation]);

  const handleEndCall = useCallback(() => {
    endCall();
  }, [endCall]);

  const handleMinimize = useCallback(() => {
    setMinimized(true);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [setMinimized, navigation]);

  const handleUpgrade = useCallback(() => {
    navigation.getParent()?.navigate('ProfileTab', { screen: 'Packages' });
  }, [navigation]);

  // ── Premium gate ───────────────────────────────────────────
  if (!isPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.premiumGate}>
          <View style={styles.premiumIcon}>
            <Text style={styles.premiumIconText}>
              {callType === 'video' ? '\uD83C\uDFA5' : '\uD83D\uDCDE'}
            </Text>
          </View>
          <Text style={styles.premiumTitle}>
            {callType === 'video' ? 'Goruntulu Arama' : 'Sesli Arama'}
          </Text>
          <Text style={styles.premiumSubtitle}>
            Arama ozelligi Gold ve ustu paketlere ozeldir.{'\n'}
            Paketini yukselt ve hemen aramaya basla!
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
            activeOpacity={0.85}
            accessibilityLabel="Paketi yukselt"
            accessibilityRole="button"
          >
            <Text style={styles.upgradeButtonText}>Paketi Yukselt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityLabel="Geri don"
            accessibilityRole="button"
            style={styles.premiumBackButton}
          >
            <Text style={styles.premiumBackText}>Geri Don</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Status label ───────────────────────────────────────────
  const statusLabel = (() => {
    switch (callState) {
      case 'outgoing': return 'Araniyor...';
      case 'incoming': return 'Gelen Arama';
      case 'connecting': return 'Baglaniyor...';
      case 'connected': return formatDuration(callDuration);
      case 'ended': return 'Arama Sonlandi';
      default: return '';
    }
  })();

  const callTypeLabel = callType === 'video' ? 'Goruntulu Arama' : 'Sesli Arama';
  const isConnected = callState === 'connected';
  const isVideo = callType === 'video';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />

      {/* Top bar: minimize + quality */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleMinimize}
          activeOpacity={0.7}
          accessibilityLabel="Aramada kal ve geri don"
          accessibilityRole="button"
          style={styles.minimizeButton}
        >
          <Text style={styles.minimizeIcon}>{'\u2039'}</Text>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.callTypeLabel}>{callTypeLabel}</Text>
        </View>

        {isConnected && <QualityIndicator level={qualityLevel} />}
      </View>

      {/* Center: avatar + name + status */}
      <View style={styles.centerArea}>
        {/* Video placeholder — actual RTCView would go here when WebRTC streams are available */}
        {isVideo && isConnected ? (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoPlaceholderText}>
              {displayName.charAt(0)}
            </Text>
            <Text style={styles.videoPlaceholderLabel}>Goruntu akisi</Text>

            {/* Self-view PiP placeholder */}
            <View style={styles.pipContainer}>
              <View style={styles.pipView}>
                <Text style={styles.pipText}>Sen</Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Large avatar */}
            <View style={styles.avatarContainer}>
              <View style={[
                styles.avatar,
                (callState === 'outgoing' || callState === 'incoming') && styles.avatarPulsing,
              ]}>
                <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
              </View>
              {(callState === 'outgoing' || callState === 'incoming') && (
                <View style={styles.avatarRing} />
              )}
            </View>

            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.statusLabel}>{statusLabel}</Text>
          </>
        )}
      </View>

      {/* Bottom: controls */}
      <View style={styles.controlsArea}>
        {isConnected ? (
          <>
            {/* Connected state controls */}
            <View style={styles.controlsRow}>
              <ControlButton
                icon={isMuted ? '\uD83D\uDD07' : '\uD83C\uDF99'}
                label={isMuted ? 'Sesi Ac' : 'Sessiz'}
                onPress={toggleMute}
                variant={isMuted ? 'active' : 'default'}
              />
              <ControlButton
                icon={isSpeaker ? '\uD83D\uDD0A' : '\uD83D\uDD08'}
                label={isSpeaker ? 'Hoparlor Kapat' : 'Hoparlor'}
                onPress={toggleSpeaker}
                variant={isSpeaker ? 'active' : 'default'}
              />
              {isVideo && (
                <>
                  <ControlButton
                    icon={isCameraOff ? '\uD83D\uDCF7' : '\uD83D\uDCF8'}
                    label={isCameraOff ? 'Kamera Ac' : 'Kamera Kapat'}
                    onPress={toggleCamera}
                    variant={isCameraOff ? 'active' : 'default'}
                  />
                  <ControlButton
                    icon={'\uD83D\uDD04'}
                    label="Kamera Cevir"
                    onPress={flipCamera}
                  />
                </>
              )}
            </View>

            {/* End call */}
            <View style={styles.endCallRow}>
              <ControlButton
                icon={'\uD83D\uDCF5'}
                label="Aramay\u0131 Bitir"
                onPress={handleEndCall}
                variant="danger"
                size="large"
              />
            </View>
          </>
        ) : callState === 'outgoing' || callState === 'connecting' ? (
          /* Outgoing / connecting: only end call */
          <View style={styles.endCallRow}>
            <ControlButton
              icon={'\uD83D\uDCF5'}
              label="İptal Et"
              onPress={handleEndCall}
              variant="danger"
              size="large"
            />
          </View>
        ) : callState === 'ended' ? (
          <View style={styles.endedRow}>
            <Text style={styles.endedText}>Arama sonlandi</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
  // ── Top bar ────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  minimizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimizeIcon: {
    fontSize: 24,
    color: palette.white,
    fontWeight: '600',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  callTypeLabel: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  // ── Center area ────────────────────────────────────────────
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.purple[500] + '40',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: palette.purple[400],
  },
  avatarPulsing: {
    borderColor: palette.gold[400],
  },
  avatarRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 68,
    borderWidth: 2,
    borderColor: palette.gold[400] + '40',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: palette.white,
  },
  displayName: {
    ...typography.h4,
    color: palette.white,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statusLabel: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.6)',
    fontVariant: ['tabular-nums'],
  },
  // ── Video placeholder ──────────────────────────────────────
  videoPlaceholder: {
    flex: 1,
    width: '100%',
    backgroundColor: '#141422',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoPlaceholderText: {
    fontSize: 72,
    fontWeight: '700',
    color: palette.purple[400],
    opacity: 0.3,
  },
  videoPlaceholderLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.3)',
    marginTop: spacing.sm,
  },
  pipContainer: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  pipView: {
    width: 100,
    height: 140,
    borderRadius: borderRadius.md,
    backgroundColor: '#1C1C32',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.purple[500] + '60',
    ...shadows.medium,
  },
  pipText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  // ── Controls area ──────────────────────────────────────────
  controlsArea: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  endCallRow: {
    alignItems: 'center',
  },
  controlWrapper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  controlButton: {
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  controlIcon: {
    fontWeight: '600',
  },
  controlLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
  },
  endedRow: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  endedText: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  // ── Premium gate ───────────────────────────────────────────
  premiumGate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  premiumIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.gold[400] + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  premiumIconText: {
    fontSize: 40,
  },
  premiumTitle: {
    ...typography.h4,
    color: palette.white,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  premiumSubtitle: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  upgradeButton: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: palette.gold[400],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.glow,
  },
  upgradeButtonText: {
    ...typography.button,
    color: '#1A1A1A',
    fontWeight: '700',
  },
  premiumBackButton: {
    paddingVertical: spacing.sm,
  },
  premiumBackText: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
