// VideoRecorder — Video recording/selection modal for profile video upload
// Features: record from camera, pick from gallery, preview before upload,
// upload progress indicator, gold UI, Turkish text

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette } from '../../theme/colors';
import {  } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { videoService, type VideoMetadata } from '../../services/videoService';

// ─── Types ───────────────────────────────────────────────────

interface VideoRecorderProps {
  /** Whether the recorder modal is visible */
  visible: boolean;
  /** Called when user closes the modal */
  onDismiss: () => void;
  /** Called when video is ready for upload — receives the local video URI */
  onVideoReady: (video: VideoMetadata) => void;
}

// ─── Component ───────────────────────────────────────────────

export const VideoRecorder: React.FC<VideoRecorderProps> = ({
  visible,
  onDismiss,
  onVideoReady,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedVideo, setSelectedVideo] = useState<VideoMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const videoRef = useRef<Video>(null);

  // Pulse animation for record button
  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
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
    pulse.start();
    return () => pulse.stop();
  }, [visible, pulseAnim]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedVideo(null);
      setIsProcessing(false);
    }
  }, [visible]);

  const handleRecord = useCallback(async () => {
    setIsProcessing(true);
    try {
      const video = await videoService.recordVideo();
      if (video) {
        setSelectedVideo(video);
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handlePickFromGallery = useCallback(async () => {
    setIsProcessing(true);
    try {
      const video = await videoService.pickVideoFromGallery();
      if (video) {
        setSelectedVideo(video);
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedVideo) return;
    onVideoReady(selectedVideo);
    onDismiss();
  }, [selectedVideo, onVideoReady, onDismiss]);

  const handleRetry = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (selectedVideo) {
      Alert.alert(
        'İptal Et',
        'Video seçimini iptal etmek istediğinizden emin misiniz?',
        [
          { text: 'Hayır', style: 'cancel' },
          {
            text: 'Evet',
            onPress: () => {
              setSelectedVideo(null);
              onDismiss();
            },
          },
        ],
      );
    } else {
      onDismiss();
    }
  }, [selectedVideo, onDismiss]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.headerButton}
            onPress={handleCancel}
            accessibilityLabel="Kapat"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Profil Videosu</Text>
          <View style={styles.headerButton} />
        </View>

        {selectedVideo ? (
          // ── Preview Mode ──
          <View style={styles.previewContainer}>
            <Video
              ref={videoRef}
              source={{ uri: selectedVideo.uri }}
              style={styles.previewVideo}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay
              isMuted={false}
            />

            {/* Video info */}
            <View style={styles.videoInfo}>
              <View style={styles.videoInfoRow}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.videoInfoText}>
                  {Math.round(selectedVideo.duration)} saniye
                </Text>
              </View>
              <View style={styles.videoInfoRow}>
                <Ionicons name="document-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.videoInfoText}>
                  {videoService.formatFileSize(selectedVideo.size)}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={[styles.previewActions, { paddingBottom: insets.bottom + spacing.md }]}>
              <Pressable
                style={styles.retryButton}
                onPress={handleRetry}
                accessibilityLabel="Tekrar sec"
                accessibilityRole="button"
              >
                <Ionicons name="refresh" size={20} color={colors.text} />
                <Text style={styles.retryButtonText}>Tekrar Seç</Text>
              </Pressable>

              <Pressable
                style={styles.confirmButton}
                onPress={handleConfirm}
                accessibilityLabel="Videoyu onayla"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={['#D4AF37', '#B8860B'] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirmGradient}
                >
                  <Ionicons name="checkmark" size={20} color={palette.white} />
                  <Text style={styles.confirmButtonText}>Onayla</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        ) : (
          // ── Selection Mode ──
          <View style={styles.selectionContainer}>
            {/* Description */}
            <View style={styles.descriptionBlock}>
              <Ionicons name="videocam" size={48} color={palette.gold[500]} />
              <Text style={styles.descriptionTitle}>Video ile Tanıştıralım</Text>
              <Text style={styles.descriptionText}>
                10-30 saniyelik bir video ile profilini canlandır!{'\n'}
                Kendin ol, doğal ol.
              </Text>
            </View>

            {/* Record button */}
            <View style={styles.recordSection}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Pressable
                  style={styles.recordButton}
                  onPress={handleRecord}
                  disabled={isProcessing}
                  accessibilityLabel="Video cek"
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={['#D4AF37', '#B8860B'] as [string, string]}
                    style={styles.recordButtonGradient}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="large" color={palette.white} />
                    ) : (
                      <Ionicons name="videocam" size={32} color={palette.white} />
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>
              <Text style={styles.recordLabel}>Cek</Text>
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Gallery button */}
            <Pressable
              style={styles.galleryButton}
              onPress={handlePickFromGallery}
              disabled={isProcessing}
              accessibilityLabel="Galeriden video sec"
              accessibilityRole="button"
            >
              <Ionicons name="images-outline" size={22} color={palette.gold[600]} />
              <Text style={styles.galleryButtonText}>Galeriden Seç</Text>
            </Pressable>

            {/* Specs */}
            <View style={[styles.specsContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
              <View style={styles.specRow}>
                <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.specText}>10-30 saniye</Text>
              </View>
              <View style={styles.specRow}>
                <Ionicons name="film-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.specText}>MP4 veya MOV</Text>
              </View>
              <View style={styles.specRow}>
                <Ionicons name="cloud-upload-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.specText}>Maks. 50MB</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    includeFontPadding: false,
  },

  // ── Selection Mode ──
  selectionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  descriptionBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  descriptionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_800ExtraBold',
    color: colors.text,
    textAlign: 'center',
    includeFontPadding: false,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    includeFontPadding: false,
  },
  recordSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  recordButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: palette.gold[600],
    includeFontPadding: false,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.textTertiary,
    includeFontPadding: false,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: palette.gold[500],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  galleryButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: palette.gold[600],
    includeFontPadding: false,
  },
  specsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.textTertiary,
    includeFontPadding: false,
  },

  // ── Preview Mode ──
  previewContainer: {
    flex: 1,
  },
  previewVideo: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  videoInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  videoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoInfoText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  retryButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    includeFontPadding: false,
  },
  confirmButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_800ExtraBold',
    color: palette.white,
    includeFontPadding: false,
  },
});
