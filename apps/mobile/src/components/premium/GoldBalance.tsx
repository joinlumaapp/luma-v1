// GoldBalance — Compact gold coin + balance display for app header/profile
// Tap to open a modal showing gold transaction history.

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, shadows } from '../../theme/spacing';
import {
  paymentService,
  type GoldTransaction,
} from '../../services/paymentService';

// ─── Types ───────────────────────────────────────────────────

interface GoldBalanceProps {
  /** Current gold balance (passed from parent to avoid redundant fetches) */
  balance: number;
}

// ─── Component ───────────────────────────────────────────────

export const GoldBalance: React.FC<GoldBalanceProps> = ({ balance }) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [transactions, setTransactions] = useState<GoldTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch transaction history when modal opens
  const fetchHistory = useCallback(async (pageNum: number, append: boolean) => {
    try {
      setIsLoading(true);
      const data = await paymentService.getGoldHistory(pageNum, 20);
      if (append) {
        setTransactions((prev) => [...prev, ...data.transactions]);
      } else {
        setTransactions(data.transactions);
      }
      setHasMore(pageNum < data.pagination.totalPages);
    } catch {
      // Non-critical — silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load first page when modal opens
  useEffect(() => {
    if (modalVisible) {
      setPage(1);
      setHasMore(true);
      fetchHistory(1, false);
    }
  }, [modalVisible, fetchHistory]);

  // Load more for infinite scroll
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchHistory(nextPage, true);
    }
  }, [isLoading, hasMore, page, fetchHistory]);

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render a single transaction item
  const renderTransaction = useCallback(
    ({ item }: { item: GoldTransaction }) => {
      const isPositive = item.amount > 0;
      return (
        <View style={historyStyles.transactionRow}>
          {/* Amount indicator */}
          <View
            style={[
              historyStyles.amountBadge,
              {
                backgroundColor: isPositive
                  ? colors.success + '15'
                  : colors.error + '15',
              },
            ]}
          >
            <Text
              style={[
                historyStyles.amountText,
                { color: isPositive ? colors.success : colors.error },
              ]}
            >
              {isPositive ? '+' : ''}{item.amount}
            </Text>
          </View>

          {/* Description + date */}
          <View style={historyStyles.transactionInfo}>
            <Text style={historyStyles.transactionDesc} numberOfLines={1}>
              {item.description}
            </Text>
            <Text style={historyStyles.transactionDate}>
              {formatDate(item.createdAt)}
            </Text>
          </View>

          {/* Balance after transaction */}
          <Text style={historyStyles.balanceAfter}>{item.balance}</Text>
        </View>
      );
    },
    [],
  );

  // Don't render anything if balance is 0
  if (balance <= 0) {
    return null;
  }

  return (
    <>
      {/* Compact gold balance display */}
      <TouchableOpacity
        style={styles.container}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.coinIcon}>
          <Text style={styles.coinText}>G</Text>
        </View>
        <Text style={styles.balanceText}>{balance}</Text>
      </TouchableOpacity>

      {/* Transaction history modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[historyStyles.overlay, { paddingTop: insets.top }]}>
          <View
            style={[
              historyStyles.container,
              { paddingBottom: insets.bottom + spacing.md },
            ]}
          >
            {/* Header */}
            <View style={historyStyles.header}>
              <Text style={historyStyles.title}>Gold Geçmişi</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={historyStyles.closeButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={historyStyles.closeText}>X</Text>
              </TouchableOpacity>
            </View>

            {/* Current balance card */}
            <View style={historyStyles.balanceCard}>
              <View style={historyStyles.balanceCoinLarge}>
                <Text style={historyStyles.balanceCoinLargeText}>G</Text>
              </View>
              <View>
                <Text style={historyStyles.balanceLabelText}>Mevcut Bakiye</Text>
                <Text style={historyStyles.balanceValueText}>{balance} Gold</Text>
              </View>
            </View>

            {/* Transaction list */}
            <FlatList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={(item) => item.id}
              contentContainerStyle={historyStyles.listContent}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              ListEmptyComponent={
                isLoading ? (
                  <View style={historyStyles.emptyContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  <View style={historyStyles.emptyContainer}>
                    <Text style={historyStyles.emptyText}>
                      Henüz Gold işlemi yok
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={
                isLoading && transactions.length > 0 ? (
                  <View style={historyStyles.footerLoader}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

// ─── Compact Display Styles ──────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.gold[500] + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    ...shadows.small,
  },
  coinIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.gold[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinText: {
    ...typography.captionSmall,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  balanceText: {
    ...typography.bodySmall,
    color: palette.gold[600],
    fontWeight: '700',
  },
});

// ─── History Modal Styles ────────────────────────────────────

const historyStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: layout.screenHeight * 0.8,
    paddingTop: spacing.md,
    ...shadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '700',
  },

  // Balance card
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: palette.gold[500] + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.gold[500] + '25',
  },
  balanceCoinLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.gold[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCoinLargeText: {
    ...typography.h4,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  balanceLabelText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  balanceValueText: {
    ...typography.h4,
    color: palette.gold[500],
    fontWeight: '700',
  },

  // Transaction list
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceBorder,
  },
  amountBadge: {
    minWidth: 56,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  amountText: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  transactionInfo: {
    flex: 1,
    gap: 2,
  },
  transactionDesc: {
    ...typography.bodySmall,
    color: colors.text,
  },
  transactionDate: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  balanceAfter: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Empty state
  emptyContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
