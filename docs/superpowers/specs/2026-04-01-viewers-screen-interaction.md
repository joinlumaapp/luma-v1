# Viewers Screen Interaction — Bottom Sheet & Premium Behavior

**Date:** 2026-04-01
**Screen:** ViewersPreviewScreen (Seni Kim Gordu)
**File:** `apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx`

## Problem Statement

1. Profile cards are clickable but only show a native `Alert.alert()` — no real interaction
2. No way to view profile details or take action from the viewers screen
3. Locked profiles have no curiosity-driven reveal animation
4. No shimmer effect on blurred avatars
5. The screen feels like a static list, not an interactive experience

## Solution: Bottom Sheet System

Replace `Alert.alert()` with two purpose-built bottom sheets that open on card tap. The grid layout, animations, badges, and empty state remain unchanged.

## Card States and Tap Behavior

### CLEAR (Premium user OR revealed via store)
- Tap → opens `ViewerDetailSheet`
- Shows: real photo, name, age, "X saat once profilini inceledi", shared interests
- CTAs: "Profili Gor" (navigate to ProfilePreview) + "Mesaj Gonder (5 jeton)" (jeton-based message)

### LOCKED (Free user, no reveal credits)
- Tap → brief reveal animation on card (opacity dip, 400ms) → opens `ViewerTeaserSheet`
- Shows: blurred photo with lock icon, "Birisi sana ilgi duyuyor", upgrade CTA
- CTAs: "Gold ile Ac" (navigate to MembershipPlans) + "Daha Sonra" (dismiss)

### REVEALED (Free user, used reveal credit via store)
- Same as CLEAR — opens `ViewerDetailSheet` with full info and CTAs

## ViewerDetailSheet

Bottom sheet for CLEAR/REVEALED cards. Shows profile info and action buttons.

```
+-------------------------------+
|         [Drag handle]         |
|                               |
|     (Profile photo 120x120)   |   Round, net photo
|                               |
|       Ayse, 24                |   Name + age
|    "3 saat once profilini     |   Activity text
|     inceledi"                 |
|                               |
|    [interest] [interest]      |   Shared interests pills (if any)
|    [interest]                 |
|                               |
|  [  Profili Gor            ]  |   Purple gradient, primary CTA
|  [  Mesaj Gonder  5 jeton  ]  |   Outline button, secondary CTA
|                               |
+-------------------------------+
```

### Props
```typescript
interface ViewerDetailSheetProps {
  visible: boolean;
  viewer: ProfileViewer | null;
  onDismiss: () => void;
  onViewProfile: (viewerId: string) => void;
  onSendMessage: (viewerId: string) => void;
}
```

### Behavior
- Photo: 120x120 rounded circle, loaded from viewer data (fallback: gradient + person icon)
- Name: from ProfileViewer data (requires backend to return firstName, age — see Data section)
- Activity text: reuses existing `getActivityText()` + `formatRelativeTime()`
- Shared interests: displayed as pills if available (requires backend to return `sharedInterests: string[]`)
- "Profili Gor" → calls `onViewProfile(viewer.viewerId)` → navigates to ProfilePreview
- "Mesaj Gonder" → calls `onSendMessage(viewer.viewerId)` → navigates to JetonMarket or direct message flow
- Jeton cost shown on button: "Mesaj Gonder 💰 5"
- Dismiss: drag down, backdrop tap, or Android back button

## ViewerTeaserSheet

Bottom sheet for LOCKED cards. Drives upgrade conversion.

```
+-------------------------------+
|         [Drag handle]         |
|                               |
|     (Blurred photo 120x120)   |   Round, heavy blur + lock icon overlay
|                               |
|   "Birisi sana ilgi duyuyor"  |   Title
|   "Kim oldugunu gormek icin   |   Subtitle
|    paketini yukselt"          |
|                               |
|   [  Gold ile Ac           ]  |   Purple gradient CTA
|   [Daha Sonra]                |   Dismiss text button
|                               |
+-------------------------------+
```

### Props
```typescript
interface ViewerTeaserSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade: () => void;
}
```

### Behavior
- Photo: 120x120 rounded, blurRadius 25, dark overlay + centered lock icon
- "Gold ile Ac" → calls `onUpgrade()` → navigates to MembershipPlans
- "Daha Sonra" → calls `onDismiss()`
- Dismiss: drag down, backdrop tap, or Android back button

## Locked Card Tap Reveal Animation

When a LOCKED card is tapped in the grid:
1. Card overlay opacity dips from current to 0.3 (150ms)
2. Returns to normal (150ms)
3. After 400ms total → ViewerTeaserSheet opens

This creates a brief "peek" feel before showing the paywall.

## Grid Card Shimmer

Add `ShimmerSweep` to LOCKED grid cards (same pattern as LikesYouScreen):
- Diagonal white light strip, left-to-right
- `translateX` animation, 3-second loop
- Opacity: 10% (subtle)
- Only on non-premium, non-revealed cards

## Bottom Sheet Animation

### Opening
- Backdrop: opacity 0 → 0.6 (200ms timing)
- Sheet: translateY from screenHeight → 0 (spring, tension: 100, friction: 12)
- Photo inside: scale 0.8 → 1 (spring, 300ms delay)

### Closing
- PanResponder: drag down gesture, if velocity > 0.5 or distance > 100 → dismiss
- Backdrop tap → dismiss
- Android back button → dismiss
- Sheet slides down + backdrop fades out (200ms)

## Data Requirements

The current `ProfileViewer` type has: `id, viewerId, viewedUserId, viewCount, firstViewedAt, lastViewedAt, distanceKm`.

For the bottom sheet to show name/age/photo/interests, the backend must return these fields. However, this spec is frontend-only. The bottom sheet will:
- Use `viewerId` as fallback display if name not available
- Show gradient placeholder if no photo URL
- Hide interests section if not provided
- The data enrichment is a separate backend task

For now, the mock data in `viewersStore.fetchViewers()` should be extended to include: `firstName`, `age`, `photoUrl`, `sharedInterests: string[]`.

## Implementation Scope

### Single file change: `ViewersPreviewScreen.tsx`

**New code:**
- `ViewerDetailSheet` component
- `ViewerTeaserSheet` component  
- `ShimmerSweep` component (copied pattern from LikesYouScreen)
- `ViewerGridCardShimmer` wrapper or inline shimmer in ViewerGridCard

**Modified code:**
- `handleCardPress` — remove Alert.alert(), add bottom sheet state management
- `ViewerGridCard` — add shimmer overlay for locked cards, add tap reveal animation
- `ViewersPreviewScreen` main component — add sheet state (selectedViewer, sheetType), render both sheets
- `viewersStore` mock data — add firstName, age, photoUrl, sharedInterests fields

**Preserved (no changes):**
- `EmptyState`, `GlowingOrb`, `FloatingCircle`
- `SummaryStats`, `TimelineCard`, `PremiumLockSection`
- Header, useEyeBlink, navigation structure
- Grid layout, badge system, entry animations
- `gridStyles` StyleSheet

**Removed:**
- `Alert.alert()` call in handleCardPress

## Success Criteria

- Tapping a CLEAR/REVEALED card opens ViewerDetailSheet with profile info and 2 CTAs
- Tapping a LOCKED card plays brief reveal animation then opens ViewerTeaserSheet
- Bottom sheets have smooth spring animations and drag-to-dismiss
- Shimmer effect visible on locked grid cards
- "Mesaj Gonder" shows jeton cost
- No native alerts remain
- Existing grid, animations, empty state all still work
