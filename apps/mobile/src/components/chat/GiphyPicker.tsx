// GiphyPicker — Bottom sheet GIF picker with search and trending
// Debounced search (300ms), 2-column grid, pagination on scroll

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { giphyService, type GiphyGif } from '../../services/giphyService';

// ─── Types ──────────────────────────────────────────────────

interface GiphyPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

// ─── Constants ──────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_COUNT = 2;
const GRID_SPACING = spacing.xs;
const HORIZONTAL_PADDING = spacing.lg;
const GIF_ITEM_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_SPACING) / COLUMN_COUNT;
const DEBOUNCE_DELAY = 300;
const PAGE_SIZE = 20;

// ─── GIF Thumbnail (memoized) ───────────────────────────────

interface GifThumbnailProps {
  gif: GiphyGif;
  onSelect: (gifUrl: string) => void;
}

const GifThumbnail = memo<GifThumbnailProps>(({ gif, onSelect }) => {
  const aspectRatio = gif.width / gif.height;
  const itemHeight = GIF_ITEM_WIDTH / aspectRatio;

  return (
    <TouchableOpacity
      style={[thumbnailStyles.container, { width: GIF_ITEM_WIDTH, height: Math.min(itemHeight, 200) }]}
      onPress={() => onSelect(gif.url)}
      activeOpacity={0.8}
      accessibilityLabel={gif.title || 'GIF'}
      accessibilityRole="button"
      accessibilityHint="Bu GIF\'i gondermek icin dokunun"
    >
      <Image
        source={{ uri: gif.previewUrl }}
        style={thumbnailStyles.image}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
});

GifThumbnail.displayName = 'GifThumbnail';

const thumbnailStyles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

// ─── GiphyPicker Component ──────────────────────────────────

export const GiphyPicker: React.FC<GiphyPickerProps> = ({ onSelect, onClose }) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentQueryRef = useRef('');

  // Fetch trending GIFs on mount
  useEffect(() => {
    loadTrending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTrending = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await giphyService.getTrending(0, PAGE_SIZE);
      setGifs(result.gifs);
      setOffset(result.offset);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata olustu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchGifs = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      loadTrending();
      return;
    }

    currentQueryRef.current = searchQuery;
    setIsLoading(true);
    setError(null);

    try {
      const result = await giphyService.searchGifs(searchQuery, 0, PAGE_SIZE);
      // Only update if this is still the current query
      if (currentQueryRef.current === searchQuery) {
        setGifs(result.gifs);
        setOffset(result.offset);
        setTotalCount(result.totalCount);
      }
    } catch (err) {
      if (currentQueryRef.current === searchQuery) {
        setError(err instanceof Error ? err.message : 'Bir hata olustu');
      }
    } finally {
      if (currentQueryRef.current === searchQuery) {
        setIsLoading(false);
      }
    }
  }, [loadTrending]);

  // Debounced search handler
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchGifs(text);
    }, DEBOUNCE_DELAY);
  }, [searchGifs]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Load more (pagination)
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || isLoading || gifs.length >= totalCount) return;

    setIsLoadingMore(true);
    try {
      const result = query.trim()
        ? await giphyService.searchGifs(query, offset, PAGE_SIZE)
        : await giphyService.getTrending(offset, PAGE_SIZE);

      setGifs((prev) => [...prev, ...result.gifs]);
      setOffset(result.offset);
      setTotalCount(result.totalCount);
    } catch {
      // Silently fail on load more — user can try scrolling again
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isLoading, gifs.length, totalCount, query, offset]);

  const handleSelect = useCallback((gifUrl: string) => {
    onSelect(gifUrl);
  }, [onSelect]);

  const renderGifItem = useCallback(({ item }: { item: GiphyGif }) => (
    <GifThumbnail gif={item} onSelect={handleSelect} />
  ), [handleSelect]);

  const keyExtractor = useCallback((item: GiphyGif) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={pickerStyles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isLoadingMore]);

  return (
    <View style={[pickerStyles.container, { paddingBottom: insets.bottom }]}>
      {/* Handle bar */}
      <View style={pickerStyles.handleBar}>
        <View style={pickerStyles.handle} />
      </View>

      {/* Header */}
      <View style={pickerStyles.header}>
        <Text style={pickerStyles.title}>GIF Gönder</Text>
        <TouchableOpacity
          onPress={onClose}
          accessibilityLabel="Kapat"
          accessibilityRole="button"
          testID="giphy-picker-close-btn"
        >
          <Text style={pickerStyles.closeButton}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      {/* Search input */}
      <View style={pickerStyles.searchContainer}>
        <TextInput
          style={pickerStyles.searchInput}
          value={query}
          onChangeText={handleQueryChange}
          placeholder="GIF ara..."
          placeholderTextColor={colors.textTertiary}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="GIF ara"
          accessibilityRole="search"
          testID="giphy-picker-search-input"
        />
      </View>

      {/* Content area */}
      {isLoading && gifs.length === 0 ? (
        <View style={pickerStyles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={pickerStyles.loadingText}>GIF\'ler yukleniyor...</Text>
        </View>
      ) : error ? (
        <View style={pickerStyles.centerContainer}>
          <Text style={pickerStyles.errorText}>{error}</Text>
          <TouchableOpacity
            style={pickerStyles.retryButton}
            onPress={() => query.trim() ? searchGifs(query) : loadTrending()}
            accessibilityLabel="Tekrar dene"
            accessibilityRole="button"
          >
            <Text style={pickerStyles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : gifs.length === 0 ? (
        <View style={pickerStyles.centerContainer}>
          <Text style={pickerStyles.emptyText}>GIF bulunamadi</Text>
          <Text style={pickerStyles.emptySubtext}>Baska bir arama deneyin</Text>
        </View>
      ) : (
        <FlatList
          data={gifs}
          renderItem={renderGifItem}
          keyExtractor={keyExtractor}
          numColumns={COLUMN_COUNT}
          columnWrapperStyle={pickerStyles.row}
          contentContainerStyle={pickerStyles.gridContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Giphy attribution (required by ToS) */}
      <View style={pickerStyles.attribution}>
        <Text style={pickerStyles.attributionText}>Powered by GIPHY</Text>
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const pickerStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    minHeight: 350,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  closeButton: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  searchContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    minHeight: 200,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    ...typography.bodySmall,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  gridContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  row: {
    gap: GRID_SPACING,
    marginBottom: GRID_SPACING,
  },
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  attribution: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  attributionText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
});
