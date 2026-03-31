import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  type RefreshControlProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_WIDTH * 0.65; // circular hero section height
const CIRCLE_SIZE = SCREEN_WIDTH * 0.55; // large circular photo diameter

// Animation config
const FADE_IN_DISTANCE = 120;

// ─── Props ───────────────────────────────────────────────────────────────────

interface InterleavedProfileLayoutProps {
  /** All photo URLs */
  photos: string[];
  /** Content rendered after the hero photo (identity card, stats, views) */
  topContent: React.ReactNode;
  /** Array of info section ReactNodes to interleave with photos */
  infoSections: React.ReactNode[];
  /** Optional header bar (back button, title, etc.) - rendered ABOVE the scroll */
  headerBar?: React.ReactNode;
  /** Optional sticky footer (action buttons) - rendered BELOW the scroll */
  footer?: React.ReactNode;
  /** Extra bottom padding for scroll content (to account for footer height) */
  scrollBottomPadding?: number;
  /** Optional RefreshControl element for pull-to-refresh */
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

// ─── Full-Screen Photo Viewer ────────────────────────────────────────────────

interface PhotoViewerProps {
  visible: boolean;
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

function PhotoViewer({ visible, photos, initialIndex, onClose }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : prev));
  }, [photos.length]);

  if (!visible || photos.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.viewerOverlay}>
        <StatusBar barStyle="light-content" />

        {/* Close button */}
        <TouchableOpacity
          style={[styles.viewerCloseButton, { top: insets.top + spacing.sm }]}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Photo — clean, no progress bars */}
        <Image
          source={{ uri: photos[currentIndex] }}
          style={styles.viewerImage}
          resizeMode="contain"
        />

        {/* Left arrow */}
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.viewerArrow, styles.viewerArrowLeft]}
            onPress={goToPrevious}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Right arrow */}
        {currentIndex < photos.length - 1 && (
          <TouchableOpacity
            style={[styles.viewerArrow, styles.viewerArrowRight]}
            onPress={goToNext}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

// ─── Circular Hero Photo with Swipe + Pull-Down ────────────────────────────

import { FlatList, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '../../theme/colors';

interface CircularHeroProps {
  photos: string[];
  onPress: (index: number) => void;
  scrollY: Animated.Value;
}

function CircularHero({ photos, onPress, scrollY }: CircularHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Pull-down expansion: circle grows when scrollY < 0
  const circleScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.15, 1],
    extrapolate: 'clamp',
  });

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CIRCLE_SIZE);
    setActiveIndex(index);
  }, []);

  const renderPhoto = useCallback(({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => onPress(index)}
      style={styles.circlePhotoSlide}
    >
      {item ? (
        <Image source={{ uri: item }} style={styles.circleImage} resizeMode="cover" />
      ) : (
        <View style={[styles.circleImage, { backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="person" size={60} color={colors.textTertiary} />
        </View>
      )}
    </TouchableOpacity>
  ), [onPress]);

  return (
    <View style={styles.circularHeroContainer}>
      {/* Circle frame with gradient ring */}
      <Animated.View style={[styles.circleFrame, { transform: [{ scale: circleScale }] }]}>
        <LinearGradient
          colors={[palette.purple[400], palette.pink[400], palette.purple[500]]}
          style={styles.circleGradientRing}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.circleInner}>
            <FlatList
              ref={flatListRef}
              data={photos.length > 0 ? photos : ['']}
              renderItem={renderPhoto}
              keyExtractor={(_, i) => `hero-photo-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              style={styles.circlePhotoList}
              snapToInterval={CIRCLE_SIZE - 8}
              decelerationRate="fast"
            />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Page dots — only if multiple photos */}
      {photos.length > 1 && (
        <View style={styles.pageDots}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[
                styles.pageDot,
                i === activeIndex && styles.pageDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Interleaved Photo (with fade-in + parallax) ────────────────────────────

interface InterleavedPhotoProps {
  uri: string;
  photoIndex: number;
  onPress: () => void;
  scrollY: Animated.Value;
  estimatedOffset: number;
}

function InterleavedPhoto({ uri, onPress, scrollY, estimatedOffset }: InterleavedPhotoProps) {
  // Fade-in as the photo scrolls into view
  const opacity = scrollY.interpolate({
    inputRange: [
      estimatedOffset - FADE_IN_DISTANCE * 2,
      estimatedOffset - FADE_IN_DISTANCE * 0.5,
    ],
    outputRange: [0.3, 1],
    extrapolate: 'clamp',
  });

  // Slight parallax shift for depth
  const translateY = scrollY.interpolate({
    inputRange: [
      estimatedOffset - SCREEN_WIDTH,
      estimatedOffset,
      estimatedOffset + SCREEN_WIDTH,
    ],
    outputRange: [12, 0, -12],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={onPress} style={styles.interleavedPhotoWrapper}>
      <Animated.View
        style={[
          styles.interleavedPhotoContainer,
          shadows.medium,
          { opacity, transform: [{ translateY }] },
        ]}
      >
        <Image source={{ uri }} style={styles.interleavedImage} resizeMode="cover" />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function InterleavedProfileLayout({
  photos,
  topContent,
  infoSections,
  headerBar,
  footer,
  scrollBottomPadding = 0,
  refreshControl,
}: InterleavedProfileLayoutProps) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const openViewer = useCallback((photoIndex: number) => {
    setViewerInitialIndex(photoIndex);
    setViewerVisible(true);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerVisible(false);
  }, []);

  // Build the interleaved content after the hero + topContent
  const interleavedContent = buildInterleavedContent(
    photos,
    infoSections,
    openViewer,
    scrollY,
  );

  return (
    <View style={styles.container}>
      {/* Header bar above the scroll */}
      {headerBar}

      {/* Scrollable content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
        showsVerticalScrollIndicator={false}
        bounces
        refreshControl={refreshControl}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {/* 1. Circular hero photo — large, swipeable, pull-down expandable */}
        <CircularHero
          photos={photos}
          onPress={(index) => openViewer(index)}
          scrollY={scrollY}
        />

        {/* 2. Top content (identity, stats, views) */}
        {topContent}

        {/* 3. Interleaved photos + info sections */}
        {interleavedContent}
      </Animated.ScrollView>

      {/* Sticky footer below the scroll */}
      {footer}

      {/* Full-screen photo viewer — clean, no progress bars */}
      <PhotoViewer
        visible={viewerVisible}
        photos={photos}
        initialIndex={viewerInitialIndex}
        onClose={closeViewer}
      />
    </View>
  );
}

// ─── Interleave Algorithm ────────────────────────────────────────────────────

function buildInterleavedContent(
  photos: string[],
  infoSections: React.ReactNode[],
  openViewer: (index: number) => void,
  scrollY: Animated.Value,
): React.ReactNode[] {
  const remainingPhotos = photos.slice(1); // everything after the hero
  const elements: React.ReactNode[] = [];

  let photoIdx = 0;
  let infoIdx = 0;

  // Estimate vertical offset for each interleaved photo (for scroll-driven animations)
  // Hero height + topContent (~280px estimate) + accumulated content
  const BASE_OFFSET = HERO_HEIGHT + 280;
  const INFO_SECTION_HEIGHT = 140; // rough average per info section
  const PHOTO_HEIGHT = SCREEN_WIDTH - spacing.lg * 2 + spacing.md * 2; // image + margins

  // Storytelling sequence: Info → Photo → Info → Photo → ...
  // This keeps the user engaged by showing lifestyle data between photos
  while (infoIdx < infoSections.length || photoIdx < remainingPhotos.length) {
    // Info section first (lifestyle, compat reasons, interests, etc.)
    if (infoIdx < infoSections.length) {
      elements.push(
        <View key={`info-${infoIdx}`}>
          {infoSections[infoIdx]}
        </View>,
      );
      infoIdx++;
    }

    // Then photo
    if (photoIdx < remainingPhotos.length) {
      const absolutePhotoIndex = photoIdx + 1;
      const estimatedOffset =
        BASE_OFFSET +
        photoIdx * PHOTO_HEIGHT +
        infoIdx * INFO_SECTION_HEIGHT;

      elements.push(
        <InterleavedPhoto
          key={`photo-${absolutePhotoIndex}`}
          uri={remainingPhotos[photoIdx]}
          photoIndex={absolutePhotoIndex}
          onPress={() => openViewer(absolutePhotoIndex)}
          scrollY={scrollY}
          estimatedOffset={estimatedOffset}
        />,
      );
      photoIdx++;
    }
  }

  return elements;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },

  // Circular hero photo
  circularHeroContainer: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  circleFrame: {
    width: CIRCLE_SIZE + 8,
    height: CIRCLE_SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleGradientRing: {
    width: CIRCLE_SIZE + 8,
    height: CIRCLE_SIZE + 8,
    borderRadius: (CIRCLE_SIZE + 8) / 2,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  circlePhotoList: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  circlePhotoSlide: {
    width: CIRCLE_SIZE - 8,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleImage: {
    width: CIRCLE_SIZE - 8,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  pageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceBorder,
  },
  pageDotActive: {
    backgroundColor: palette.purple[500],
    width: 18,
  },

  // Interleaved photo — no background color to eliminate white edge artifacts
  interleavedPhotoWrapper: {
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  interleavedPhotoContainer: {
    width: '100%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    // Match app cream background to prevent white hairline at rounded edges
    backgroundColor: colors.background,
  },
  interleavedImage: {
    width: '100%',
    height: (SCREEN_WIDTH - spacing.lg * 2) * 1.25, // 4:5 portrait ratio for natural look
    // No borderRadius on image — parent overflow:hidden handles clipping cleanly
  },

  // Full-screen viewer — clean
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCloseButton: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.25,
  },
  viewerArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  viewerArrowLeft: {
    left: spacing.md,
  },
  viewerArrowRight: {
    right: spacing.md,
  },
});
