// MusicPicker — Spotify-style searchable music picker modal
// Full-screen slide-up modal with search, popular tracks, and smooth selection
// Uses mock data; will connect to real music API when backend is ready

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

// ─── Types ───────────────────────────────────────────────────

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  previewUrl: string | null;
  duration: string;
}

interface MusicPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (track: MusicTrack) => void;
}

// ─── Mock Data ───────────────────────────────────────────────

const POPULAR_TRACKS: MusicTrack[] = [
  { id: 'track-01', title: 'Dunyadan Uzak', artist: 'Sezen Aksu', coverUrl: 'https://picsum.photos/seed/sezen/200', previewUrl: null, duration: '4:12' },
  { id: 'track-02', title: 'Firuze', artist: 'Sezen Aksu', coverUrl: 'https://picsum.photos/seed/firuze/200', previewUrl: null, duration: '3:58' },
  { id: 'track-03', title: 'Istanbul', artist: 'Tarkan', coverUrl: 'https://picsum.photos/seed/tarkan/200', previewUrl: null, duration: '4:32' },
  { id: 'track-04', title: 'Blinding Lights', artist: 'The Weeknd', coverUrl: 'https://picsum.photos/seed/weeknd/200', previewUrl: null, duration: '3:22' },
  { id: 'track-05', title: 'Sari Cizmeli Mehmet Aga', artist: 'Baris Manco', coverUrl: 'https://picsum.photos/seed/baris/200', previewUrl: null, duration: '5:10' },
  { id: 'track-06', title: 'As It Was', artist: 'Harry Styles', coverUrl: 'https://picsum.photos/seed/harry/200', previewUrl: null, duration: '2:47' },
  { id: 'track-07', title: 'Yalnizim', artist: 'Teoman', coverUrl: 'https://picsum.photos/seed/teoman/200', previewUrl: null, duration: '4:05' },
  { id: 'track-08', title: 'Ask', artist: 'Mor ve Otesi', coverUrl: 'https://picsum.photos/seed/mor/200', previewUrl: null, duration: '3:48' },
  { id: 'track-09', title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', coverUrl: 'https://picsum.photos/seed/gaga/200', previewUrl: null, duration: '4:01' },
  { id: 'track-10', title: 'Gulumse', artist: 'Manga', coverUrl: 'https://picsum.photos/seed/manga/200', previewUrl: null, duration: '3:35' },
];

// ─── Search Helper ───────────────────────────────────────────

const normalizeForSearch = (text: string): string =>
  text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

const filterTracks = (query: string): MusicTrack[] => {
  const normalized = normalizeForSearch(query.trim());
  if (!normalized) return POPULAR_TRACKS;

  return POPULAR_TRACKS.filter((track) => {
    const titleMatch = normalizeForSearch(track.title).includes(normalized);
    const artistMatch = normalizeForSearch(track.artist).includes(normalized);
    return titleMatch || artistMatch;
  });
};

// ─── Track Item ──────────────────────────────────────────────

interface TrackItemProps {
  track: MusicTrack;
  onSelect: (track: MusicTrack) => void;
  index: number;
}

const TrackItem: React.FC<TrackItemProps> = React.memo(({ track, onSelect, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = index * 50;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const handlePress = useCallback(() => {
    onSelect(track);
  }, [onSelect, track]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={itemStyles.container}
        onPress={handlePress}
        activeOpacity={0.65}
      >
        <Image
          source={{ uri: track.coverUrl }}
          style={itemStyles.cover}
          resizeMode="cover"
        />
        <View style={itemStyles.info}>
          <Text style={itemStyles.title} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={itemStyles.artist} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
        <Text style={itemStyles.duration}>{track.duration}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Empty State ─────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <View style={emptyStyles.container}>
    <View style={emptyStyles.iconCircle}>
      <Ionicons name="musical-notes" size={32} color={palette.purple[400]} />
    </View>
    <Text style={emptyStyles.text}>Aradığın şarkıyı bulamadık</Text>
    <Text style={emptyStyles.subText}>Farklı bir arama dene</Text>
  </View>
);

// ─── MusicPicker Component ───────────────────────────────────

export const MusicPicker: React.FC<MusicPickerProps> = ({ visible, onClose, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  const filteredTracks = filterTracks(searchQuery);
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleSelect = useCallback(
    (track: MusicTrack) => {
      onSelect(track);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [onClose, slideAnim, backdropAnim]);

  const renderTrackItem = useCallback(
    ({ item, index }: { item: MusicTrack; index: number }) => (
      <TrackItem track={item} onSelect={handleSelect} index={index} />
    ),
    [handleSelect],
  );

  const keyExtractor = useCallback((item: MusicTrack) => item.id, []);

  const ListHeader = useCallback(
    () => (
      <View style={pickerStyles.sectionHeader}>
        <Text style={pickerStyles.sectionTitle}>
          {isSearching ? 'Sonuçlar' : 'Popüler Şarkılar'}
        </Text>
      </View>
    ),
    [isSearching],
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar style="light" backgroundColor="#08080F" />
      <View style={pickerStyles.overlay}>
        {/* Backdrop */}
        <Animated.View
          style={[
            pickerStyles.backdrop,
            { opacity: backdropAnim },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Modal Content */}
        <Animated.View
          style={[
            pickerStyles.modal,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <KeyboardAvoidingView
            style={pickerStyles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Drag Handle */}
            <View style={pickerStyles.handleBar}>
              <View style={pickerStyles.handle} />
            </View>

            {/* Header */}
            <View style={pickerStyles.header}>
              <Text style={pickerStyles.headerTitle}>Müzik Seç</Text>
              <TouchableOpacity
                style={pickerStyles.closeButton}
                onPress={handleClose}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={palette.gray[400]} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={pickerStyles.searchContainer}>
              <View style={pickerStyles.searchBar}>
                <Ionicons
                  name="musical-notes"
                  size={18}
                  color={palette.purple[400]}
                  style={pickerStyles.searchIcon}
                />
                <TextInput
                  ref={searchInputRef}
                  style={pickerStyles.searchInput}
                  placeholder="Şarkı veya sanatçı ara..."
                  placeholderTextColor={palette.gray[500]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color={palette.gray[400]} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Track List */}
            <FlatList
              data={filteredTracks}
              renderItem={renderTrackItem}
              keyExtractor={keyExtractor}
              ListHeaderComponent={ListHeader}
              ListEmptyComponent={EmptyState}
              contentContainerStyle={pickerStyles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Constants ───────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Track Item Styles ───────────────────────────────────────

const itemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  info: {
    flex: 1,
    marginLeft: spacing.smd,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  artist: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    marginTop: 2,
  },
  duration: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    marginLeft: spacing.sm,
  },
});

// ─── Empty State Styles ──────────────────────────────────────

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl + spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  text: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    textAlign: 'center',
  },
});

// ─── Picker Modal Styles ─────────────────────────────────────

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modal: {
    height: SCREEN_HEIGHT * 0.88,
    backgroundColor: '#0F0F1A',
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: spacing.smd,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  closeButton: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    paddingVertical: 0,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.smd,
  },
  sectionTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingBottom: spacing.xl + spacing.lg,
  },
});
