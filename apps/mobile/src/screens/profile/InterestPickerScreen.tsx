import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfileStore } from '../../stores/profileStore';
import { INTEREST_CATEGORIES, MAX_INTEREST_SELECTIONS, INTEREST_CATEGORY_PREVIEW_COUNT } from '../../constants/config';
import { colors } from '../../theme/colors';
import { BrandedBackground } from '../../components/common/BrandedBackground';

export const InterestPickerScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const currentTags = useProfileStore((s) => s.profile.interestTags);
  const setInterestTags = useProfileStore((s) => s.setInterestTags);

  const [selected, setSelected] = useState<Set<string>>(new Set(currentTags));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((label: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else if (next.size < MAX_INTEREST_SELECTIONS) {
        next.add(label);
      }
      return next;
    });
  }, []);

  const toggleExpand = useCallback((title: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    setInterestTags(Array.from(selected));
    navigation.goBack();
  }, [selected, setInterestTags, navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BrandedBackground />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ilgi alanlari</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Categories */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {INTEREST_CATEGORIES.map((cat) => {
          const isExpanded = expandedCategories.has(cat.title);
          const visibleItems = isExpanded ? cat.items : cat.items.slice(0, INTEREST_CATEGORY_PREVIEW_COUNT);
          const hasMore = cat.items.length > INTEREST_CATEGORY_PREVIEW_COUNT;

          return (
            <View key={cat.title} style={styles.categoryCard}>
              <Text style={styles.categoryTitle}>{cat.title}</Text>
              <View style={styles.chipsWrap}>
                {visibleItems.map((item) => {
                  const isSelected = selected.has(item.label);
                  return (
                    <TouchableOpacity
                      key={item.label}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleItem(item.label)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.chipEmoji}>{item.emoji}</Text>
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {hasMore && (
                <TouchableOpacity onPress={() => toggleExpand(cat.title)} style={styles.showMoreBtn}>
                  <Text style={styles.showMoreText}>
                    {isExpanded ? 'Daha az goster' : 'Daha fazla goster'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom save button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveText}>Kaydet {selected.size}/{MAX_INTEREST_SELECTIONS}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  categoryCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    borderRadius: 16, padding: 16, marginBottom: 12,
  },
  categoryTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: colors.text, marginBottom: 12 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 24, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.surfaceBorder,
  },
  chipSelected: { backgroundColor: '#E0F2FE', borderColor: '#93C5FD' },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: 14, fontFamily: 'Poppins_500Medium', fontWeight: '500', color: colors.text },
  chipTextSelected: { color: '#1E40AF' },
  showMoreBtn: { alignItems: 'center', marginTop: 12 },
  showMoreText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: colors.text },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: colors.background,
  },
  saveButton: {
    backgroundColor: '#B8E4F0', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  saveText: { fontSize: 16, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: colors.text },
});
