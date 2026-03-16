/**
 * LUMA Design System — Spacing, Layout & Sizing
 *
 * Built on an 8pt grid system for pixel-perfect alignment across all devices.
 * Inspired by Material Design's density-independent spacing and Apple's HIG.
 *
 * Key principles:
 * - 8pt base grid ensures visual harmony
 * - Generous white space like Bumble for a premium, breathable feel
 * - Consistent border radii for soft, inviting UI (Bumble + Hinge style)
 * - Responsive card sizing for immersive discovery (Tinder style)
 *
 * @module theme/spacing
 */

import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Spacing Scale — 8pt Grid System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core spacing scale based on 8pt grid.
 * Use these for margins, paddings, and gaps throughout the app.
 *
 * @example
 * ```ts
 * { padding: spacing.md }       // 16px — standard content padding
 * { marginBottom: spacing.lg }  // 24px — section separation
 * { gap: spacing.sm }           // 8px — tight element grouping
 * ```
 */
export const spacing = {
  /** 4px — Micro spacing (icon-to-text, inline elements) */
  xs: 4,
  /** 8px — Tight spacing (list item internals, chip padding) */
  sm: 8,
  /** 12px — Compact spacing (form field gaps) */
  smd: 12,
  /** 16px — Standard spacing (content padding, card internals) */
  md: 16,
  /** 20px — Comfortable spacing (between related sections) */
  mld: 20,
  /** 24px — Generous spacing (section gaps, card margins) */
  lg: 24,
  /** 32px — Large spacing (major section dividers) */
  xl: 32,
  /** 40px — Extra-large spacing (screen top/bottom padding) */
  '2xl': 40,
  /** 48px — Spacious (hero sections, visual breathing room) */
  xxl: 48,
  /** 64px — Maximum spacing (splash screens, onboarding) */
  '3xl': 64,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Border Radius Scale — Soft & Inviting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Border radius scale for consistent rounded corners.
 * Premium dating apps favor larger radii (16-24px) for a friendly, modern feel.
 *
 * @example
 * ```ts
 * { borderRadius: borderRadius.lg }   // 16px — cards, buttons
 * { borderRadius: borderRadius.xl }   // 24px — bottom sheets, modals
 * { borderRadius: borderRadius.full } // 9999px — avatars, pills
 * ```
 */
export const borderRadius = {
  /** 4px — Subtle rounding (tags, tiny badges) */
  xs: 4,
  /** 8px — Small elements (chips, small cards) */
  sm: 8,
  /** 12px — Medium elements (inputs, inner cards) */
  md: 12,
  /** 16px — Standard cards, buttons (Bumble/Hinge style) */
  lg: 16,
  /** 20px — Large cards, discovery cards */
  xl: 20,
  /** 24px — Bottom sheets, modals, floating elements */
  xxl: 24,
  /** 32px — Extra-large rounding (hero cards, premium elements) */
  '3xl': 32,
  /** 9999px — Perfect circles (avatars, pill buttons, badges) */
  full: 9999,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Screen Padding — Edge-to-edge consistency
// ─────────────────────────────────────────────────────────────────────────────

/** Standard screen-level padding for content areas */
export const screenPadding = {
  horizontal: spacing.md,
  vertical: spacing.md,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Layout Constants — Device-aware sizing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Layout constants for fixed-size elements.
 * Card dimensions are optimized for immersive, Tinder-style discovery.
 */
export const layout = {
  /** Device screen width */
  screenWidth: SCREEN_WIDTH,
  /** Device screen height */
  screenHeight: SCREEN_HEIGHT,

  // ── Discovery Card ──
  /** Full-bleed card width (screen minus horizontal padding) */
  cardWidth: SCREEN_WIDTH - spacing.md * 2,
  /** Immersive card height (62% of screen — Tinder proportion) */
  cardHeight: SCREEN_HEIGHT * 0.62,

  // ── Avatar Sizes ──
  /** 32px — Inline mentions, tiny indicators */
  avatarXSmall: 32,
  /** 40px — List items, chat bubbles */
  avatarSmall: 40,
  /** 56px — Match cards, notifications */
  avatarMedium: 56,
  /** 80px — Profile header, match detail */
  avatarLarge: 80,
  /** 120px — Profile hero, onboarding selfie */
  avatarXLarge: 120,

  // ── Icon Sizes ──
  /** 16px — Inline icons (verified badge, status dot) */
  iconXSmall: 16,
  /** 20px — Standard inline icons */
  iconSmall: 20,
  /** 24px — Navigation icons, action icons */
  iconMedium: 24,
  /** 32px — Tab bar icons, prominent actions */
  iconLarge: 32,
  /** 48px — Hero icons (empty states, onboarding) */
  iconXLarge: 48,

  // ── Interactive Elements ──
  /** 52px — Primary button height */
  buttonHeight: 52,
  /** 44px — Secondary/small button height */
  buttonSmallHeight: 44,
  /** 40px — Compact button (chips, tags) */
  buttonCompactHeight: 40,
  /** 52px — Text input height */
  inputHeight: 52,
  /** 44px — Minimum touch target (a11y) */
  minTouchTarget: 44,

  // ── Navigation ──
  /** 64px — Bottom tab bar height */
  tabBarHeight: 64,
  /** 56px — Standard header height */
  headerHeight: 56,
  /** iOS/Android safe area bottom */
  bottomSafeArea: Platform.OS === 'ios' ? 34 : 0,

  // ── Grid ──
  /** Photo grid item width (3 columns with gaps) */
  photoGridItem: (SCREEN_WIDTH - spacing.md * 2 - spacing.sm * 2) / 3,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Shadows — Elevation System (moved here for backward compat, also in shadows.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Basic shadow presets for backward compatibility.
 * For the full elevation system, see `shadows.ts`.
 */
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export type Spacing = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
