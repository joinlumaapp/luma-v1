# Likes Screen Progressive Reveal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the LikesYouScreen cards with a tier-based progressive reveal system — 3 card states (clear/teaser/locked), new card layout, shimmer/glow animations, and tap-reveal interactions.

**Architecture:** Single-file refactor of `LikesYouScreen.tsx`. Replace the binary `isBlurred` system with a 3-state `cardState` system driven by `getCardState(tier, index, total, isRevealed)`. Add `ShimmerSweep` and `TeaserLock` sub-components. Restructure card layout to separate badge (top) from distance+compat (bottom).

**Tech Stack:** React Native Animated API, expo-linear-gradient, Ionicons, existing theme system (colors, spacing, borderRadius, palette).

**Spec:** `docs/superpowers/specs/2026-04-01-likes-screen-progressive-reveal.md`

---

## File Map

All changes are in a single file:

- **Modify:** `apps/mobile/src/screens/discovery/LikesYouScreen.tsx`
  - Add `CardState` type and `getCardState()` function (top of file, after helpers)
  - Add `ShimmerSweep` component (new sub-component)
  - Add `TeaserLock` component (new sub-component)
  - Rewrite `LikeCard` component (new props, 3-state rendering, new layout)
  - Update `LikeCardProps` interface (`cardState` replaces `isBlurred`)
  - Update `renderItem` in main screen (compute `cardState` instead of `cardBlurred`)
  - Update `handleCardPress` (add reveal animation delay for teaser/locked)
  - Update styles (new glow, shimmer, layout styles; remove obsolete styles)

No new files created. No other files modified.

---

### Task 1: Add `getCardState` utility function

**Files:**
- Modify: `apps/mobile/src/screens/discovery/LikesYouScreen.tsx:56-67` (after `getCompatColor`, before `getSmartLabel`)

This function determines whether a card is clear, teaser, or locked based on the user's tier, card index, total cards, and reveal status.

- [ ] **Step 1: Add the CardState type and getCardState function**

Insert after the `getCompatColor` function (line 67) and before `getSmartLabel` (line 70):

```typescript
// Card visibility state for progressive reveal
type CardState = 'clear' | 'teaser' | 'locked';

const getCardState = (
  tier: PackageTier,
  index: number,
  totalCards: number,
  isCardRevealed: boolean,
): CardState => {
  // Already revealed via store → always clear
  if (isCardRevealed) return 'clear';

  switch (tier) {
    case 'FREE':
      if (index < 2) return 'clear';
      if (index < 5) return 'teaser';
      return 'locked';

    case 'GOLD': {
      const clearCount = Math.ceil(totalCards * 0.75);
      const teaserCount = Math.ceil(totalCards * 0.15);
      if (index < clearCount) return 'clear';
      if (index < clearCount + teaserCount) return 'teaser';
      return 'locked';
    }

    case 'PRO':
    case 'RESERVED':
      return 'clear';

    default:
      return 'locked';
  }
};
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `getCardState` or `CardState`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/discovery/LikesYouScreen.tsx
git commit -m "feat(likes): add getCardState utility for progressive reveal"
```

---

### Task 2: Add `ShimmerSweep` animation component

**Files:**
- Modify: `apps/mobile/src/screens/discovery/LikesYouScreen.tsx` (insert after `AnimatedLock` component, ~line 272)

A diagonal light sweep that loops infinitely on LOCKED cards.

- [ ] **Step 1: Add ShimmerSweep component**

Insert after the closing of `AnimatedLock` (after line 272):

```typescript
// ─── Shimmer Light Sweep (LOCKED cards) ──────────────────────

const ShimmerSweep: React.FC = () => {
  const translateX = useRef(new Animated.Value(-CARD_SIZE)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: CARD_SIZE * 2,
        duration: 3000,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [translateX]);

  return (
    <Animated.View
      style={[
        styles.shimmerSweep,
        { transform: [{ translateX }, { rotate: '20deg' }] },
      ]}
      pointerEvents="none"
    />
  );
};
```

- [ ] **Step 2: Add shimmerSweep style**

Add to the StyleSheet (in the blur overlay styles section, after `lockGradientCircle`):

```typescript
shimmerSweep: {
  position: 'absolute',
  top: -20,
  width: CARD_SIZE * 0.4,
  height: CARD_SIZE * 2.5,
  backgroundColor: 'rgba(255, 255, 255, 0.10)',
},
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/discovery/LikesYouScreen.tsx
git commit -m "feat(likes): add ShimmerSweep animation component for locked cards"
```

---

### Task 3: Add `TeaserLock` component

**Files:**
- Modify: `apps/mobile/src/screens/discovery/LikesYouScreen.tsx` (insert after `ShimmerSweep`)

A smaller, semi-transparent lock icon for TEASER cards.

- [ ] **Step 1: Add TeaserLock component**

Insert after `ShimmerSweep`:

```typescript
// ─── Teaser Lock (smaller, semi-transparent) ─────────────────

const TeaserLock: React.FC = () => (
  <View style={styles.teaserLockContainer}>
    <LinearGradient
      colors={[palette.purple[400], palette.pink[400]]}
      style={styles.teaserLockCircle}
    >
      <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.9)" />
    </LinearGradient>
  </View>
);
```

- [ ] **Step 2: Add TeaserLock styles**

Add to the StyleSheet:

```typescript
teaserLockContainer: {
  ...StyleSheet.absoluteFillObject,
  justifyContent: 'center',
  alignItems: 'center',
  opacity: 0.6,
},
teaserLockCircle: {
  width: 30,
  height: 30,
  borderRadius: 15,
  justifyContent: 'center',
  alignItems: 'center',
  ...Platform.select({
    ios: {
      shadowColor: palette.purple[500],
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
  }),
},
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/discovery/LikesYouScreen.tsx
git commit -m "feat(likes): add TeaserLock component for teaser cards"
```

---

### Task 4: Rewrite `LikeCard` with 3-state rendering and new layout

**Files:**
- Modify: `apps/mobile/src/screens/discovery/LikesYouScreen.tsx:274-497` (full LikeCard replacement)

This is the core change. Replace the binary `isBlurred` card with a 3-state card that uses the new layout (badge top, name middle, distance+compat bottom).

- [ ] **Step 1: Replace LikeCardProps interface and full LikeCard component**

Replace from line 274 (`// ─── Like card`) through line 499 (`LikeCard.displayName`) with:

```typescript
// ─── Like card — 3-state progressive reveal ─────────────────

interface LikeCardProps {
  card: LikeYouCard;
  index: number;
  cardState: CardState;
  smartLabel: string | null;
  onCardPress: (userId: string, cardState: CardState) => void;
}

const LikeCard = memo<LikeCardProps>(({ card, index, cardState, smartLabel, onCardPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const blurRevealAnim = useRef(new Animated.Value(0)).current;
  const badgeBounce = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.15)).current;

  const isLocked = cardState === 'locked';
  const isTeaser = cardState === 'teaser';
  const isClear = cardState === 'clear';

  // Smart label bounce on mount
  useEffect(() => {
    if (!smartLabel) return;
    Animated.sequence([
      Animated.delay(index * 80 + 300),
      Animated.spring(badgeBounce, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [badgeBounce, smartLabel, index]);

  // Pulsing glow for LOCKED cards
  useEffect(() => {
    if (!isLocked) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.35, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.15, duration: 1000, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [glowAnim, isLocked]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 200, friction: 10, useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    if (isClear) {
      onCardPress(card.userId, cardState);
      return;
    }
    // Tap reveal animation — blur reduces briefly before modal
    Animated.spring(blurRevealAnim, {
      toValue: 1,
      tension: 150,
      friction: 8,
      useNativeDriver: true,
    }).start();
    // Scale bounce on reveal
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.02, tension: 200, friction: 10, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
    ]).start();
    // Delay before modal
    setTimeout(() => {
      blurRevealAnim.setValue(0);
      onCardPress(card.userId, cardState);
    }, 500);
  }, [card.userId, cardState, isClear, onCardPress, blurRevealAnim, scaleAnim]);

  const compatColor = getCompatColor(card.compatibilityPercent);

  const badgeScale = badgeBounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  // Blur radius based on card state — reduces on tap reveal
  const blurRadius = isClear ? 0 : isTeaser ? 15 : 28;
  // blurRevealAnim can't drive blurRadius (not animatable), so we use overlay opacity
  const revealOverlayOpacity = blurRevealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isTeaser ? 0.15 : 0.35, 0.05],
  });

  // Entry delay — locked cards arrive slightly later
  const entryDelay = index * 60 + (isLocked ? 100 : 0);

  return (
    <SlideIn direction="up" delay={entryDelay} distance={20}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={
          isClear
            ? `${card.firstName}, ${card.age} yaşında, yüzde ${card.compatibilityPercent} uyum`
            : 'Profili görmek için kilidi aç'
        }
        accessibilityRole="button"
      >
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }] },
            // Glow border intensity by state
            !isClear && Platform.OS === 'ios' && {
              shadowColor: palette.purple[400],
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: isLocked ? 12 : 8,
            },
          ]}
          testID={`likes-you-card-${card.userId}`}
        >
          {/* Animated glow opacity wrapper for LOCKED pulsing */}
          {isLocked && Platform.OS === 'ios' && (
            <Animated.View
              style={[StyleSheet.absoluteFillObject, { opacity: glowAnim }]}
              pointerEvents="none"
            />
          )}

          {/* Photo */}
          {card.photoUrl ? (
            <Image
              source={{ uri: card.photoUrl }}
              style={styles.cardPhoto}
              blurRadius={blurRadius}
            />
          ) : (
            <LinearGradient
              colors={[palette.purple[200], palette.pink[200]]}
              style={styles.cardPhoto}
            >
              <Ionicons name="person" size={40} color={palette.purple[400]} style={{ opacity: 0.5 }} />
            </LinearGradient>
          )}

          {/* Dark overlay for teaser/locked — animates on tap */}
          {!isClear && (
            <Animated.View
              style={[
                styles.blurOverlay,
                { opacity: revealOverlayOpacity },
              ]}
            />
          )}

          {/* Lock icons */}
          {isLocked && (
            <View style={styles.lockPositioner}>
              <AnimatedLock index={index} />
            </View>
          )}
          {isTeaser && <TeaserLock />}

          {/* Shimmer sweep — LOCKED only */}
          {isLocked && <ShimmerSweep />}

          {/* Super compatible dashed border hint */}
          {!isClear && card.compatibilityPercent >= SUPER_COMPATIBLE_THRESHOLD && (
            <View style={styles.superCompatBorder} pointerEvents="none" />
          )}

          {/* Smart label badge — top left */}
          {smartLabel && (
            <Animated.View style={[styles.smartLabelContainer, { transform: [{ scale: badgeScale }] }]}>
              <LinearGradient
                colors={[palette.purple[500] + 'E0', palette.pink[500] + 'E0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.smartLabelGradient}
              >
                <Text style={styles.smartLabelText}>{smartLabel}</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Bottom info overlay — new layout */}
          <LinearGradient
            colors={['transparent', 'rgba(8, 8, 15, 0.50)', 'rgba(8, 8, 15, 0.92)']}
            locations={[0, 0.2, 1]}
            style={styles.cardInfoOverlay}
          >
            {/* Name + Age */}
            <Text style={styles.cardName} numberOfLines={1}>
              {isClear ? `${card.firstName}, ${card.age}` : '???, ??'}
            </Text>

            {/* Distance — separate line */}
            {card.distanceKm != null && (
              <View style={styles.distanceRow}>
                <Text style={styles.distanceEmoji}>{'📍'}</Text>
                <Text style={styles.distanceText}>{formatDistance(card.distanceKm)}</Text>
              </View>
            )}

            {/* Compatibility points — color coded */}
            <View style={[styles.compatPill, { backgroundColor: compatColor + '20', borderColor: compatColor + '35' }]}>
              <Text style={[styles.compatPillText, { color: compatColor }]}>
                %{card.compatibilityPercent} uyum
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </SlideIn>
  );
}, (prev, next) => (
  prev.card.userId === next.card.userId &&
  prev.cardState === next.cardState &&
  prev.index === next.index &&
  prev.smartLabel === next.smartLabel &&
  prev.card.compatibilityPercent === next.card.compatibilityPercent
));

LikeCard.displayName = 'LikeCard';
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Errors only from `renderItem` still passing old props (fixed in next task).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/discovery/LikesYouScreen.tsx
git commit -m "feat(likes): rewrite LikeCard with 3-state progressive reveal and new layout"
```

---

### Task 5: Update `renderItem` and `handleCardPress` in main screen

**Files:**
- Modify: `apps/mobile/src/screens/discovery/LikesYouScreen.tsx` (inside `LikesYouScreen` component)

Wire up the new `cardState` system and add reveal delay logic to `handleCardPress`.

- [ ] **Step 1: Update the `isBlurred` variable**

Find and replace the line (around line 515):
```typescript
const isBlurred = packageTier === 'FREE';
```

Replace with:
```typescript
// Progressive reveal uses cardState per-card instead of binary isBlurred
const isFreeUser = packageTier === 'FREE';
```

- [ ] **Step 2: Update `handleCardPress` to accept `cardState` and handle reveal delay**

Replace the entire `handleCardPress` callback with:

```typescript
const handleCardPress = useCallback((userId: string, cardState: CardState) => {
  // Already revealed via likesRevealStore or locally unlocked — go straight to profile
  if (isRevealed(userId) || unlockedUserIds.has(userId)) {
    navigation.navigate('ProfilePreview', { userId });
    return;
  }

  // CLEAR cards — direct navigation
  if (cardState === 'clear') {
    if (!isUnlimitedViews && viewedToday >= dailyLimit) {
      setShowUpgradePrompt(true);
      return;
    }
    if (!isUnlimitedViews) {
      setViewedToday((prev) => prev + 1);
      setUnlockedUserIds((prev) => new Set(prev).add(userId));
    }
    navigation.navigate('ProfilePreview', { userId });
    return;
  }

  // TEASER / LOCKED — try reveal via store, else show modal
  // The tap reveal animation (blur reduction) is handled inside LikeCard.
  // This callback fires after the 500ms delay.
  const success = revealProfile(userId);
  if (success) {
    setUnlockedUserIds((prev) => new Set(prev).add(userId));
    navigation.navigate('ProfilePreview', { userId });
    return;
  }

  // Reveal limit reached — show unlock modal
  const card = likes.find((l) => l.userId === userId);
  if (card) {
    setModalCard(card);
    setShowModal(true);
  } else {
    navigation.navigate('JetonMarket' as never);
  }
}, [navigation, isUnlimitedViews, viewedToday, dailyLimit, unlockedUserIds, likes, isRevealed, revealProfile]);
```

- [ ] **Step 3: Update `renderItem` to compute and pass `cardState`**

Replace the `renderItem` callback with:

```typescript
const renderItem = useCallback(
  ({ item, index }: { item: LikeYouCard; index: number }) => {
    const isUnlocked = unlockedUserIds.has(item.userId) || isRevealed(item.userId);
    const cardState = getCardState(packageTier, index, likes.length, isUnlocked);
    return (
      <LikeCard
        card={item}
        index={index}
        cardState={cardState}
        smartLabel={smartLabelsMap.get(item.userId) ?? null}
        onCardPress={handleCardPress}
      />
    );
  },
  [packageTier, likes.length, unlockedUserIds, handleCardPress, smartLabelsMap, isRevealed],
);
```

- [ ] **Step 4: Remove stale `isBlurred` references**

Search for any remaining `isBlurred` references in the file. The `renderHeader` callback uses `isBlurred` — update it:

Find:
```typescript
if (!isBlurred || total === 0) return null;
```
Replace with:
```typescript
if (!isFreeUser || total === 0) return null;
```

Also in the header JSX, find:
```typescript
}, [total, isBlurred, handleUpgradePress]);
```
Replace with:
```typescript
}, [total, isFreeUser, handleUpgradePress]);
```

- [ ] **Step 5: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/discovery/LikesYouScreen.tsx
git commit -m "feat(likes): wire up progressive reveal in renderItem and handleCardPress"
```

---

### Task 6: Update styles — new layout, glow, shimmer, cleanup

**Files:**
- Modify: `apps/mobile/src/screens/discovery/LikesYouScreen.tsx` (StyleSheet section)

Add new styles for the redesigned card layout and remove obsolete ones.

- [ ] **Step 1: Update card style with enhanced glow border**

Find the `card` style and replace:

```typescript
card: {
  width: CARD_SIZE,
  height: CARD_SIZE * 1.45,
  borderRadius: borderRadius.lg + 4,
  backgroundColor: colors.surface,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: palette.purple[500] + '20',
  ...Platform.select({
    ios: {
      shadowColor: palette.purple[400],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
    },
    android: { elevation: 5 },
  }),
},
```

- [ ] **Step 2: Add new bottom layout styles**

Add these new styles for the redesigned card bottom section:

```typescript
// ── Distance row ──
distanceRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 2,
  marginTop: 3,
},
distanceEmoji: {
  fontSize: 8,
  lineHeight: 12,
},
distanceText: {
  fontSize: 9,
  lineHeight: 13,
  color: 'rgba(255, 255, 255, 0.85)',
  fontFamily: 'Poppins_500Medium',
  fontWeight: '500',
  letterSpacing: 0.1,
},
// ── Compatibility pill (bottom) ──
compatPill: {
  alignSelf: 'flex-start',
  borderRadius: borderRadius.full,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderWidth: 1,
  marginTop: 4,
},
compatPillText: {
  fontSize: 8,
  fontFamily: 'Poppins_600SemiBold',
  fontWeight: '600',
  letterSpacing: 0.2,
},
// ── Super compatible border hint ──
superCompatBorder: {
  ...StyleSheet.absoluteFillObject,
  borderColor: 'rgba(251, 191, 36, 0.3)',
  borderWidth: 1,
  borderStyle: 'dashed' as const,
  borderRadius: borderRadius.lg + 4,
},
```

- [ ] **Step 3: Remove obsolete styles**

Remove these style definitions that are no longer used:

- `compatBadge` — compat moved to bottom pill
- `compatBadgeText` — replaced by `compatPillText`
- `commentBadge` — comment indicator removed from card (stays in modal)
- `hintsRow` — replaced by separate distance/compat rows
- `hintChip` — replaced by distanceRow and compatPill
- `hintText` — replaced by distanceText and compatPillText
- `cardComment` — removed from card layout

- [ ] **Step 4: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/discovery/LikesYouScreen.tsx
git commit -m "feat(likes): update styles for progressive reveal card layout"
```

---

### Task 7: Clean up removed code and final polish

**Files:**
- Modify: `apps/mobile/src/screens/discovery/LikesYouScreen.tsx`

Remove any dead code left from the old system and ensure everything is clean.

- [ ] **Step 1: Remove unused imports if any**

Check if `TouchableOpacity` is still used (it's in the footer). If the footer still uses it, keep it. Otherwise remove from imports.

- [ ] **Step 2: Remove any remaining `isBlurred` references**

Search the file for `isBlurred` — there should be zero references. If any remain, update them to use `isFreeUser` or `cardState` as appropriate.

- [ ] **Step 3: Remove the `!isBlurred && card.comment` conditional from LikeCard**

This was in the old LikeCard. Verify it's gone in the new version (it should be since we replaced the entire component). Comments are only shown in the UnlockModal now.

- [ ] **Step 4: Verify the file compiles cleanly**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/discovery/LikesYouScreen.tsx
git commit -m "refactor(likes): clean up dead code from progressive reveal migration"
```

---

### Task 8: Manual visual verification

This task has no code changes — it's a verification checkpoint.

- [ ] **Step 1: Verify card state distribution**

Mentally trace through `getCardState` for each tier:
- FREE with 10 cards: cards 0-1 clear, 2-4 teaser, 5-9 locked ✓
- GOLD with 10 cards: cards 0-7 clear (ceil 7.5=8), 8 teaser (ceil 1.5=2), 9 locked ✓
- PRO with any count: all clear ✓

- [ ] **Step 2: Verify animation lifecycle**

Check that all `Animated.loop` calls have cleanup returns in their `useEffect`:
- `ShimmerSweep`: ✓ (cleanup in useEffect return)
- `AnimatedLock`: ✓ (existing cleanup)
- `LikeCard` glowAnim: ✓ (cleanup in useEffect return)

- [ ] **Step 3: Verify memo comparison function**

The new memo comparator uses `cardState` instead of `isBlurred`. Confirm it covers all props that affect rendering:
- `card.userId`, `cardState`, `index`, `smartLabel`, `card.compatibilityPercent` ✓

- [ ] **Step 4: Final commit — tag completion**

```bash
git add -A
git commit -m "feat(likes): progressive reveal redesign complete — tier-based cards, shimmer, glow, new layout"
```
