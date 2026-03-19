// Crossed Paths screen — Happn-inspired feature showing people near user's locations
// Privacy-first: exact location never revealed, only area names shown

import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DiscoveryStackParamList } from '../../navigation/types';
import { useCrossedPathsStore } from '../../stores/crossedPathsStore';
import { locationService } from '../../services/locationService';
import { colors, glassmorphism } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows, layout } from '../../theme/spacing';

type NavProp = NativeStackNavigationProp<DiscoveryStackParamList, 'CrossedPaths'>;

// ─── Time Ago Helper ─────────────────────────────────────────

const formatTimeAgo = (dateString: string): string => {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Dün';
  return `${days} gün önce`;
};

// ─── Privacy Banner ──────────────────────────────────────────

const PrivacyBanner: React.FC = () => (
  <View style={bannerStyles.container}>
    <Text style={bannerStyles.icon}>🔒</Text>
    <Text style={bannerStyles.text}>Tam konumunuz her zaman gizli kalır</Text>
  </View>
);

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: glassmorphism.border,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
});

// ─── Crossed Path Card ───────────────────────────────────────

interface CrossedPathCardProps {
  id: string;
  userId: string;
  name: string;
  age: number;
  photoUrl: string;
  areaName: string;
  city: string;
  lastSeenAt: string;
  crossingCount: number;
  crossingPeriod: string;
  compatibilityPercent: number;
  isVerified: boolean;
  onPress: () => void;
  onLike: () => void;
  onSkip: () => void;
}

const CrossedPathCard: React.FC<CrossedPathCardProps> = ({
  name,
  age,
  photoUrl,
  areaName,
  city,
  lastSeenAt,
  crossingCount,
  crossingPeriod,
  compatibilityPercent,
  isVerified,
  onPress,
  onLike,
  onSkip,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        cardStyles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={cardStyles.content}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={`${name}, ${age} yaşında, ${areaName}`}
        accessibilityRole="button"
      >
        {/* Photo */}
        <View style={cardStyles.photoContainer}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={cardStyles.photo} />
          ) : (
            <View style={cardStyles.photoPlaceholder}>
              <Text style={cardStyles.photoInitial}>
                {name ? name[0] : '?'}
              </Text>
            </View>
          )}
          {isVerified && (
            <View style={cardStyles.verifiedBadge}>
              <Text style={cardStyles.verifiedIcon}>✓</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={cardStyles.info}>
          <View style={cardStyles.nameRow}>
            <Text style={cardStyles.name} numberOfLines={1}>
              {name}, {age}
            </Text>
            <View style={cardStyles.compatBadge}>
              <Text style={cardStyles.compatText}>%{compatibilityPercent}</Text>
            </View>
          </View>

          <View style={cardStyles.locationRow}>
            <Text style={cardStyles.pinIcon}>📍</Text>
            <Text style={cardStyles.areaText} numberOfLines={1}>
              {areaName}, {city}
            </Text>
          </View>

          <Text style={cardStyles.timeText}>
            {formatTimeAgo(lastSeenAt)}
          </Text>

          <View style={cardStyles.bottomRow}>
            <View style={cardStyles.crossingPill}>
              <Text style={cardStyles.crossingText}>
                {crossingPeriod} {crossingCount} kez
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action buttons */}
      <View style={cardStyles.actions}>
        <TouchableOpacity
          style={cardStyles.skipBtn}
          onPress={onSkip}
          activeOpacity={0.7}
          accessibilityLabel="Geç"
          accessibilityRole="button"
        >
          <Text style={cardStyles.skipIcon}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={cardStyles.likeBtn}
          onPress={onLike}
          activeOpacity={0.7}
          accessibilityLabel="Beğen"
          accessibilityRole="button"
        >
          <Text style={cardStyles.likeIcon}>💜</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: glassmorphism.bg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: glassmorphism.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.medium,
  },
  content: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: layout.avatarMedium,
    height: layout.avatarMedium,
    borderRadius: layout.avatarMedium / 2,
    backgroundColor: colors.surfaceBorder,
  },
  photoPlaceholder: {
    width: layout.avatarMedium,
    height: layout.avatarMedium,
    borderRadius: layout.avatarMedium / 2,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    ...typography.h4,
    color: colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  verifiedIcon: {
    fontSize: 10,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    ...typography.bodyLarge,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    flex: 1,
  },
  compatBadge: {
    backgroundColor: colors.primary + '25',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  compatText: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  pinIcon: {
    fontSize: 12,
  },
  areaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  timeText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crossingPill: {
    backgroundColor: colors.primary + '18',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  crossingText: {
    ...typography.captionSmall,
    color: colors.primaryLight,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  skipBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipIcon: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  likeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeIcon: {
    fontSize: 18,
  },
});

// ─── Empty State ─────────────────────────────────────────────

const EmptyState: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[emptyStyles.container, { opacity: fadeAnim }]}>
      <View style={emptyStyles.iconCircle}>
        <Text style={emptyStyles.iconText}>📍</Text>
      </View>
      <Text style={emptyStyles.title}>Henüz kesişen yol yok</Text>
      <Text style={emptyStyles.subtitle}>
        {'Yakınında olan LUMA kullanıcılarını\nburada göreceksin. Keşfetmeye devam et!'}
      </Text>

      <View style={emptyStyles.featureList}>
        <View style={emptyStyles.featureRow}>
          <Text style={emptyStyles.featureIcon}>🔒</Text>
          <Text style={emptyStyles.featureText}>Konumun her zaman gizli kalır</Text>
        </View>
        <View style={emptyStyles.featureRow}>
          <Text style={emptyStyles.featureIcon}>📍</Text>
          <Text style={emptyStyles.featureText}>Sadece semt bilgisi paylaşılır</Text>
        </View>
        <View style={emptyStyles.featureRow}>
          <Text style={emptyStyles.featureIcon}>💜</Text>
          <Text style={emptyStyles.featureText}>Yolun kesişenleri beğenebilirsin</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
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
  iconText: {
    fontSize: 44,
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
});

// ─── Location Permission Request ─────────────────────────────

interface LocationPermissionProps {
  onGranted: () => void;
}

const LocationPermissionRequest: React.FC<LocationPermissionProps> = ({ onGranted }) => {
  const handleRequest = async () => {
    const granted = await locationService.requestPermission();
    if (granted) {
      onGranted();
    } else {
      Alert.alert(
        'Konum İzni Gerekli',
        'Yolun kesişenleri görmek için konum iznine ihtiyacımız var. Ayarlardan konum iznini aktif edebilirsin.',
        [{ text: 'Tamam' }],
      );
    }
  };

  return (
    <View style={permStyles.container}>
      <View style={permStyles.iconCircle}>
        <Text style={permStyles.iconText}>📍</Text>
      </View>
      <Text style={permStyles.title}>Konum İzni</Text>
      <Text style={permStyles.subtitle}>
        {'Yolun kesişenleri görebilmek için\nkonum iznini etkinleştirmen gerekiyor.'}
      </Text>
      <TouchableOpacity
        style={permStyles.button}
        onPress={handleRequest}
        activeOpacity={0.8}
      >
        <Text style={permStyles.buttonText}>Konumu Etkinleştir</Text>
      </TouchableOpacity>
      <Text style={permStyles.privacyNote}>
        🔒 Tam konumunuz asla paylaşılmaz
      </Text>
    </View>
  );
};

const permStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  iconText: {
    fontSize: 44,
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
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    ...shadows.glow,
  },
  buttonText: {
    ...typography.button,
    color: colors.text,
  },
  privacyNote: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});

// ─── Main Screen Component ───────────────────────────────────

export const CrossedPathsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { paths, isLoading, fetchPaths, likePath, skipPath } = useCrossedPathsStore();

  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // Check location permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      const granted = await locationService.checkPermission();
      setHasPermission(granted);
      if (granted) {
        fetchPaths();
      }
    };
    checkPermission();
  }, [fetchPaths]);

  const handlePermissionGranted = useCallback(() => {
    setHasPermission(true);
    fetchPaths();
  }, [fetchPaths]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPaths();
    setRefreshing(false);
  }, [fetchPaths]);

  const handleProfilePress = useCallback(
    (userId: string) => {
      navigation.navigate('ProfilePreview', { userId });
    },
    [navigation],
  );

  const handleLike = useCallback(
    async (userId: string) => {
      const matched = await likePath(userId);
      if (matched) {
        Alert.alert('Eşleşme!', 'Tebrikler, yeni bir eşleşmen var!', [
          { text: 'Harika!' },
        ]);
      }
    },
    [likePath],
  );

  const handleSkip = useCallback(
    (userId: string) => {
      skipPath(userId);
    },
    [skipPath],
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof paths)[number] }) => (
      <CrossedPathCard
        id={item.id}
        userId={item.userId}
        name={item.name}
        age={item.age}
        photoUrl={item.photoUrl}
        areaName={item.areaName}
        city={item.city}
        lastSeenAt={item.lastSeenAt}
        crossingCount={item.crossingCount}
        crossingPeriod={item.crossingPeriod}
        compatibilityPercent={item.compatibilityPercent}
        isVerified={item.isVerified}
        onPress={() => handleProfilePress(item.userId)}
        onLike={() => handleLike(item.userId)}
        onSkip={() => handleSkip(item.userId)}
      />
    ),
    [handleProfilePress, handleLike, handleSkip],
  );

  const keyExtractor = useCallback(
    (item: (typeof paths)[number]) => item.id,
    [],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Geri"
          accessibilityRole="button"
        >
          <Text style={styles.backText}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yolun Kesişenler</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {hasPermission === null ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !hasPermission ? (
        <LocationPermissionRequest onGranted={handlePermissionGranted} />
      ) : isLoading && paths.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Kesişen yollar aranıyor...</Text>
        </View>
      ) : (
        <FlatList
          data={paths}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={<PrivacyBanner />}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          // Performance tuning
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
        />
      )}
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
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  listContent: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xxl,
  },
});
