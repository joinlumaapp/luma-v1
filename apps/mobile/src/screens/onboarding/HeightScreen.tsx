// Onboarding step 4/8: Height selection with scroll picker

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import {
  OnboardingLayout,
  ArrowButton,
  onboardingColors,
} from '../../components/onboarding/OnboardingLayout';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'Height'>;

const MIN_HEIGHT = 140;
const MAX_HEIGHT = 220;
const DEFAULT_HEIGHT = 170;
const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// Generate height values array
const HEIGHT_VALUES: number[] = [];
for (let i = MIN_HEIGHT; i <= MAX_HEIGHT; i++) {
  HEIGHT_VALUES.push(i);
}

function cmToFeetInches(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

interface HeightItemProps {
  cm: number;
  isCenter: boolean;
}

const HeightItem: React.FC<HeightItemProps> = React.memo(({ cm, isCenter }) => (
  <View style={styles.itemRow}>
    <Text
      style={[
        styles.itemText,
        isCenter && styles.itemTextCenter,
        !isCenter && styles.itemTextFaded,
      ]}
    >
      {cm} cm ({cmToFeetInches(cm)})
    </Text>
  </View>
));

HeightItem.displayName = 'HeightItem';

export const HeightScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const setField = useProfileStore((state) => state.setField);
  const storedHeight = useProfileStore((state) => state.profile.height);
  const initialHeight = storedHeight && storedHeight >= MIN_HEIGHT && storedHeight <= MAX_HEIGHT
    ? storedHeight : DEFAULT_HEIGHT;
  const [selectedHeight, setSelectedHeight] = useState<number>(initialHeight);
  const flatListRef = useRef<FlatList<number>>(null);
  const defaultIndex = initialHeight - MIN_HEIGHT;

  const handleContinue = useCallback(() => {
    setField('height', selectedHeight);
    navigation.navigate('Sports');
  }, [selectedHeight, setField, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('Sports');
  }, [navigation]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, HEIGHT_VALUES.length - 1));
      const value = HEIGHT_VALUES[clampedIndex];
      if (value !== undefined) {
        setSelectedHeight(value);
        // Snap to exact position
        flatListRef.current?.scrollToOffset({
          offset: clampedIndex * ITEM_HEIGHT,
          animated: true,
        });
      }
    },
    [],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<number> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: number }) => (
      <HeightItem cm={item} isCenter={item === selectedHeight} />
    ),
    [selectedHeight],
  );

  const keyExtractor = useCallback((item: number) => item.toString(), []);

  // Padding to allow first/last items to be centered
  const verticalPadding = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

  return (
    <OnboardingLayout
      step={5}
      totalSteps={12}
      showBack
      showSkip
      onSkip={handleSkip}
      footer={<ArrowButton onPress={handleContinue} />}
    >
      <Text style={styles.title}>Boyun kaç?</Text>
      <Text style={styles.subtitle}>
        Cevabını istediğin zaman değiştirebilir veya silebilirsin.
      </Text>

      <View style={styles.pickerContainer}>
        {/* Top separator line */}
        <View style={[styles.separatorLine, { top: verticalPadding }]} />
        {/* Bottom separator line */}
        <View style={[styles.separatorLine, { top: verticalPadding + ITEM_HEIGHT }]} />

        <FlatList<number>
          ref={flatListRef}
          data={HEIGHT_VALUES}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          bounces={false}
          initialScrollIndex={defaultIndex}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          accessibilityLabel={`Boy seçici, seçili: ${selectedHeight} cm`}
          accessibilityRole="adjustable"
          contentContainerStyle={{
            paddingTop: verticalPadding,
            paddingBottom: verticalPadding,
          }}
          style={{ height: PICKER_HEIGHT }}
        />
      </View>

      <View style={styles.selectedDisplay}>
        <Text style={styles.selectedValue}>{selectedHeight} cm</Text>
        <Text style={styles.selectedConversion}>
          {cmToFeetInches(selectedHeight)}
        </Text>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    color: onboardingColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: onboardingColors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  pickerContainer: {
    backgroundColor: onboardingColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  separatorLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: onboardingColors.surfaceBorder,
    zIndex: 1,
  },
  itemRow: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    color: onboardingColors.textSecondary,
    fontFamily: 'Poppins_500Medium',
  },
  itemTextCenter: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: onboardingColors.text,
  },
  itemTextFaded: {
    opacity: 0.4,
  },
  selectedDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  selectedValue: {
    fontSize: 32,
    fontFamily: 'Poppins_600SemiBold',
    color: onboardingColors.text,
  },
  selectedConversion: {
    fontSize: 18,
    fontFamily: 'Poppins_500Medium',
    color: onboardingColors.textSecondary,
  },
});
