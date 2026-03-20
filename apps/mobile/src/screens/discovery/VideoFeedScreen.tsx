// VideoFeedScreen — TikTok/Reels style vertical video discovery for dating
// Features: fullscreen vertical scroll, autoplay active video, preload next,
// like/skip/instant-connect actions, match detection, smooth transitions

import React, { useState, useCallback, useRef, useMemo } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { VideoCard, type VideoProfile } from '../../components/video';
import { palette } from '../../theme/colors';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock video profiles for dev/testing
const MOCK_VIDEO_PROFILES: VideoProfile[] = [
  {
    userId: 'vid-001',
    name: 'Elif',
    age: 26,
    city: 'Istanbul',
    distance: '2.3 km',
    compatibilityPercent: 92,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
    isVerified: true,
    intentionTag: 'Ciddi Iliski',
    bio: 'Sahilde yurumek, kitap okumak ve yeni kesfetmek.',
  },
  {
    userId: 'vid-002',
    name: 'Zeynep',
    age: 24,
    city: 'Ankara',
    distance: '5.1 km',
    compatibilityPercent: 78,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
    isVerified: true,
    bio: 'Dans, muzik ve hayatin tadini cikarmak.',
  },
  {
    userId: 'vid-003',
    name: 'Ayse',
    age: 28,
    city: 'Izmir',
    distance: '1.8 km',
    compatibilityPercent: 85,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    avatarUrl: 'https://i.pravatar.cc/150?img=9',
    isVerified: false,
    intentionTag: 'Kesfediyorum',
    bio: 'Yoga, seyahat ve iyi kahve.',
  },
  {
    userId: 'vid-004',
    name: 'Merve',
    age: 25,
    city: 'Istanbul',
    distance: '3.7 km',
    compatibilityPercent: 68,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    avatarUrl: 'https://i.pravatar.cc/150?img=16',
    isVerified: true,
    bio: 'Fotografcilik ve dogayla ic ice.',
  },
  {
    userId: 'vid-005',
    name: 'Selin',
    age: 27,
    city: 'Bursa',
    distance: '4.2 km',
    compatibilityPercent: 94,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    avatarUrl: 'https://i.pravatar.cc/150?img=20',
    isVerified: true,
    intentionTag: 'Ciddi Iliski',
    bio: 'Kitap kurdu, kahve tutkunu.',
  },
];

export const VideoFeedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Track visible item
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  // Action handlers
  const handleLike = useCallback((userId: string) => {
    // TODO: Send like via matchService
    // Check for mutual like → trigger match animation
  }, []);

  const handleSkip = useCallback((userId: string) => {
    // Auto-scroll to next video
    const nextIndex = activeIndex + 1;
    if (nextIndex < MOCK_VIDEO_PROFILES.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }
  }, [activeIndex]);

  const handleProfile = useCallback((userId: string) => {
    navigation.navigate('ProfilePreview' as never, { userId } as never);
  }, [navigation]);

  const handleInstantConnect = useCallback((userId: string) => {
    Alert.alert(
      'Aninda Baglan',
      'Bu kisiye direkt mesaj gondermek ister misin? (Premium ozellik)',
      [
        { text: 'Vazgec', style: 'cancel' },
        { text: 'Mesaj Gonder', onPress: () => {} },
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <FlatList
        ref={flatListRef}
        data={MOCK_VIDEO_PROFILES}
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
        // Performance: preload 1 video ahead
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={2}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {/* Top bar — back button + title */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Video Kesfet</Text>
        <View style={{ width: 36 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
});
