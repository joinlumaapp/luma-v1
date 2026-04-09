/**
 * LUMA Design System — Color Palette
 *
 * A world-class color system inspired by the best dating apps:
 * - Tinder: bold gradients, content-first approach
 * - Bumble: warm, inviting tones with generous white space
 * - Hinge: sophisticated editorial feel, premium dark surfaces
 * - Coffee Meets Bagel: pastel warmth, cafe-inspired elegance
 *
 * Color psychology applied:
 * - Warm rose/coral tones → trust, romance, emotional connection
 * - Purple → luxury, mystery, sophistication
 * - Gold → premium, exclusivity, achievement
 * - Soft neutrals → calm, clarity, breathing room
 *
 * @module theme/colors
 */

// ─────────────────────────────────────────────────────────────────────────────
// Brand Palette — LUMA's signature color families
// ─────────────────────────────────────────────────────────────────────────────

export const palette = {
  /**
   * Primary — LUMA Signature Purple
   * Conveys luxury, sophistication, and exclusivity.
   * Used for primary actions, navigation highlights, and brand elements.
   */
  purple: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },

  /**
   * Secondary — Warm Rose Pink
   * Conveys romance, warmth, and emotional depth.
   * Used for secondary actions, match highlights, and romantic UI cues.
   */
  pink: {
    50: '#FDF2F8',
    100: '#FCE7F3',
    200: '#FBCFE8',
    300: '#F9A8D4',
    400: '#F472B6',
    500: '#EC4899',
    600: '#DB2777',
    700: '#BE185D',
    800: '#9D174D',
    900: '#831843',
  },

  /**
   * Accent — Premium Gold
   * Conveys achievement, premium status, and exclusivity.
   * Used for Gold tier, badges, reward highlights, and coin balance.
   */
  gold: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  /**
   * Tertiary — Warm Coral
   * LUMA's signature warm accent for gradients and romantic highlights.
   * Inspired by Tinder's flame gradient but softer and more premium.
   */
  coral: {
    50: '#FFF5F5',
    100: '#FFE8E5',
    200: '#FFD0CC',
    300: '#FFB0A8',
    400: '#FF8C80',
    500: '#FF6B5A',
    600: '#F04D3A',
    700: '#D63A28',
    800: '#B02A1C',
    900: '#8C2015',
  },

  /**
   * Romance — Soft Rose (LUMA unique)
   * A delicate, warm rose palette for romantic micro-interactions,
   * match success states, and gentle UI accents.
   */
  rose: {
    50: '#FFF1F3',
    100: '#FFE0E6',
    200: '#FFC7D2',
    300: '#FFA3B5',
    400: '#FF7A95',
    500: '#FF5078',
    600: '#F02860',
    700: '#D41854',
    800: '#B01248',
    900: '#8C0F3E',
  },

  /**
   * Neutrals — Warm Grays
   * Slightly warm-tinted neutrals for a softer, more inviting feel
   * compared to cold blue-grays. Premium dating apps use warm neutrals.
   */
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  /** Absolute white */
  white: '#FFFFFF',
  /** Absolute black */
  black: '#000000',
  /** Transparent */
  transparent: 'transparent',

  // ── Semantic Status Colors ──
  /** Success — Teal green, communicates positive outcomes */
  success: '#10B981',
  /** Error — Warm red, communicates problems without harshness */
  error: '#EF4444',
  /** Warning — Amber, communicates caution */
  warning: '#F59E0B',
  /** Info — Sky blue, communicates neutral information */
  info: '#3B82F6',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Status Color Variants — Extended for richer UI states
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semantic colors with light/dark/bg variants for use in toasts, alerts,
 * inline messages, and status indicators across the app.
 */
export const semanticColors = {
  success: {
    light: '#D1FAE5',
    main: '#10B981',
    dark: '#047857',
    bg: 'rgba(16, 185, 129, 0.12)',
  },
  error: {
    light: '#FEE2E2',
    main: '#EF4444',
    dark: '#B91C1C',
    bg: 'rgba(239, 68, 68, 0.12)',
  },
  warning: {
    light: '#FEF3C7',
    main: '#F59E0B',
    dark: '#B45309',
    bg: 'rgba(245, 158, 11, 0.12)',
  },
  info: {
    light: '#DBEAFE',
    main: '#3B82F6',
    dark: '#1D4ED8',
    bg: 'rgba(59, 130, 246, 0.12)',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Premium Tier Colors — Package-specific palettes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Premium tier colors for subscription badges, package cards, and upgrade CTAs.
 * Each tier has a distinct visual identity:
 * - Free: neutral, inviting to upgrade
 * - Gold: warm metallic gold, exclusivity
 * - Pro: deep purple, power and sophistication
 * - Reserved: rose pink, ultra-premium romanticism
 */
export const tierColors = {
  free: {
    primary: '#6B7280',
    secondary: '#9CA3AF',
    bg: 'rgba(107, 114, 128, 0.10)',
    gradient: ['#9CA3AF', '#6B7280'] as readonly string[],
  },
  gold: {
    primary: '#FFD700',
    secondary: '#FFC107',
    bg: 'rgba(255, 215, 0, 0.12)',
    gradient: ['#FFE44D', '#FFD700', '#C5A600'] as readonly string[],
  },
  pro: {
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    bg: 'rgba(139, 92, 246, 0.12)',
    gradient: ['#A78BFA', '#8B5CF6', '#6D28D9'] as readonly string[],
  },
  reserved: {
    primary: '#EC4899',
    secondary: '#F472B6',
    bg: 'rgba(236, 72, 153, 0.12)',
    gradient: ['#F472B6', '#EC4899', '#BE185D'] as readonly string[],
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Surface & Elevation Colors — Card, modal, sheet backgrounds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Surface colors for different elevation levels.
 * Higher elevation = slightly lighter in dark mode, slightly more defined in light mode.
 */
export const surfaces = {
  dark: {
    /** Base background — deepest layer */
    background: '#08080F',
    /** Slightly elevated background (section separators) */
    backgroundElevated: '#0E0E1A',
    /** Card/surface level 1 */
    surface1: '#141422',
    /** Card/surface level 2 (modals, sheets) */
    surface2: '#1C1C32',
    /** Card/surface level 3 (floating elements) */
    surface3: '#252540',
    /** Overlay for modals/sheets */
    overlay: 'rgba(0, 0, 0, 0.6)',
    /** Overlay for card image bottoms (name readability) */
    cardOverlay: 'rgba(0, 0, 0, 0.55)',
    /** Scrim for fullscreen modals */
    scrim: 'rgba(0, 0, 0, 0.8)',
  },
  light: {
    background: '#F9FAFB',
    backgroundElevated: '#FFFFFF',
    surface1: '#FFFFFF',
    surface2: '#F9FAFB',
    surface3: '#F3F4F6',
    overlay: 'rgba(0, 0, 0, 0.4)',
    cardOverlay: 'rgba(0, 0, 0, 0.45)',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
  cream: {
    background: '#F5F0E8',
    backgroundElevated: '#EDE8DF',
    surface1: '#FFFFFF',
    surface2: '#FAF7F2',
    surface3: '#F0EBE3',
    overlay: 'rgba(0, 0, 0, 0.4)',
    cardOverlay: 'rgba(0, 0, 0, 0.45)',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Theme Definitions — Dark, Light, Cream
// ─────────────────────────────────────────────────────────────────────────────

export const darkTheme = {
  primary: palette.purple[500],
  primaryLight: palette.purple[400],
  primaryDark: palette.purple[700],
  secondary: palette.pink[500],
  secondaryLight: palette.pink[400],
  secondaryDark: palette.pink[700],
  accent: palette.gold[500],
  accentLight: palette.gold[400],
  accentDark: palette.gold[700],
  background: '#08080F',
  backgroundSecondary: '#0E0E1A',
  surface: '#141422',
  surfaceLight: '#1C1C32',
  surfaceBorder: '#252540',
  card: '#12121F',
  inputBg: '#1A1A2E',
  text: palette.white,
  textSecondary: palette.gray[400],
  textTertiary: palette.gray[500],
  textInverse: palette.gray[900],
  border: '#222238',
  divider: '#1A1A2E',
  overlay: 'rgba(0, 0, 0, 0.6)',
  statusBar: 'light-content' as const,
  success: palette.success,
  error: palette.error,
  warning: palette.warning,
  info: palette.info,
  tabBarBackground: '#0d0d14',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
  tabBarActive: '#FFFFFF',
  tabBarInactive: 'rgba(255, 255, 255, 0.5)',
  gradientPrimary: ['#9B6BF8', '#EC4899'] as readonly string[],
  gradientSecondary: ['#8B5CF6', '#5B21B6'] as readonly string[],
  gradientGold: [palette.gold[400], palette.gold[600]] as readonly string[],
};

export const lightTheme = {
  primary: palette.purple[500],
  primaryLight: palette.purple[300],
  primaryDark: palette.purple[700],
  secondary: palette.pink[500],
  secondaryLight: palette.pink[300],
  secondaryDark: palette.pink[700],
  accent: palette.gold[500],
  accentLight: palette.gold[300],
  accentDark: palette.gold[700],
  background: palette.gray[50],
  backgroundSecondary: palette.white,
  surface: palette.white,
  surfaceLight: palette.gray[50],
  surfaceBorder: palette.gray[200],
  card: palette.white,
  inputBg: palette.gray[100],
  text: palette.gray[900],
  textSecondary: palette.gray[600],
  textTertiary: palette.gray[400],
  textInverse: palette.white,
  border: palette.gray[200],
  divider: palette.gray[100],
  overlay: 'rgba(0, 0, 0, 0.4)',
  statusBar: 'light-content' as const,
  success: palette.success,
  error: palette.error,
  warning: palette.warning,
  info: palette.info,
  tabBarBackground: palette.white,
  tabBarBorder: palette.gray[200],
  tabBarActive: palette.purple[500],
  tabBarInactive: palette.gray[400],
  gradientPrimary: [palette.purple[500], palette.pink[400]] as readonly string[],
  gradientSecondary: [palette.purple[400], palette.purple[700]] as readonly string[],
  gradientGold: [palette.gold[300], palette.gold[500]] as readonly string[],
};

export const creamTheme = {
  primary: palette.purple[500],
  primaryLight: palette.purple[400],
  primaryDark: palette.purple[700],
  secondary: palette.pink[500],
  secondaryLight: palette.pink[400],
  secondaryDark: palette.pink[700],
  accent: palette.gold[500],
  accentLight: palette.gold[400],
  accentDark: palette.gold[700],
  background: '#F5F0E8',
  backgroundSecondary: '#EDE8DF',
  surface: '#FFFFFF',
  surfaceLight: '#FAF7F2',
  surfaceBorder: '#E8E0D4',
  card: '#FFFFFF',
  inputBg: '#FAF7F2',
  text: '#2C1810',
  textSecondary: '#6B5D4F',
  textTertiary: '#746850',
  textInverse: palette.white,
  border: '#E8E0D4',
  divider: '#EDE8DF',
  overlay: 'rgba(0, 0, 0, 0.4)',
  statusBar: 'light-content' as const,
  success: palette.success,
  error: palette.error,
  warning: palette.warning,
  info: palette.info,
  tabBarBackground: '#F5F0E8',
  tabBarBorder: '#E8E0D4',
  tabBarActive: palette.purple[500],
  tabBarInactive: '#746850',
  gradientPrimary: ['#9B6BF8', '#EC4899'] as readonly string[],
  gradientSecondary: ['#8B5CF6', '#5B21B6'] as readonly string[],
  gradientGold: [palette.gold[400], palette.gold[600]] as readonly string[],
};

export type ThemeColors = {
  [K in keyof typeof darkTheme]: K extends 'statusBar'
    ? 'light-content' | 'dark-content'
    : (typeof darkTheme)[K] extends readonly string[]
      ? readonly string[]
      : string;
};

// Aliases for theme context usage
export const darkColors: ThemeColors = darkTheme;
export const lightColors: ThemeColors = lightTheme;

// Theme mode type
export type ThemeMode = 'light' | 'dark' | 'system';

// ─────────────────────────────────────────────────────────────────────────────
// Glassmorphism Design Tokens
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Glassmorphism (frosted glass) tokens for premium overlays,
 * bottom sheets, and floating UI elements.
 */
export const glassmorphism = {
  bg: 'rgba(255, 255, 255, 0.7)',
  bgLight: 'rgba(250, 247, 242, 0.5)',
  bgDark: 'rgba(245, 240, 232, 0.85)',
  border: 'rgba(139, 92, 246, 0.15)',
  borderActive: 'rgba(139, 92, 246, 0.35)',
  borderGold: 'rgba(251, 191, 36, 0.25)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Opacity Tokens — Consistent transparency values
// ─────────────────────────────────────────────────────────────────────────────

/** Standardized opacity values for disabled states, overlays, and hover effects */
export const opacity = {
  /** Disabled UI elements */
  disabled: 0.4,
  /** Subtle background tints (chip backgrounds, tag fills) */
  subtle: 0.08,
  /** Light overlays (hover states, pressed states) */
  light: 0.12,
  /** Medium overlays (semi-transparent backgrounds) */
  medium: 0.4,
  /** Heavy overlays (modal scrims) */
  heavy: 0.6,
  /** Almost opaque (toast backgrounds) */
  intense: 0.85,
} as const;

// Default theme is cream
export const colors: ThemeColors = creamTheme;
