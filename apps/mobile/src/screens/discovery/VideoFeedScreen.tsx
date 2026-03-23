// VideoFeedScreen — TikTok/Reels style vertical video discovery
// API-first: calls /discovery/video-feed. Dev fallback via devMockOrThrow.
// Shows loading → content | empty | error states. No mock data in production.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Text,
  Alert,
  ViewToken,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { VideoCard } from '../../components/video';
import type { VideoProfile } from '../../components/video/VideoCard';
import { discoveryService } from '../../services/discoveryService';
import type { VideoFeedCard } from '../../services/discoveryService';
import { palette } from '../../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Adapter ─────────────────────────────────────────────────
// VideoFeedCard (API shape) → VideoProfile (component shape)
const toVideoProfile = (card: VideoFeedCard): VideoProfile => ({
  userId: card.userId,
  name: card.name,
  age: card.age,
  city: card.city,
  distance: card.distance,
  compatibilityPercent: card.compatibilityPercent,
  videoUrl: card.videoUrl,
  thumbnailUrl: card.thumbnailUrl,
  avatarUrl: card.avatarUrl,
  isVerified: card.isVerified,
  intentionTag: card.intentionTag,
  bio: card.bio,
});

// ─── Screen ──────────────────────────────────────────────────

export const VideoFeedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [profiles, setProfiles] = useState<VideoProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // ─── Data fetching ─────────────────────────────────────────

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const cards = await discoveryService.getVideoFeed();
      setProfiles(cards.map(toVideoProfile));
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // ─── Viewability ───────────────────────────────────────────

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  // ─── Action handlers ───────────────────────────────────────

  const handleLike = useCallback((_userId: string) => {
    // TODO: call matchService.swipe({ direction: 'LIKE', targetUserId })
  }, []);

  const handleSkip = useCallback((_userId: string) => {
    const nextIndex = activeIndex + 1;
    if (nextIndex < profiles.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }
  }, [activeIndex, profiles.length]);

  const handleProfile = useCallback((userId: string) => {
    (navigation.navigate as (screen: string, params: object) => void)('ProfilePreview', { userId });
  }, [navigation]);

  const handleInstantConnect = useCallback((_userId: string) => {
    Alert.alert(
      'Anında Bağlan',
      'Bu kişiye direkt mesaj göndermek ister misin? (Premium özellik)',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Mesaj Gönder', onPress: () => {} },
      ],
    );
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderItem = useCallback(({ item, index }: { item: VideoProfile; index: number }) => (
    <VideoCard
      profile={item}
      isActive={index === activeIndex}
      onLike={handleLike}
      onSkip={handleSkip}
      onProfile={handleProfile}
      onInstantConnect={handleInstantConnect}
    />
  ), [activeIndex, handleLike, handleSkip, handleProfile, handleInstantConnect]);

  const keyExtractor = useCallback((item: VideoProfile) => item.userId, []);

  const getItemLayout = useCallback((_: unknown, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  }), []);

  // ─── Render helpers ────────────────────────────────────────

  const topBar = (
    <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.topTitle}>Video Keşfet</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  // ── Loading ──
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centeredContent]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        {topBar}
        <ActivityIndicator size="large" color={palette.purple[400]} />
        <Text style={styles.statusText}>Videolar yükleniyor...</Text>
      </View>
    );
  }

  // ── Error ──
  if (hasError) {
    return (
      <View style={[styles.container, styles.centeredContent]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        {topBar}
        <Ionicons name="wifi-outline" size={48} color="rgba(255,255,255,0.4)" />
        <Text style={styles.statusText}>Videolar yüklenemedi</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchFeed} activeOpacity={0.75}>
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Tekrar dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty ──
  if (profiles.length === 0) {
    return (
      <View style={[styles.container, styles.centeredContent]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        {topBar}
        <Ionicons name="videocam-off-outline" size={48} color="rgba(255,255,255,0.4)" />
        <Text style={styles.statusText}>Şu an gösterilecek video yok</Text>
        <Text style={styles.statusSubText}>Yakında yeni profiller eklenecek</Text>
      </View>
    );
  }

  // ── Feed ──
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <FlatList
        ref={flatListRef}
        data={profiles}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={2}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {topBar}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centeredContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statusText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  statusSubText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginTop: 4,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
