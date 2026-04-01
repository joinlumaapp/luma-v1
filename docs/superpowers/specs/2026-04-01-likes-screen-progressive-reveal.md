# Likes Screen — Progressive Reveal Redesign

**Date:** 2026-04-01
**Screen:** LikesYouScreen (Beğenenler)
**File:** `apps/mobile/src/screens/discovery/LikesYouScreen.tsx`

## Problem Statement

1. Profiles are fully visible for Gold+ users — no curiosity or upsell feeling
2. "Sana yakın" badge overlaps with distance info in the same area
3. Cards lack premium feel — no glow, no shimmer, no alive interactions
4. Binary blur system (blurred vs clear) doesn't support tiered monetization

## Solution: Progressive Reveal

Cards appear in 3 states based on user tier + grid position. Users always see some profiles clearly, but scroll reveals increasingly locked cards — creating a natural curiosity gradient.

## Card States

### CLEAR
- Photo: full resolution, no blur
- Name: visible ("Ayşe, 24")
- Tap: navigates directly to ProfilePreview
- Border: subtle static purple glow

### TEASER
- Photo: 40-50% blur
- Name: hidden ("???, ??")
- Lock: small AnimatedLock at 60% opacity
- Border: static medium purple glow
- Tap: blur animates from 40% → 25% (spring 300ms), then UnlockModal after 500ms

### LOCKED
- Photo: 75-85% blur
- Name: hidden ("???, ??")
- Lock: full AnimatedLock (pulse + glow aura + progress ring)
- Dark gradient overlay
- Shimmer light sweep animation (3s loop)
- Border: pulsing purple-pink glow (opacity 0.15 ↔ 0.35, 2s loop)
- Tap: blur animates from 80% → 60% (spring 300ms), then UnlockModal after 500ms

## Tier Distribution

| Tier | CLEAR | TEASER | LOCKED |
|------|-------|--------|--------|
| FREE | First 2 cards | Cards 3-5 | Cards 6+ |
| GOLD | First 75% | Next 15% | Last 10% |
| PRO | All cards | — | — |
| RESERVED | All cards + extra insights | — | — |

## Card Layout Structure

```
┌─────────────────────┐
│ [Badge pill]        │  Top-left: "Sana yakın", "Yeni", "Şu an aktif"
│                     │
│                     │
│    (Lock icon)      │  Center: only TEASER/LOCKED
│    (Shimmer sweep)  │  LOCKED only
│                     │
│─────────────────────│
│ Name, Age           │  CLEAR: real / TEASER+LOCKED: "???, ??"
│ 📍 1.2 km          │  Distance (always separate line)
│ %82 uyum           │  Compatibility (color coded)
└─────────────────────┘
```

Key layout changes from current code:
- Badge and distance are in **separate zones** (no overlap)
- Distance and compatibility in bottom section together
- Smart label stays top-left as a pill badge
- Compatibility badge moves from top-right to bottom area

## Animations

### Shimmer Light Sweep (LOCKED only)
- Diagonal white light strip, left-to-right
- `translateX` animation, 3-second loop
- Opacity: 8-12% (subtle, premium feel)

### Glow Border
- All cards: subtle purple shadow (`shadowRadius: 8`)
- LOCKED: pulsing glow opacity 0.15 ↔ 0.35, 2s loop
- TEASER: static medium glow

### Tap Reveal Animation
- Press in: scale 1 → 0.97
- Bounce back: scale 1.02 → 1
- Simultaneously: blur reduces (spring, tension: 150, friction: 8)
- After 500ms: UnlockModal slides up

### Lock Icon
- LOCKED: existing AnimatedLock (pulse + glow aura + progress ring) — preserved as-is
- TEASER: same AnimatedLock but smaller and at 60% opacity

### Card Entry
- Existing SlideIn preserved (bottom-to-top, staggered delay)
- LOCKED cards get additional 100ms delay (curiosity effect)

## Implementation Scope

### Single file change: `LikesYouScreen.tsx`

**New code:**
- `getCardState(tier, index, totalCards)` — returns `'clear' | 'teaser' | 'locked'`
- `ShimmerSweep` component — light sweep animation for LOCKED cards
- `TeaserLock` component — smaller/transparent lock for TEASER cards

**Modified code:**
- `LikeCard` — receives `cardState` prop instead of `isBlurred`, renders 3 states
- Card bottom section — badge to top, distance+compat to bottom
- `handleCardPress` — adds reveal animation delay for TEASER/LOCKED before modal
- Styles — glow border, shimmer, new layout

**Preserved (no changes):**
- `UnlockModal`
- `UpgradePrompt`
- `SkeletonCard`
- Header, empty state, FlatList config
- `likesRevealStore` integration
- `handleCardPress` core logic (reveal store, navigation)

**Removed:**
- `isBlurred` prop and binary Free/Premium distinction → replaced by `cardState`
- Inline duplicate lock icon (lines 373-400)
- Red nearby badge pill (lines 406-417)
- Index-based variable blur radius calculation (12/18/25)
- "Seni beğendi" label on first card

## getCardState Logic

```typescript
type CardState = 'clear' | 'teaser' | 'locked';

function getCardState(
  tier: PackageTier,
  index: number,
  totalCards: number,
  isRevealed: boolean,
): CardState {
  // Already revealed via store → always clear
  if (isRevealed) return 'clear';

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
}
```

## Success Criteria

- Free user feels "almost unlocked" — not blocked
- Gold user sees most profiles but still has upsell feeling
- Tap interaction feels alive and responsive
- No badge/distance overlap
- Shimmer and glow create premium feel
- Existing reveal store and modal flows still work correctly
