// MiniVoicePlayer — Small floating button on photo for voice intro playback
// Circular glassmorphic button with animated sound wave bars when playing
// Uses expo-av Audio.Sound, auto-stops on unmount

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { palette } from '../../theme/colors';

// ─── Types ────────────────────────────────────────────────────

interface MiniVoicePlayerProps {
  voiceUrl: string;
}

// ─── Animated Sound Wave Bar ─────────────────────────────────

const BAR_HEIGHTS = [12, 18, 10]; // base heights for 3 bars

interface SoundBarProps {
  index: number;
  isPlaying: boolean;
}

const SoundBar: React.FC<SoundBarProps> = ({ index, isPlaying }) => {
  const height = useSharedValue(BAR_HEIGHTS[index]);

  useEffect(() => {
    if (isPlaying) {
      const maxHeight = BAR_HEIGHTS[index] + 8;
      const minHeight = 4;
      const duration = 250 + index * 80;

      height.value = withDelay(
        index * 100,
        withRepeat(
          withSequence(
            withTiming(maxHeight, { duration }),
            withTiming(minHeight, { duration }),
          ),
          -1,
          true,
        ),
      );
    } else {
      cancelAnimation(height);
      height.value = withTiming(BAR_HEIGHTS[index], { duration: 200 });
    }
  }, [isPlaying, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View style={[styles.soundBar, animatedStyle]} />
  );
};

// ─── Component ────────────────────────────────────────────────

const MiniVoicePlayerInner: React.FC<MiniVoicePlayerProps> = ({ voiceUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const handleToggle = useCallback(async () => {
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
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            await soundRef.current.playAsync();
            setIsPlaying(true);
            return;
          }
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: voiceUrl },
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
    } catch (_error) {
      setIsPlaying(false);
    }
  }, [voiceUrl, isPlaying]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleToggle}
      style={styles.button}
      accessibilityLabel={isPlaying ? 'Sesi duraklat' : 'Sesli tanıtımı dinle'}
      accessibilityRole="button"
    >
      {isPlaying ? (
        <>
          <SoundBar index={0} isPlaying={isPlaying} />
          <SoundBar index={1} isPlaying={isPlaying} />
          <SoundBar index={2} isPlaying={isPlaying} />
        </>
      ) : (
        <Ionicons name="mic" size={20} color={palette.white} />
      )}
    </TouchableOpacity>
  );
};

export const MiniVoicePlayer = React.memo(MiniVoicePlayerInner);

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  soundBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: palette.white,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
});
