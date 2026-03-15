// Places screen — shared places between user and partner
// Supports List view, Map view (abstract scatter), and Timeline view

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows, layout } from '../../theme/spacing';
import { placesService, SharedPlace, CheckInRequest, PlaceStatus } from '../../services/placesService';
import { locationService } from '../../services/locationService';
import { useRelationshipStore } from '../../stores/relationshipStore';
import { PlaceMemoriesTimeline } from '../../components/places/PlaceMemoriesTimeline';

type ViewMode = 'list' | 'map' | 'timeline';

const MAP_WIDTH = Dimensions.get('window').width - spacing.lg * 2;
const MAP_HEIGHT = 360;

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// ─── First-Visit Empty State Hint ────────────────────────────

interface EmptyPlacesHintProps {
  onCheckIn: () => void;
}

const EmptyPlacesHint: React.FC<EmptyPlacesHintProps> = ({ onCheckIn }) => {
  const iconScaleAnim = useRef(new Animated.Value(0)).current;
  const textOpacityAnim = useRef(new Animated.Value(0)).current;
  const buttonSlideAnim = useRef(new Animated.Value(20)).current;
  const buttonOpacityAnim = useRef(new Animated.Value(0)).current;
  const featureOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Scale in the icon
      Animated.spring(iconScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // 2. Fade in the text
      Animated.timing(textOpacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 3. Fade in feature hints
      Animated.timing(featureOpacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      // 4. Slide up + fade in the CTA button
      Animated.parallel([
        Animated.timing(buttonSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [iconScaleAnim, textOpacityAnim, buttonSlideAnim, buttonOpacityAnim, featureOpacityAnim]);

  return (
    <View style={emptyHintStyles.container}>
      {/* Branded LUMA icon */}
      <Animated.View
        style={[
          emptyHintStyles.iconCircle,
          { transform: [{ scale: iconScaleAnim }] },
        ]}
      >
        <Text style={emptyHintStyles.iconLetter}>L</Text>
      </Animated.View>

      {/* Title and subtitle */}
      <Animated.View style={{ opacity: textOpacityAnim, alignItems: 'center' }}>
        <Text style={emptyHintStyles.title}>
          Keşif bekliyor
        </Text>
        <Text style={emptyHintStyles.subtitle}>
          {'Özel mekanları keşfetmek için\nbir eşleşmeye ihtiyacın var.'}
        </Text>
      </Animated.View>

      {/* Feature hints */}
      <Animated.View style={[emptyHintStyles.featureList, { opacity: featureOpacityAnim }]}>
        <View style={emptyHintStyles.featureRow}>
          <Text style={emptyHintStyles.featureIcon}>{'\uD83D\uDCCD'}</Text>
          <Text style={emptyHintStyles.featureText}>Favori mekanlarınızı kaydedin</Text>
        </View>
        <View style={emptyHintStyles.featureRow}>
          <Text style={emptyHintStyles.featureIcon}>{'\uD83D\uDCF8'}</Text>
          <Text style={emptyHintStyles.featureText}>Her ziyarete özel anılar ekleyin</Text>
        </View>
        <View style={emptyHintStyles.featureRow}>
          <Text style={emptyHintStyles.featureIcon}>{'\u2764\uFE0F'}</Text>
          <Text style={emptyHintStyles.featureText}>Ortak mekan haritanız olsun</Text>
        </View>
      </Animated.View>

      {/* CTA button */}
      <Animated.View
        style={{
          opacity: buttonOpacityAnim,
          transform: [{ translateY: buttonSlideAnim }],
        }}
      >
        <TouchableOpacity
          style={emptyHintStyles.ctaButton}
          onPress={onCheckIn}
          activeOpacity={0.8}
        >
          <Text style={emptyHintStyles.ctaIcon}>{'\uD83D\uDCCD'}</Text>
          <Text style={emptyHintStyles.ctaText}>İlk Check-in'i Yap</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const emptyHintStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  iconEmoji: {
    fontSize: 44,
  },
  iconLetter: {
    fontSize: 38,
    color: colors.primary,
    fontWeight: '700',
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  featureList: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  featureText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    ...shadows.glow,
  },
  ctaIcon: {
    fontSize: 18,
  },
  ctaText: {
    ...typography.button,
    color: colors.text,
  },
});

// ─── Abstract Map View ───────────────────────────────────────

/** Deterministic pseudo-random position based on place id */
const hashToPosition = (id: string, maxX: number, maxY: number): { x: number; y: number } => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  const x = Math.abs(hash % 1000) / 1000;
  const y = Math.abs((hash * 31) % 1000) / 1000;
  // Add padding so pins don't clip edges
  const padX = 40;
  const padY = 40;
  return {
    x: padX + x * (maxX - padX * 2),
    y: padY + y * (maxY - padY * 2),
  };
};

const getStatusColor = (status: PlaceStatus | undefined): string => {
  switch (status) {
    case 'wishlist':
      return palette.gold[500];
    case 'partner_suggestion':
      return palette.pink[500];
    case 'visited':
    default:
      return palette.purple[500];
  }
};

interface AbstractMapViewProps {
  places: SharedPlace[];
  onPinPress: (place: SharedPlace) => void;
}

const AbstractMapView: React.FC<AbstractMapViewProps> = ({ places, onPinPress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (places.length === 0) {
    return (
      <View style={mapStyles.emptyMap}>
        <Text style={mapStyles.emptyMapText}>Henüz mekan eklenmemiş</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[mapStyles.mapContainer, { opacity: fadeAnim }]}>
      {/* Gradient background grid lines for "map" feel */}
      <View style={mapStyles.gridOverlay}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={`h_${i}`}
            style={[
              mapStyles.gridLine,
              {
                top: (MAP_HEIGHT / 6) * (i + 1),
                width: '100%',
                height: 1,
              },
            ]}
          />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={`v_${i}`}
            style={[
              mapStyles.gridLine,
              {
                left: (MAP_WIDTH / 6) * (i + 1),
                height: '100%',
                width: 1,
              },
            ]}
          />
        ))}
      </View>

      {/* Place pins */}
      {places.map((place) => {
        const pos = hashToPosition(place.placeId, MAP_WIDTH, MAP_HEIGHT);
        const pinColor = getStatusColor(place.status);
        return (
          <TouchableOpacity
            key={place.placeId}
            style={[
              mapStyles.pin,
              {
                left: pos.x - 28,
                top: pos.y - 28,
                borderColor: pinColor + '60',
              },
            ]}
            onPress={() => onPinPress(place)}
            activeOpacity={0.7}
          >
            <View style={[mapStyles.pinInner, { backgroundColor: pinColor + '30' }]}>
              <View style={[mapStyles.pinDot, { backgroundColor: pinColor }]} />
            </View>
            <Text style={[mapStyles.pinLabel, { color: pinColor }]} numberOfLines={1}>
              {place.name}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Legend */}
      <View style={mapStyles.legend}>
        <View style={mapStyles.legendItem}>
          <View style={[mapStyles.legendDot, { backgroundColor: palette.purple[500] }]} />
          <Text style={mapStyles.legendText}>Ziyaret Edilen</Text>
        </View>
        <View style={mapStyles.legendItem}>
          <View style={[mapStyles.legendDot, { backgroundColor: palette.gold[500] }]} />
          <Text style={mapStyles.legendText}>İstek Listesi</Text>
        </View>
        <View style={mapStyles.legendItem}>
          <View style={[mapStyles.legendDot, { backgroundColor: palette.pink[500] }]} />
          <Text style={mapStyles.legendText}>Partner Önerisi</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const mapStyles = StyleSheet.create({
  mapContainer: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
    marginVertical: spacing.md,
    ...shadows.medium,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: colors.divider,
    opacity: 0.5,
  },
  pin: {
    position: 'absolute',
    alignItems: 'center',
    width: 56,
  },
  pinInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pinLabel: {
    ...typography.captionSmall,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    maxWidth: 56,
  },
  legend: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.background + 'CC',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  emptyMap: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  emptyMapText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});

// ─── Main Screen Component ────────────────────────────────────

export const PlacesScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState<SharedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<SharedPlace | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [checkInName, setCheckInName] = useState('');
  const [checkInNote, setCheckInNote] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const { relationship, hasActiveRelationship, fetchStatus } = useRelationshipStore();

  /** Places with status assigned for map view color-coding */
  const placesWithStatus = useMemo((): SharedPlace[] => {
    return places.map((p, i) => ({
      ...p,
      // Default all to 'visited'; in the future this can come from the API
      status: (p.status ?? (i % 5 === 0 ? 'wishlist' : i % 7 === 0 ? 'partner_suggestion' : 'visited')) as PlaceStatus,
    }));
  }, [places]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const loadPlaces = useCallback(async () => {
    if (!hasActiveRelationship || !relationship?.partnerId) {
      setLoading(false);
      return;
    }

    try {
      const data = await placesService.getSharedPlaces(relationship.partnerId);
      setPlaces(data);
    } catch {
      // Silently handle -- empty state will show
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasActiveRelationship, relationship?.partnerId]);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPlaces();
  };

  const handleOpenDetail = (place: SharedPlace) => {
    setSelectedPlace(place);
    setDetailModalVisible(true);
  };

  const handleCheckIn = async () => {
    if (!checkInName.trim()) {
      Alert.alert('Hata', 'Lütfen mekan adını girin.', [{ text: 'Tamam' }]);
      return;
    }

    setIsCheckingIn(true);
    try {
      // Get current device location for accurate check-in
      const coords = await locationService.getCurrentLocation();
      if (!coords) {
        Alert.alert(
          'Konum Alınamadı',
          'Check-in için konum izni gereklidir. Lütfen konum ayarlarınızı kontrol edin.',
          [{ text: 'Tamam' }],
        );
        setIsCheckingIn(false);
        return;
      }

      const request: CheckInRequest = {
        placeId: `place_${Date.now()}`,
        placeName: checkInName.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        note: checkInNote.trim() || undefined,
      };
      await placesService.checkIn(request);
      setCheckInModalVisible(false);
      setCheckInName('');
      setCheckInNote('');
      // Reload places
      loadPlaces();
      Alert.alert('Başarılı', 'Check-in yapıldı!', [{ text: 'Tamam' }]);
    } catch {
      Alert.alert('Hata', 'Check-in yapılamadı. Lütfen tekrar deneyin.', [{ text: 'Tamam' }]);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const renderPlaceItem = ({ item }: { item: SharedPlace }) => (
    <TouchableOpacity
      style={styles.placeCard}
      onPress={() => handleOpenDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.placeIconContainer}>
        <Text style={styles.placeIcon}>O</Text>
      </View>

      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{item.name}</Text>
        <Text style={styles.placeDate}>
          Son ziyaret: {formatDate(item.lastVisited)}
        </Text>
        <View style={styles.placeStats}>
          <View style={styles.statChip}>
            <Text style={styles.statText}>
              {item.myVisits + item.partnerVisits} check-in
            </Text>
          </View>
          {item.memories.length > 0 && (
            <View style={styles.statChip}>
              <Text style={styles.statText}>
                {item.memories.length} anı
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <EmptyPlacesHint onCheckIn={() => setCheckInModalVisible(true)} />
  );

  const renderDetailModal = () => (
    <Modal
      visible={detailModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setDetailModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {selectedPlace && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedPlace.name}</Text>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)} accessibilityRole="button" accessibilityLabel="Kapat">
                  <Text style={styles.modalCloseText}>X</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalStatsRow}>
                <View style={styles.modalStatCard}>
                  <Text style={styles.modalStatValue}>{selectedPlace.myVisits + selectedPlace.partnerVisits}</Text>
                  <Text style={styles.modalStatLabel}>Check-in</Text>
                </View>
                <View style={styles.modalStatCard}>
                  <Text style={styles.modalStatValue}>{selectedPlace.memories.length}</Text>
                  <Text style={styles.modalStatLabel}>Anı</Text>
                </View>
              </View>

              <Text style={styles.modalSectionTitle}>Son Ziyaret</Text>
              <Text style={styles.modalDateText}>
                {formatDate(selectedPlace.lastVisited)}
              </Text>

              {selectedPlace.memories.length > 0 && (
                <>
                  <Text style={styles.modalSectionTitle}>Anılar</Text>
                  {selectedPlace.memories.map((memory) => (
                    <View key={memory.id} style={styles.memoryItem}>
                      <Text style={styles.memoryText}>{memory.note}</Text>
                      <Text style={styles.memoryDate}>
                        {formatDate(memory.createdAt)}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderCheckInModal = () => (
    <Modal
      visible={checkInModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setCheckInModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Check-in Yap</Text>
            <TouchableOpacity onPress={() => setCheckInModalVisible(false)} accessibilityRole="button" accessibilityLabel="Kapat">
              <Text style={styles.modalCloseText}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Mekan Adı</Text>
          <TextInput
            style={styles.textInput}
            value={checkInName}
            onChangeText={setCheckInName}
            placeholder="Mekan adını girin..."
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />

          <Text style={styles.inputLabel}>Not (isteğe bağlı)</Text>
          <TextInput
            style={[styles.textInput, styles.textInputMultiline]}
            value={checkInNote}
            onChangeText={setCheckInNote}
            placeholder="Bu mekan hakkında bir not yazın..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.checkInButton, isCheckingIn && styles.checkInButtonDisabled]}
            onPress={handleCheckIn}
            disabled={isCheckingIn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Check-in yap"
          >
            {isCheckingIn ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.checkInButtonText}>Check-in Yap</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderViewModeToggle = () => (
    <View style={styles.viewModeBar}>
      {(['list', 'map', 'timeline'] as const).map((mode) => {
        const labels: Record<ViewMode, string> = {
          list: 'Liste',
          map: 'Harita',
          timeline: 'Zaman Çizgisi',
        };
        const isActive = viewMode === mode;
        return (
          <TouchableOpacity
            key={mode}
            style={[styles.viewModeTab, isActive && styles.viewModeTabActive]}
            onPress={() => setViewMode(mode)}
            accessibilityRole="tab"
            accessibilityLabel={labels[mode]}
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.viewModeTabText, isActive && styles.viewModeTabTextActive]}>
              {labels[mode]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderMapView = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.mapScrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      <AbstractMapView
        places={placesWithStatus}
        onPinPress={(place) => handleOpenDetail(place)}
      />

      {/* Place list below the map for quick reference */}
      {placesWithStatus.length > 0 && (
        <View style={styles.mapPlacesList}>
          <Text style={styles.mapPlacesListTitle}>
            {placesWithStatus.length} mekan keşfedildi
          </Text>
          {placesWithStatus.map((place) => (
            <TouchableOpacity
              key={place.placeId}
              style={styles.mapPlaceRow}
              onPress={() => handleOpenDetail(place)}
              activeOpacity={0.7}
            >
              <View style={[styles.mapPlaceDot, { backgroundColor: getStatusColor(place.status) }]} />
              <Text style={styles.mapPlaceName} numberOfLines={1}>{place.name}</Text>
              <Text style={styles.mapPlaceVisits}>{place.myVisits + place.partnerVisits}x</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderTimelineView = () => {
    if (!relationship?.partnerId) return null;
    return (
      <PlaceMemoriesTimeline
        partnerId={relationship.partnerId}
        onAddMemory={() => setCheckInModalVisible(true)}
      />
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Keşfedilen Mekanlar</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {!hasActiveRelationship && !loading ? (
        <View style={styles.noRelationshipContainer}>
          <View style={styles.emptyIconBranded}>
            <Text style={styles.emptyIconBrandedLetter}>L</Text>
          </View>
          <Text style={styles.noRelationshipTitle}>
            Keşif bekliyor
          </Text>
          <Text style={styles.noRelationshipSubtitle}>
            Özel mekanları keşfetmek için bir eşleşmeye ihtiyacın var.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* View mode toggle */}
          {renderViewModeToggle()}

          {/* List View */}
          {viewMode === 'list' && (
            <>
              <FlatList
                data={places}
                keyExtractor={(item) => item.placeId}
                renderItem={renderPlaceItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.primary}
                  />
                }
              />

              {/* FAB - Check-in Yap */}
              {places.length > 0 && (
                <TouchableOpacity
                  style={styles.fab}
                  onPress={() => setCheckInModalVisible(true)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Check-in yap"
                >
                  <Text style={styles.fabIcon}>+</Text>
                  <Text style={styles.fabText}>Check-in Yap</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Map View */}
          {viewMode === 'map' && renderMapView()}

          {/* Timeline View */}
          {viewMode === 'timeline' && renderTimelineView()}
        </>
      )}

      {renderDetailModal()}
      {renderCheckInModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    ...typography.h4,
    color: colors.text,
  },
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  placeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
    ...shadows.small,
  },
  placeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeIcon: {
    fontSize: 22,
    color: colors.primary,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  placeDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  placeStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statChip: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconText: {
    fontSize: 36,
    color: colors.textTertiary,
  },
  emptyIconBranded: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '18',
    borderWidth: 2,
    borderColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconBrandedLetter: {
    fontSize: 32,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  emptyActionButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  emptyActionButtonText: {
    ...typography.button,
    color: colors.text,
  },
  noRelationshipContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  noRelationshipTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  noRelationshipSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    gap: spacing.xs,
    ...shadows.large,
  },
  fabIcon: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '700',
  },
  fabText: {
    ...typography.button,
    color: colors.text,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  modalCloseText: {
    ...typography.h4,
    color: colors.textTertiary,
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  modalStatCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  modalStatValue: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: 2,
  },
  modalStatLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  modalSectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  modalDateText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  memoryItem: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memoryText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  memoryDate: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  // Check-in modal form
  inputLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    ...typography.body,
  },
  textInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  checkInButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  checkInButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  checkInButtonText: {
    ...typography.button,
    color: colors.text,
  },
  // View mode toggle styles
  viewModeBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  viewModeTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  viewModeTabActive: {
    backgroundColor: colors.primary,
  },
  viewModeTabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  viewModeTabTextActive: {
    color: colors.text,
  },
  // Map view styles
  mapScrollContent: {
    paddingBottom: spacing.xl,
  },
  mapPlacesList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  mapPlacesListTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  mapPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  mapPlaceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  mapPlaceName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  mapPlaceVisits: {
    ...typography.caption,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
});
