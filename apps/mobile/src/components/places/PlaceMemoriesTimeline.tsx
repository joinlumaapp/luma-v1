// Place Memories Timeline — vertical timeline of shared memories between partners

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { placesService, TimelineEntry } from '../../services/placesService';

// ─── Date Helpers ────────────────────────────────────────────

const formatTimelineDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const getMonthYear = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });
};

// ─── Timeline Entry Card ────────────────────────────────────

interface TimelineEntryCardProps {
  entry: TimelineEntry;
  index: number;
  isLast: boolean;
}

const TimelineEntryCard: React.FC<TimelineEntryCardProps> = ({ entry, index, isLast }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = Math.min(index * 100, 600);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View
      style={[
        timelineStyles.entryContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Timeline line and dot */}
      <View style={timelineStyles.lineContainer}>
        <View style={timelineStyles.dot} />
        {!isLast && <View style={timelineStyles.line} />}
      </View>

      {/* Content card */}
      <View style={timelineStyles.cardContainer}>
        <View style={timelineStyles.card}>
          {/* Header: date + who added */}
          <View style={timelineStyles.cardHeader}>
            <Text style={timelineStyles.dateText}>
              {formatTimelineDate(entry.createdAt)}
            </Text>
            <View style={timelineStyles.addedByChip}>
              <Text style={timelineStyles.addedByText}>{entry.addedBy}</Text>
            </View>
          </View>

          {/* Place name */}
          <View style={timelineStyles.placeRow}>
            <View style={timelineStyles.placePinCircle}>
              <Text style={timelineStyles.placePinIcon}>O</Text>
            </View>
            <Text style={timelineStyles.placeName}>{entry.placeName}</Text>
          </View>

          {/* Memory note */}
          {entry.note ? (
            <Text style={timelineStyles.noteText}>{entry.note}</Text>
          ) : null}

          {/* Photo indicator */}
          {entry.photoUrl ? (
            <View style={timelineStyles.photoIndicator}>
              <Text style={timelineStyles.photoIcon}>[ Foto ]</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Month Header ────────────────────────────────────────────

interface MonthHeaderProps {
  monthLabel: string;
}

const MonthHeader: React.FC<MonthHeaderProps> = ({ monthLabel }) => (
  <View style={timelineStyles.monthHeader}>
    <View style={timelineStyles.monthDivider} />
    <Text style={timelineStyles.monthText}>{monthLabel}</Text>
    <View style={timelineStyles.monthDivider} />
  </View>
);

// ─── Main Timeline Component ─────────────────────────────────

interface PlaceMemoriesTimelineProps {
  partnerId: string;
  onAddMemory?: () => void;
}

export const PlaceMemoriesTimeline: React.FC<PlaceMemoriesTimelineProps> = ({
  partnerId,
  onAddMemory,
}) => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTimeline = useCallback(async () => {
    try {
      const data = await placesService.getMemoriesTimeline(partnerId);
      setEntries(data);
    } catch {
      // Silently handle — empty state will show
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [partnerId]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTimeline();
  };

  // Group entries by month for section headers
  const getEntriesWithMonthHeaders = (): Array<{ type: 'month'; key: string; label: string } | { type: 'entry'; key: string; data: TimelineEntry; index: number }> => {
    const result: Array<{ type: 'month'; key: string; label: string } | { type: 'entry'; key: string; data: TimelineEntry; index: number }> = [];
    let currentMonth = '';
    let entryIndex = 0;

    for (const entry of entries) {
      const month = getMonthYear(entry.createdAt);
      if (month !== currentMonth) {
        currentMonth = month;
        result.push({ type: 'month', key: `month_${month}`, label: month });
      }
      result.push({ type: 'entry', key: entry.id, data: entry, index: entryIndex });
      entryIndex++;
    }

    return result;
  };

  if (loading) {
    return (
      <View style={timelineStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={timelineStyles.emptyContainer}>
        <View style={timelineStyles.emptyIconCircle}>
          <Text style={timelineStyles.emptyIcon}>--</Text>
        </View>
        <Text style={timelineStyles.emptyTitle}>Henüz anı eklenmemiş</Text>
        <Text style={timelineStyles.emptySubtitle}>
          Mekanlarınıza check-in yaparak ve not ekleyerek anıları biriktirmeye başlayın.
        </Text>
        {onAddMemory && (
          <TouchableOpacity
            style={timelineStyles.addFirstButton}
            onPress={onAddMemory}
            activeOpacity={0.8}
          >
            <Text style={timelineStyles.addFirstButtonText}>İlk Anıyı Ekle</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const itemsWithHeaders = getEntriesWithMonthHeaders();

  return (
    <View style={timelineStyles.container}>
      <FlatList
        data={itemsWithHeaders}
        keyExtractor={(item) => item.key}
        renderItem={({ item, index: listIndex }) => {
          if (item.type === 'month') {
            return <MonthHeader monthLabel={item.label} />;
          }
          const isLastEntry = listIndex === itemsWithHeaders.length - 1;
          return (
            <TimelineEntryCard
              entry={item.data}
              index={item.index}
              isLast={isLastEntry}
            />
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={timelineStyles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Floating Add Memory button */}
      {onAddMemory && (
        <TouchableOpacity
          style={timelineStyles.fab}
          onPress={onAddMemory}
          activeOpacity={0.8}
        >
          <Text style={timelineStyles.fabIcon}>+</Text>
          <Text style={timelineStyles.fabText}>Yeni Anı Ekle</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const timelineStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  // Timeline entry
  entryContainer: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  lineContainer: {
    width: 32,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary + '40',
    marginTop: 6,
    zIndex: 1,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.primary + '30',
    marginTop: -2,
  },
  cardContainer: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  addedByChip: {
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  addedByText: {
    ...typography.captionSmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  placePinCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.pink[500] + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placePinIcon: {
    fontSize: 14,
    color: palette.pink[500],
  },
  placeName: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
  noteText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  photoIndicator: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  photoIcon: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  // Month header
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  monthDivider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  monthText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'capitalize',
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyIcon: {
    fontSize: 28,
    color: colors.textTertiary,
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
  addFirstButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  addFirstButtonText: {
    ...typography.button,
    color: colors.text,
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
    fontFamily: 'Poppins_600SemiBold',
  },
  fabText: {
    ...typography.button,
    color: colors.text,
  },
});
