# Viewers Screen Interaction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bottom sheet interactions to the Viewers screen — detail sheet for clear/revealed cards, teaser sheet for locked cards, shimmer on locked grid cards, and remove native Alert.

**Architecture:** Extend `ProfileViewer` shared type with display fields (firstName, age, photoUrl, sharedInterests). Add two bottom sheet components (`ViewerDetailSheet`, `ViewerTeaserSheet`) to ViewersPreviewScreen using Modal + Animated + PanResponder. Add shimmer overlay to locked grid cards. Replace Alert.alert with bottom sheet state management.

**Tech Stack:** React Native Animated API, PanResponder, Modal, expo-linear-gradient, Ionicons, Zustand (viewersStore), @luma/shared types.

**Spec:** `docs/superpowers/specs/2026-04-01-viewers-screen-interaction.md`

---

## File Map

- **Modify:** `packages/shared/src/types/match.ts:60-68` — extend ProfileViewer with display fields
- **Modify:** `apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx` — add bottom sheets, shimmer, rewire handleCardPress

---

### Task 1: Extend ProfileViewer shared type

**Files:**
- Modify: `packages/shared/src/types/match.ts:60-68`

Add display fields that the bottom sheet needs to show viewer details.

- [ ] **Step 1: Extend ProfileViewer interface**

In `packages/shared/src/types/match.ts`, find:

```typescript
export interface ProfileViewer {
  id: string;
  viewerId: string;
  viewedUserId: string;
  viewCount: number;
  firstViewedAt: string;
  lastViewedAt: string;
  distanceKm: number | null;
}
```

Replace with:

```typescript
export interface ProfileViewer {
  id: string;
  viewerId: string;
  viewedUserId: string;
  viewCount: number;
  firstViewedAt: string;
  lastViewedAt: string;
  distanceKm: number | null;
  // Display fields for viewer detail sheet
  firstName: string | null;
  age: number | null;
  photoUrl: string | null;
  sharedInterests: string[];
}
```

- [ ] **Step 2: Verify no TypeScript errors in shared package**

Run: `cd packages/shared && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors (new fields are additive, existing consumers won't break since they don't destructure exhaustively).

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/match.ts
git commit -m "feat(shared): extend ProfileViewer with display fields for viewer detail sheet"
```

---

### Task 2: Add ShimmerSweep to locked grid cards

**Files:**
- Modify: `apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx`

Add a shimmer light sweep animation to locked cards in the viewer grid.

- [ ] **Step 1: Add ShimmerSweep component**

Insert after the `getBadge` function (after line 474) and before the `ViewerGridProps` interface (line 476):

```typescript
// ─── Shimmer Light Sweep (locked grid cards) ─────────────────

const ShimmerSweep: React.FC = () => {
  const translateX = useRef(new Animated.Value(-CARD_WIDTH)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: CARD_WIDTH * 2,
        duration: 3000,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [translateX]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: -20,
        width: CARD_WIDTH * 0.4,
        height: CARD_HEIGHT * 2.5,
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        transform: [{ translateX }, { rotate: '20deg' }],
      }}
      pointerEvents="none"
    />
  );
};
```

- [ ] **Step 2: Add shimmer to ViewerGridCard**

In the `ViewerGridCard` component, find the lock icon section:

```typescript
{/* Lock icon with pulse */}
{!isPremium && (
  <Animated.View style={[gridStyles.lockCircle, { transform: [{ scale: lockPulse }] }]}>
```

Insert the shimmer BEFORE the lock icon, inside the card `<View>`, after the dark overlay `</LinearGradient>`:

Find this section in ViewerGridCard (around line 598):
```typescript
          {/* Lock icon with pulse */}
          {!isPremium && (
```

Insert before it:
```typescript
          {/* Shimmer sweep on locked cards */}
          {!isPremium && <ShimmerSweep />}

```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx
git commit -m "feat(viewers): add shimmer sweep animation to locked grid cards"
```

---

### Task 3: Add ViewerDetailSheet component

**Files:**
- Modify: `apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx`

The bottom sheet for CLEAR/REVEALED cards showing profile info and action buttons.

- [ ] **Step 1: Add imports**

Add `Modal`, `PanResponder`, `Image` and `Dimensions` to the react-native import if not already present. Check the existing imports:

The file already imports `Animated`, `Pressable`, `View`, `Text`, `ScrollView`, `StyleSheet`, `Alert` from react-native. `Dimensions` is imported later at line 461.

Add `Modal`, `Image`, `PanResponder` to the main import (line 5-12):

Find:
```typescript
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
```

Replace with:
```typescript
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Modal,
  Image,
  PanResponder,
  Dimensions,
} from 'react-native';
```

Remove the standalone `import { Dimensions } from 'react-native';` at line 461 (now included above).

Also remove `Alert` from the import since we're replacing Alert.alert with bottom sheets.

- [ ] **Step 2: Add ViewerDetailSheet component and styles**

Insert after the `ViewerGrid` component (after line 549, before `ViewerGridCard`). Actually, better to insert after all grid components and before the main screen. Insert before `// ─── Main Screen ─` (line 745):

```typescript
// ─── Viewer Detail Bottom Sheet ────────────────────────────────

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ViewerDetailSheetProps {
  visible: boolean;
  viewer: ProfileViewer | null;
  onDismiss: () => void;
  onViewProfile: (viewerId: string) => void;
  onSendMessage: (viewerId: string) => void;
}

const ViewerDetailSheet: React.FC<ViewerDetailSheetProps> = ({
  visible, viewer, onDismiss, onViewProfile, onSendMessage,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const photoScale = useRef(new Animated.Value(0.8)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          dismissSheet();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0, tension: 100, friction: 12, useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      photoScale.setValue(0.8);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, tension: 100, friction: 12, useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.6, duration: 200, useNativeDriver: true,
        }),
      ]).start();
      // Delayed photo scale
      setTimeout(() => {
        Animated.spring(photoScale, {
          toValue: 1, tension: 120, friction: 10, useNativeDriver: true,
        }).start();
      }, 300);
    }
  }, [visible, slideAnim, backdropOpacity, photoScale]);

  const dismissSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }, [slideAnim, backdropOpacity, onDismiss]);

  if (!viewer) return null;

  const displayName = viewer.firstName
    ? `${viewer.firstName}${viewer.age ? `, ${viewer.age}` : ''}`
    : 'Birisi';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismissSheet}>
      {/* Backdrop */}
      <Animated.View
        style={[sheetStyles.backdrop, { opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[sheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={sheetStyles.dragHandle} />

        {/* Profile photo */}
        <Animated.View style={[sheetStyles.photoContainer, { transform: [{ scale: photoScale }] }]}>
          {viewer.photoUrl ? (
            <Image source={{ uri: viewer.photoUrl }} style={sheetStyles.photo} />
          ) : (
            <LinearGradient
              colors={[palette.purple[200], palette.pink[200]] as [string, string]}
              style={sheetStyles.photo}
            >
              <Ionicons name="person" size={48} color={palette.purple[400]} style={{ opacity: 0.6 }} />
            </LinearGradient>
          )}
        </Animated.View>

        {/* Name */}
        <Text style={sheetStyles.name}>{displayName}</Text>

        {/* Activity text */}
        <Text style={sheetStyles.activity}>
          {getActivityText(viewer.viewerId)} {'\u2022'} {formatRelativeTime(viewer.lastViewedAt)}
        </Text>

        {/* Repeat view count */}
        {viewer.viewCount > 1 && (
          <View style={sheetStyles.repeatBadge}>
            <Ionicons name="eye" size={12} color={palette.pink[400]} />
            <Text style={sheetStyles.repeatText}>Profiline {viewer.viewCount} kez baktı</Text>
          </View>
        )}

        {/* Shared interests */}
        {viewer.sharedInterests && viewer.sharedInterests.length > 0 && (
          <View style={sheetStyles.interestsRow}>
            {viewer.sharedInterests.map((interest, i) => (
              <View key={i} style={sheetStyles.interestPill}>
                <Text style={sheetStyles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}

        {/* CTAs */}
        <View style={sheetStyles.ctaContainer}>
          <Pressable
            onPress={() => onViewProfile(viewer.viewerId)}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[palette.purple[500], palette.pink[500]] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={sheetStyles.primaryCTA}
            >
              <Ionicons name="person-outline" size={18} color="#fff" />
              <Text style={sheetStyles.primaryCTAText}>Profili Gör</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => onSendMessage(viewer.viewerId)}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={sheetStyles.secondaryCTA}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
              <Text style={sheetStyles.secondaryCTAText}>Mesaj Gönder</Text>
              <View style={sheetStyles.jetonBadge}>
                <Text style={sheetStyles.jetonText}>{'💰'} 5</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
};
```

- [ ] **Step 3: Add sheet styles**

Insert a new StyleSheet after the existing `gridStyles` (after line 743) and before `// ─── Main Screen ─`:

```typescript
const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderBottomWidth: 0,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    marginTop: 12,
    marginBottom: 20,
  },
  photoContainer: {
    marginBottom: 16,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  activity: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.pink[500] + '12',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  repeatText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: palette.pink[400],
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  interestPill: {
    backgroundColor: colors.primary + '12',
    borderWidth: 1,
    borderColor: colors.primary + '25',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  interestText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.primary,
  },
  ctaContainer: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
  primaryCTAText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
  secondaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
  },
  secondaryCTAText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.primary,
  },
  jetonBadge: {
    backgroundColor: palette.gold[400] + '20',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  jetonText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: palette.gold[500],
  },
  // Teaser sheet specific
  teaserPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  teaserLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 16, 53, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  teaserTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  teaserSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  teaserDismiss: {
    marginTop: 8,
    paddingVertical: 8,
  },
  teaserDismissText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors (component exists but is not yet wired up).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx
git commit -m "feat(viewers): add ViewerDetailSheet bottom sheet component"
```

---

### Task 4: Add ViewerTeaserSheet component

**Files:**
- Modify: `apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx`

The teaser bottom sheet for LOCKED cards — blurred photo, lock icon, upgrade CTA.

- [ ] **Step 1: Add ViewerTeaserSheet component**

Insert right after `ViewerDetailSheet` (before the `sheetStyles` or before `// ─── Main Screen ─`):

```typescript
// ─── Viewer Teaser Bottom Sheet (locked cards) ─────────────────

interface ViewerTeaserSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade: () => void;
}

const ViewerTeaserSheet: React.FC<ViewerTeaserSheetProps> = ({
  visible, onDismiss, onUpgrade,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          dismissSheet();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0, tension: 100, friction: 12, useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, tension: 100, friction: 12, useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.6, duration: 200, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  const dismissSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }, [slideAnim, backdropOpacity, onDismiss]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismissSheet}>
      {/* Backdrop */}
      <Animated.View style={[sheetStyles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[sheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={sheetStyles.dragHandle} />

        {/* Blurred photo with lock */}
        <View style={sheetStyles.photoContainer}>
          <LinearGradient
            colors={[palette.purple[200], palette.pink[200]] as [string, string]}
            style={sheetStyles.teaserPhoto}
          >
            <Ionicons name="person" size={48} color={palette.purple[300]} style={{ opacity: 0.4 }} />
          </LinearGradient>
          <View style={sheetStyles.teaserLockOverlay}>
            <LinearGradient
              colors={[palette.purple[400], palette.pink[400]] as [string, string]}
              style={{ width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="lock-closed" size={20} color="#fff" />
            </LinearGradient>
          </View>
        </View>

        {/* Text */}
        <Text style={sheetStyles.teaserTitle}>Birisi sana ilgi duyuyor</Text>
        <Text style={sheetStyles.teaserSubtitle}>
          Kim olduğunu görmek için paketini yükselt
        </Text>

        {/* Upgrade CTA */}
        <View style={sheetStyles.ctaContainer}>
          <Pressable
            onPress={onUpgrade}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[palette.purple[500], palette.purple[700]] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={sheetStyles.primaryCTA}
            >
              <Ionicons name="diamond" size={18} color="#fff" />
              <Text style={sheetStyles.primaryCTAText}>Gold ile Aç</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Dismiss */}
        <Pressable onPress={dismissSheet} style={sheetStyles.teaserDismiss}>
          <Text style={sheetStyles.teaserDismissText}>Daha Sonra</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx
git commit -m "feat(viewers): add ViewerTeaserSheet bottom sheet for locked cards"
```

---

### Task 5: Wire up bottom sheets in main screen

**Files:**
- Modify: `apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx` (ViewersPreviewScreen component + ViewerGrid onPress)

Replace Alert.alert with bottom sheet state management.

- [ ] **Step 1: Add sheet state to ViewersPreviewScreen**

In the main `ViewersPreviewScreen` component, after the existing state declarations (after `const isPremium = ...` around line 755), add:

```typescript
const { revealViewer, isViewerRevealed } = useViewersStore();

// Bottom sheet state
const [selectedViewer, setSelectedViewer] = useState<ProfileViewer | null>(null);
const [showDetailSheet, setShowDetailSheet] = useState(false);
const [showTeaserSheet, setShowTeaserSheet] = useState(false);
```

- [ ] **Step 2: Replace handleCardPress**

Find the existing `handleCardPress`:

```typescript
const handleCardPress = useCallback(
  (item: ProfileViewer) => {
    if (isPremium) {
      navigation.navigate('ProfilePreview', { userId: item.viewerId });
      return;
    }
    Alert.alert(
      'Kim olduğunu gör',
      'Profiline kimlerin baktığını görmek için paketini yükselt.',
      [
        { text: 'Kapat', style: 'cancel' },
        { text: 'Paketi Yükselt', onPress: navigateUpgrade },
      ],
    );
  },
  [isPremium, navigation, navigateUpgrade],
);
```

Replace with:

```typescript
const handleCardPress = useCallback(
  (item: ProfileViewer) => {
    // Premium or revealed → show detail sheet
    if (isPremium || isViewerRevealed(item.viewerId)) {
      setSelectedViewer(item);
      setShowDetailSheet(true);
      return;
    }

    // Free user — try reveal via store
    const revealed = revealViewer(item.viewerId);
    if (revealed) {
      setSelectedViewer(item);
      setShowDetailSheet(true);
      return;
    }

    // No reveals left — show teaser sheet after brief delay (card handles animation)
    setTimeout(() => setShowTeaserSheet(true), 400);
  },
  [isPremium, isViewerRevealed, revealViewer],
);

const handleViewProfile = useCallback((viewerId: string) => {
  setShowDetailSheet(false);
  navigation.navigate('ProfilePreview', { userId: viewerId });
}, [navigation]);

const handleSendMessage = useCallback((viewerId: string) => {
  setShowDetailSheet(false);
  navigation.navigate('JetonMarket' as never);
}, [navigation]);

const handleDetailDismiss = useCallback(() => {
  setShowDetailSheet(false);
  setSelectedViewer(null);
}, []);

const handleTeaserDismiss = useCallback(() => {
  setShowTeaserSheet(false);
}, []);
```

- [ ] **Step 3: Update ViewerGrid onPress to always call onCardPress**

In the `ViewerGrid` component, find line 524:

```typescript
onPress={() => isPremium ? onCardPress(item) : onUpgrade()}
```

Replace with:

```typescript
onPress={() => onCardPress(item)}
```

The premium/free routing is now handled in `handleCardPress`, not in the grid.

- [ ] **Step 4: Render both sheets in the main component**

In the main return JSX, after the `</ScrollView>` closing tag (around line 819) and before the closing `</View>`, add:

```typescript
      {/* Viewer Detail Sheet */}
      <ViewerDetailSheet
        visible={showDetailSheet}
        viewer={selectedViewer}
        onDismiss={handleDetailDismiss}
        onViewProfile={handleViewProfile}
        onSendMessage={handleSendMessage}
      />

      {/* Viewer Teaser Sheet */}
      <ViewerTeaserSheet
        visible={showTeaserSheet}
        onDismiss={handleTeaserDismiss}
        onUpgrade={() => {
          setShowTeaserSheet(false);
          navigateUpgrade();
        }}
      />
```

- [ ] **Step 5: Remove Alert import**

The `Alert` import should already be removed in Task 3. Verify it's gone. If still present, remove it from the react-native import.

- [ ] **Step 6: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx
git commit -m "feat(viewers): wire up bottom sheets — replace Alert with detail/teaser sheets"
```

---

### Task 6: Add locked card tap reveal animation

**Files:**
- Modify: `apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx` (ViewerGridCard)

Add a brief opacity dip when a locked card is tapped, before the teaser sheet opens.

- [ ] **Step 1: Update ViewerGridCard to handle tap reveal**

In `ViewerGridCard`, add an overlay opacity animation. Find the component definition and add a new ref and handler:

After the `entryAnim` ref declaration, add:

```typescript
const tapRevealAnim = useRef(new Animated.Value(0)).current;
```

Replace the `onPress` handler on the Pressable. Find:

```typescript
<Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
```

Replace with:

```typescript
<Pressable
  onPress={() => {
    if (!isPremium) {
      // Brief reveal animation — dip overlay, then call onPress
      Animated.sequence([
        Animated.timing(tapRevealAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(tapRevealAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
    onPress();
  }}
  style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
>
```

Then add an animated overlay inside the card, after the dark overlay LinearGradient and before the shimmer:

Find `{/* Shimmer sweep on locked cards */}` and insert before it:

```typescript
          {/* Tap reveal flash */}
          {!isPremium && (
            <Animated.View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'rgba(255,255,255,0.15)',
                opacity: tapRevealAnim,
              }}
              pointerEvents="none"
            />
          )}

```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx
git commit -m "feat(viewers): add locked card tap reveal animation"
```

---

### Task 7: Clean up and final verification

**Files:**
- Modify: `apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx`

- [ ] **Step 1: Remove unused Alert import**

Search the file for `Alert` — it should not appear anywhere after the bottom sheet replacement. If it's still imported, remove it.

- [ ] **Step 2: Check for unused imports and variables**

Grep for `teaserTapped` — this was in the old TimelineCard component. If TimelineCard is no longer rendered (the main screen now uses ViewerGrid), it may be dead code. However, TimelineCard is still defined — it's just not currently rendered in the main component. Leave it for now since it's a separate component that could be reused.

- [ ] **Step 3: Verify the file compiles cleanly**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in ViewersPreviewScreen.

- [ ] **Step 4: Verify animation cleanup**

Check all `Animated.loop` calls have cleanup returns:
- ShimmerSweep: has `return () => animation.stop()` ✓
- ViewerGrid lockPulse: currently does NOT have cleanup — add it:

Find in ViewerGrid:
```typescript
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(lockPulse, { toValue: 1.15, duration: 1800, useNativeDriver: true }),
        Animated.timing(lockPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();
  }, [lockPulse]);
```

Replace with:
```typescript
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(lockPulse, { toValue: 1.15, duration: 1800, useNativeDriver: true }),
        Animated.timing(lockPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [lockPulse]);
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx
git commit -m "refactor(viewers): cleanup — fix animation lifecycle, remove unused imports"
```
