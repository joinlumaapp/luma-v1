import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  FlatList,
  type RefreshControlProps,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import ReanimatedDefault, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const ReanimatedView = ReanimatedDefault.View;
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_WIDTH * 1.25; // 4:5 ratio — shows full upper body without excessive face crop

// Parallax config
const PARALLAX_FACTOR = 0.15; // 15% slower than scroll for depth effect
const FADE_IN_DISTANCE = 120; // pixels before fully visible

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

// ─── Pinch-to-Zoom Photo Item ────────────────────────────────────────────────

interface ZoomablePhotoProps {
  uri: string;
}

function ZoomablePhoto({ uri }: ZoomablePhotoProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
        savedScale.value = 1;
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 3) {
        scale.value = withSpring(3, { damping: 15, stiffness: 200 });
        savedScale.value = 3;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      if (savedScale.value > 1) {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
        savedScale.value = 1;
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2, { damping: 15, stiffness: 200 });
        savedScale.value = 2;
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <ReanimatedView style={[zoomStyles.photoContainer, animatedStyle]}>
        <Image
          source={{ uri }}
          style={zoomStyles.photo}
          resizeMode="contain"
        />
      </ReanimatedView>
    </GestureDetector>
  );
}

const zoomStyles = StyleSheet.create({
  photoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.25,
  },
});

// ─── Full-Screen Photo Viewer (Swipeable Carousel + Pinch-to-Zoom) ──────────

interface PhotoViewerProps {
  visible: boolean;
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

function PhotoViewer({ visible, photos, initialIndex, onClose }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      // Scroll to initial index after mount
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    }
  }, [visible, initialIndex]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / SCREEN_WIDTH);
      if (newIndex >= 0 && newIndex < photos.length) {
        setCurrentIndex(newIndex);
      }
    },
    [photos.length],
  );

  const renderItem = useCallback(
    ({ item }: { item: string }) => (
      <ZoomablePhoto uri={item} />
    ),
    [],
  );

  const keyExtractor = useCallback(
    (_item: string, index: number) => `viewer-photo-${index}`,
    [],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<string> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  if (!visible || photos.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.viewerOverlay}>
        <StatusBar style="light" backgroundColor="#08080F" />

        {/* Close button */}
        <TouchableOpacity
          style={[styles.viewerCloseButton, { top: insets.top + spacing.sm }]}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Horizontal swipe carousel */}
        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialIndex}
          style={styles.viewerCarousel}
          contentContainerStyle={styles.viewerCarouselContent}
        />

        {/* Page indicator dots */}
        {photos.length > 1 && (
          <View style={styles.dotsContainer}>
            {photos.map((_, i) => (
              <View
                key={`dot-${i}`}
                style={[
                  styles.dot,
                  i === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

// ─── Hero Photo (clean, no indicators) ──────────────────────────────────────

interface HeroPhotoProps {
  uri: string;
  onPress: () => void;
  scrollY: Animated.Value;
}

function HeroPhoto({ uri, onPress, scrollY }: HeroPhotoProps) {
  // Parallax: image moves slower than scroll, creating depth
  const imageTranslateY = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT],
    outputRange: [-HERO_HEIGHT * PARALLAX_FACTOR, 0, HERO_HEIGHT * PARALLAX_FACTOR],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
      <View style={styles.heroContainer}>
        <Animated.Image
          source={{ uri }}
          style={[styles.heroImage, { transform: [{ translateY: imageTranslateY }] }]}
          resizeMode="cover"
        />
      </View>
    </TouchableOpacity>
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
        {/* 1. Hero photo — clean, no indicators */}
        {photos.length > 0 && (
          <HeroPhoto
            uri={photos[0]}
            onPress={() => openViewer(0)}
            scrollY={scrollY}
          />
        )}

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

  // Hero photo — clean, no overlays
  heroContainer: {
    width: SCREEN_WIDTH - 32,
    height: HERO_HEIGHT,
    marginHorizontal: 16,
    marginTop: spacing.sm,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '130%', // extra height for parallax movement
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

  // Full-screen viewer — swipeable carousel + pinch-to-zoom
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
  viewerCarousel: {
    flex: 0,
  },
  viewerCarouselContent: {
    alignItems: 'center',
  },
  // Page indicator dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: palette.purple[400],
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
