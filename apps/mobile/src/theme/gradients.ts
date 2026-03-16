/**
 * LUMA Design System — Gradient Presets
 *
 * Gradients are central to dating app visual identity:
 * - Tinder: iconic orange-to-pink flame gradient
 * - Bumble: warm yellow-to-amber glow
 * - Hinge: subtle purple-to-dark editorial gradient
 *
 * LUMA uses warm rose-to-coral as its signature, complemented by
 * purple luxury gradients and gold premium accents.
 *
 * All gradient presets are arrays of color stops for use with
 * expo-linear-gradient or react-native-linear-gradient.
 *
 * @module theme/gradients
 */

import { palette } from './colors';

// ─────────────────────────────────────────────────────────────────────────────
// Gradient Direction Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Standard gradient directions for LinearGradient start/end props */
export const gradientDirections = {
  /** Top to bottom (vertical) */
  vertical: { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
  /** Left to right (horizontal) */
  horizontal: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  /** Top-left to bottom-right (diagonal) */
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  /** Top-right to bottom-left */
  diagonalReverse: { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
  /** Center outward (radial-like with two-point linear) */
  radialLike: { start: { x: 0.5, y: 0.3 }, end: { x: 0.5, y: 1 } },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Brand Gradients — LUMA Signature
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LUMA's core brand gradients used across the app's primary UI.
 */
export const brandGradients = {
  /**
   * LUMA Primary — Warm Rose to Soft Coral
   * The signature gradient that defines LUMA's romantic, premium identity.
   * Use for: primary CTAs, hero sections, splash screen.
   */
  primary: ['#E8527C', '#FF8066'] as readonly string[],

  /**
   * LUMA Luxury — Deep Purple to Rose Pink
   * Sophisticated gradient for premium/elevated contexts.
   * Use for: premium buttons, upgrade prompts, special features.
   */
  luxury: [palette.purple[600], palette.pink[500]] as readonly string[],

  /**
   * LUMA Romance — Soft Pink to Warm Rose
   * Gentle, romantic gradient for match-related UI.
   * Use for: match notifications, compatibility highlights, heart elements.
   */
  romance: [palette.pink[300], palette.rose[400]] as readonly string[],

  /**
   * LUMA Dusk — Deep Purple to Midnight
   * Dark, moody gradient for dark mode backgrounds and premium surfaces.
   * Use for: dark mode hero sections, night-time theming.
   */
  dusk: [palette.purple[900], '#08080F'] as readonly string[],

  /**
   * LUMA Dawn — Warm coral to soft gold sunrise
   * Warm, optimistic gradient for positive moments.
   * Use for: daily picks, new feature announcements, welcome screens.
   */
  dawn: ['#FF8066', '#FFB74D'] as readonly string[],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Card Overlay Gradients — Photo readability
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gradients overlaid on profile photos to ensure text readability.
 * Applied bottom-up (transparent top → dark bottom) like Tinder.
 */
export const cardOverlays = {
  /** Standard dark overlay — name/info readable on any photo */
  dark: [
    'transparent',
    'rgba(0, 0, 0, 0.02)',
    'rgba(0, 0, 0, 0.25)',
    'rgba(0, 0, 0, 0.65)',
    'rgba(0, 0, 0, 0.85)',
  ] as readonly string[],

  /** Softer overlay — for cards with less text */
  soft: [
    'transparent',
    'rgba(0, 0, 0, 0.15)',
    'rgba(0, 0, 0, 0.55)',
  ] as readonly string[],

  /** Romantic tinted overlay — purple-tinted for match cards */
  romantic: [
    'transparent',
    'rgba(75, 0, 60, 0.1)',
    'rgba(75, 0, 60, 0.4)',
    'rgba(50, 0, 40, 0.75)',
  ] as readonly string[],

  /** Top fade — for top-aligned info (compatibility badge area) */
  topFade: [
    'rgba(0, 0, 0, 0.5)',
    'rgba(0, 0, 0, 0.2)',
    'transparent',
  ] as readonly string[],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Premium Tier Gradients — Subscription packages
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gradient presets for each premium tier.
 * Gold uses warm metallic tones, Pro uses deep purple, Reserved uses rose pink.
 */
export const tierGradients = {
  /** Free tier — neutral gray (encourages upgrade) */
  free: ['#9CA3AF', '#6B7280'] as readonly string[],

  /**
   * Gold tier — Warm metallic gold gradient
   * Conveys luxury and achievement (inspired by actual gold reflections).
   */
  gold: ['#FFE44D', '#FFD700', '#C5A600'] as readonly string[],

  /**
   * Pro tier — Deep purple gradient
   * Conveys power and sophistication (LUMA brand purple elevated).
   */
  pro: [palette.purple[400], palette.purple[600], palette.purple[800]] as readonly string[],

  /**
   * Reserved tier — Rose pink gradient
   * Ultra-premium romantic exclusivity.
   */
  reserved: [palette.pink[300], palette.pink[500], palette.pink[700]] as readonly string[],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Match & Compatibility Gradients
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gradients for match animations, compatibility indicators, and celebration moments.
 */
export const matchGradients = {
  /** Match animation background — celebratory purple-to-pink burst */
  matchReveal: [palette.purple[500], palette.pink[400], palette.coral[400]] as readonly string[],

  /** Super compatible — special gold-accented gradient */
  superCompatible: ['#FFD700', palette.purple[400], palette.pink[400]] as readonly string[],

  /** High compatibility (70%+) — confident green-to-teal */
  highCompat: ['#34D399', '#10B981', '#059669'] as readonly string[],

  /** Medium compatibility (50-69%) — warm amber */
  mediumCompat: ['#FBBF24', '#F59E0B', '#D97706'] as readonly string[],

  /** Compatibility ring — animated border gradient for match cards */
  compatRing: [palette.purple[400], palette.pink[400], palette.coral[400], palette.purple[400]] as readonly string[],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Background & Mesh Gradients
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Background gradients for full-screen and section backgrounds.
 * Mesh gradients use multiple color stops for a rich, dimensional effect.
 */
export const backgroundGradients = {
  /** Light mode page background — subtle warm tint */
  warmBackground: ['#FAF7F2', '#F5F0E8', '#F0EBE3'] as readonly string[],

  /** Dark mode page background — deep space with purple tint */
  darkBackground: ['#0E0E1A', '#08080F', '#050510'] as readonly string[],

  /** Onboarding background — warm, inviting mesh */
  onboarding: ['#FFF5F5', '#FDF2F8', '#F5F3FF'] as readonly string[],

  /** Auth/splash background — dramatic, brand-forward */
  splash: [palette.purple[900], '#1A0A2E', '#08080F'] as readonly string[],

  /** Premium background — the signature LUMA powder pink */
  premiumPage: ['#E8A4B8', '#F0B8C8', '#F5C8D4'] as readonly string[],

  /** Settings/profile background — calm neutral */
  neutral: ['#F9FAFB', '#F3F4F6', '#E5E7EB'] as readonly string[],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Shimmer & Skeleton Gradients
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gradients for loading skeleton animations (shimmer effect).
 */
export const shimmerGradients = {
  /** Light mode shimmer */
  light: ['#E5E7EB', '#F3F4F6', '#E5E7EB'] as readonly string[],
  /** Dark mode shimmer */
  dark: ['#1C1C32', '#252540', '#1C1C32'] as readonly string[],
  /** Cream mode shimmer */
  cream: ['#E8E0D4', '#F0EBE3', '#E8E0D4'] as readonly string[],
} as const;
