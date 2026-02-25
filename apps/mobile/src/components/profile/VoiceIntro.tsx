// VoiceIntro — Profile voice introduction with waveform visualization
// Record 30-second voice intro with animated bars and play/pause controls
// "Sesimi Dinle" button for discovery cards

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography, fontWeights } from '../../theme/typography';

// ─── Types ────────────────────────────────────────────────────

interface VoiceIntroData {
  url: string;
  durationSeconds: number;
  createdAt: string;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'playing' | 'paused';

const MAX_DURATION_SECONDS = 30;
const WAVEFORM_BAR_COUNT = 32;

// ─── Animated Waveform Bar ────────────────────────────────────

interface WaveformBarProps {
  index: number;
  isAnimating: boolean;
  color: string;
  baseHeight: number;
}

const WaveformBar: React.FC<WaveformBarProps> = ({ index, isAnimating, color, baseHeight }) => {
  const heightAnim = useRef(new Animated.Value(baseHeight)).current;

  useEffect(() => {
    if (isAnimating) {
      const randomDuration = 300 + Math.random() * 400;
      const randomDelay = index * 30;

      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(heightAnim, {
            toValue: baseHeight + Math.random() * 20 + 8,
            duration: randomDuration,
            delay: randomDelay,
            useNativeDriver: false, // height cannot use native driver
          }),
          Animated.timing(heightAnim, {
            toValue: baseHeight,
            duration: randomDuration,
            useNativeDriver: false,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      Animated.timing(heightAnim, {
        toValue: baseHeight,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    return undefined;
  }, [isAnimating, baseHeight, heightAnim, index]);

  return (
    <Animated.View
      style={[
        styles.waveformBar,
        {
          height: heightAnim,
          backgroundColor: color,
        },
      ]}
    />
  );
};

// ─── Waveform Visualization ──────────────────────────────────

interface WaveformProps {
  isAnimating: boolean;
  color: string;
  barCount?: number;
}

const Waveform: React.FC<WaveformProps> = ({
  isAnimating,
  color,
  barCount = WAVEFORM_BAR_COUNT,
}) => {
  // Generate pseudo-random base heights for visual variety
  const baseHeights = useRef(
    Array.from({ length: barCount }, (_, i) => {
      const center = barCount / 2;
      const distFromCenter = Math.abs(i - center) / center;
      return 4 + (1 - distFromCenter) * 12;
    }),
  ).current;

  return (
    <View style={styles.waveformContainer}>
      {baseHeights.map((baseHeight, index) => (
        <WaveformBar
          key={index}
          index={index}
          isAnimating={isAnimating}
          color={color}
          baseHeight={baseHeight}
        />
      ))}
    </View>
  );
};

// ─── VoiceIntroRecorder — For profile editing ───────────────────

interface VoiceIntroRecorderProps {
  existingVoiceIntro: VoiceIntroData | null;
  onRecord: (uri: string) => void;
  onDelete: () => void;
}

export const VoiceIntroRecorder: React.FC<VoiceIntroRecorderProps> = ({
  existingVoiceIntro,
  onRecord,
  onDelete,
}) => {
  const [state, setState] = useState<RecordingState>(
    existingVoiceIntro ? 'recorded' : 'idle',
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(
    existingVoiceIntro?.url ?? null,
  );
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const playbackSoundRef = useRef<Audio.Sound | null>(null);

  // Cleanup audio resources on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      if (playbackSoundRef.current) {
        playbackSoundRef.current.unloadAsync().catch(() => {});
        playbackSoundRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (state === 'recording') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
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
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
    return undefined;
  }, [state, pulseAnim]);

  // Timer for recording duration
  useEffect(() => {
    if (state === 'recording') {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= MAX_DURATION_SECONDS - 1) {
            handleStopRecording();
            return MAX_DURATION_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state]);

  const handleStartRecording = useCallback(async () => {
    try {
      // Clean up any previous playback
      if (playbackSoundRef.current) {
        await playbackSoundRef.current.unloadAsync();
        playbackSoundRef.current = null;
      }

      // Request microphone permission
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Mikrofon Izni Gerekli',
          'Sesli tanitim kaydetmek icin mikrofon iznine ihtiyacimiz var. Lütfen ayarlardan mikrofon iznini aktif edin.',
        );
        return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setState('recording');
    } catch (error) {
      Alert.alert(
        'Kayit Hatasi',
        'Ses kaydi baslatilirken bir hata olustu. Lütfen tekrar deneyin.',
      );
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!recordingRef.current) {
      setState('recorded');
      return;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode so playback works normally
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (uri) {
        setRecordedUri(uri);
        onRecord(uri);
      }
      setState('recorded');
    } catch (error) {
      Alert.alert(
        'Kayit Hatasi',
        'Ses kaydi durdurulurken bir hata olustu. Lütfen tekrar deneyin.',
      );
      setState('idle');
    }
  }, [onRecord]);

  const handlePlay = useCallback(async () => {
    if (!recordedUri) return;

    try {
      // Clean up previous sound instance if exists
      if (playbackSoundRef.current) {
        await playbackSoundRef.current.unloadAsync();
        playbackSoundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: recordedUri },
        { shouldPlay: true },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            setState('recorded');
            playbackSoundRef.current?.setPositionAsync(0).catch(() => {});
          }
        },
      );
      playbackSoundRef.current = sound;
      setState('playing');
    } catch (error) {
      Alert.alert(
        'Oynatma Hatasi',
        'Ses kaydini oynatirken bir hata olustu. Lütfen tekrar deneyin.',
      );
    }
  }, [recordedUri]);

  const handlePause = useCallback(async () => {
    try {
      if (playbackSoundRef.current) {
        await playbackSoundRef.current.pauseAsync();
      }
      setState('paused');
    } catch (error) {
      Alert.alert(
        'Oynatma Hatasi',
        'Ses duraklatilirken bir hata olustu.',
      );
    }
  }, []);

  const handleDeleteRecording = useCallback(async () => {
    // Clean up playback sound
    if (playbackSoundRef.current) {
      await playbackSoundRef.current.unloadAsync().catch(() => {});
      playbackSoundRef.current = null;
    }
    setRecordedUri(null);
    setState('idle');
    setElapsedSeconds(0);
    onDelete();
  }, [onDelete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.recorderContainer}>
      <Text style={styles.recorderTitle}>Sesli Tanitim</Text>
      <Text style={styles.recorderSubtitle}>
        30 saniyede kendini sesli olarak tanit
      </Text>

      {/* Waveform */}
      <View style={styles.waveformWrapper}>
        <Waveform
          isAnimating={state === 'recording' || state === 'playing'}
          color={
            state === 'recording'
              ? palette.pink[500]
              : state === 'playing'
                ? palette.purple[500]
                : palette.gray[500]
          }
        />
      </View>

      {/* Timer */}
      <Text style={styles.timer}>
        {formatTime(elapsedSeconds)} / {formatTime(MAX_DURATION_SECONDS)}
      </Text>

      {/* Controls */}
      <View style={styles.controls}>
        {state === 'idle' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleStartRecording}
            style={styles.recordButton}
          >
            <View style={styles.recordButtonInner} />
            <Text style={styles.recordButtonLabel}>Kayit Baslat</Text>
          </TouchableOpacity>
        )}

        {state === 'recording' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleStopRecording}
            style={styles.stopButton}
          >
            <Animated.View
              style={[
                styles.recordingPulse,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.stopButtonInner} />
            <Text style={styles.recordButtonLabel}>Durdur</Text>
          </TouchableOpacity>
        )}

        {(state === 'recorded' || state === 'paused') && (
          <View style={styles.playbackControls}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDeleteRecording}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>{'\uD83D\uDDD1'}</Text>
              <Text style={styles.deleteButtonLabel}>Sil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePlay}
              style={styles.playButton}
            >
              <Text style={styles.playButtonIcon}>{'\u25B6'}</Text>
              <Text style={styles.playButtonLabel}>Dinle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleStartRecording}
              style={styles.rerecordButton}
            >
              <Text style={styles.rerecordButtonText}>{'\uD83D\uDD04'}</Text>
              <Text style={styles.rerecordButtonLabel}>Tekrar</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'playing' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePause}
            style={styles.pauseButton}
          >
            <Text style={styles.pauseButtonIcon}>{'\u23F8'}</Text>
            <Text style={styles.recordButtonLabel}>Duraklat</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── VoiceIntroPlayer — "Sesimi Dinle" button for discovery cards ─

interface VoiceIntroPlayerProps {
  voiceIntroUrl: string | null;
  userName: string;
}

export const VoiceIntroPlayer: React.FC<VoiceIntroPlayerProps> = ({
  voiceIntroUrl,
  userName: _userName,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const waveAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      pulseAnimRef.current?.stop();
      waveAnimRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      // Pulse glow effect
      pulseAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
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
      pulseAnimRef.current.start();

      // Wave progress
      waveAnimRef.current = Animated.timing(waveAnim, {
        toValue: 1,
        duration: 30000, // max 30 sec
        useNativeDriver: true,
      });
      waveAnimRef.current.start();
    } else {
      pulseAnimRef.current?.stop();
      waveAnimRef.current?.stop();
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
    }
  }, [isPlaying, pulseAnim, waveAnim]);

  const handleToggle = useCallback(async () => {
    if (!voiceIntroUrl) return;

    try {
      if (isPlaying) {
        // Pause playback
        if (soundRef.current) {
          await soundRef.current.pauseAsync();
        }
        setIsPlaying(false);
      } else {
        // Start or resume playback
        if (soundRef.current) {
          // Check if sound is already loaded and can resume
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            await soundRef.current.playAsync();
            setIsPlaying(true);
            return;
          }
          // If not loaded, clean up and create fresh
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: voiceIntroUrl },
          { shouldPlay: true },
          (status: AVPlaybackStatus) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlaying(false);
              soundRef.current?.setPositionAsync(0).catch(() => {});
            }
          },
        );
        soundRef.current = sound;
        setIsPlaying(true);
      }
    } catch (error) {
      setIsPlaying(false);
      Alert.alert(
        'Oynatma Hatasi',
        'Sesli tanitim oynatilirken bir hata olustu. Lütfen tekrar deneyin.',
      );
    }
  }, [voiceIntroUrl, isPlaying]);

  if (!voiceIntroUrl) return null;

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleToggle}
        style={[
          styles.voicePlayerButton,
          isPlaying && styles.voicePlayerButtonPlaying,
        ]}
      >
        <Text style={styles.voicePlayerIcon}>
          {isPlaying ? '\uD83D\uDD0A' : '\uD83C\uDFA4'}
        </Text>
        <Text style={styles.voicePlayerText}>
          {isPlaying ? 'Dinleniyor...' : 'Sesimi Dinle'}
        </Text>

        {/* Mini waveform indicator */}
        {isPlaying && (
          <View style={styles.miniWaveform}>
            {[0, 1, 2, 3, 4].map((i) => (
              <MiniWaveBar key={i} index={i} />
            ))}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Mini Waveform Bar for Player Button ─────────────────────

const MiniWaveBar: React.FC<{ index: number }> = ({ index }) => {
  const heightAnim = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(heightAnim, {
          toValue: 8 + Math.random() * 8,
          duration: 200 + Math.random() * 300,
          delay: index * 60,
          useNativeDriver: false,
        }),
        Animated.timing(heightAnim, {
          toValue: 4,
          duration: 200 + Math.random() * 300,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [heightAnim, index]);

  return (
    <Animated.View
      style={[
        styles.miniWaveBar,
        { height: heightAnim },
      ]}
    />
  );
};

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Recorder
  recorderContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  recorderTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  recorderSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
  waveformWrapper: {
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 2,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 4,
  },
  timer: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: fontWeights.medium,
    marginBottom: spacing.lg,
  },
  controls: {
    alignItems: 'center',
  },

  // Record Button
  recordButton: {
    alignItems: 'center',
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.pink[500],
    marginBottom: spacing.sm,
    ...shadows.glow,
    shadowColor: palette.pink[500],
  },
  recordButtonLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },

  // Stop Button
  stopButton: {
    alignItems: 'center',
  },
  recordingPulse: {
    position: 'absolute',
    top: -4,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${palette.pink[500]}30`,
  },
  stopButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.error,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Playback Controls
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  deleteButton: {
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  deleteButtonLabel: {
    ...typography.captionSmall,
    color: colors.error,
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: palette.purple[500],
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    ...shadows.glow,
  },
  playButtonIcon: {
    color: palette.white,
    fontSize: 20,
  },
  playButtonLabel: {
    ...typography.captionSmall,
    color: palette.white,
    marginTop: 2,
  },
  rerecordButton: {
    alignItems: 'center',
  },
  rerecordButtonText: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  rerecordButtonLabel: {
    ...typography.captionSmall,
    color: colors.textSecondary,
  },

  // Pause Button
  pauseButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.purple[500],
  },
  pauseButtonIcon: {
    fontSize: 24,
    color: palette.purple[500],
  },

  // Voice Player (Discovery Card)
  voicePlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${palette.purple[500]}15`,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: `${palette.purple[500]}30`,
    gap: spacing.sm,
  },
  voicePlayerButtonPlaying: {
    backgroundColor: `${palette.purple[500]}25`,
    borderColor: palette.purple[500],
    ...shadows.glow,
  },
  voicePlayerIcon: {
    fontSize: 16,
  },
  voicePlayerText: {
    ...typography.bodySmall,
    color: palette.purple[400],
    fontWeight: fontWeights.semibold,
  },
  miniWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: spacing.xs,
  },
  miniWaveBar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: palette.purple[400],
  },
});
