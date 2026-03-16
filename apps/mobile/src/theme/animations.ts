/**
 * LUMA Design System — Animation & Micro-interaction Constants
 *
 * Consistent animation language creates a polished, premium feel.
 * These constants ensure every transition, press, and micro-interaction
 * feels cohesive across the entire app.
 *
 * Inspired by:
 * - Tinder's satisfying card swipe physics
 * - Bumble's bouncy, playful transitions
 * - Hinge's smooth, editorial page transitions
 *
 * Spring configs follow react-native-reanimated's withSpring API:
 * { damping, stiffness, mass, overshootClamping }
 *
 * @module theme/animations
 */

// ─────────────────────────────────────────────────────────────────────────────
// Duration Scale — Timing-based animations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Duration presets for timing-based animations (withTiming).
 * Use springs for interactive elements; use durations for non-interactive transitions.
 *
 * @example
 * ```ts
 * withTiming(1, { duration: duration.normal })
 * ```
 */
export const duration = {
  /** 100ms — Instant feedback (opacity, color changes) */
  instant: 100,
  /** 150ms — Fast micro-interactions (button press, checkbox toggle) */
  fast: 150,
  /** 250ms — Standard transitions (fade, slide) */
  normal: 250,
  /** 350ms — Comfortable transitions (page change, modal appear) */
  moderate: 350,
  /** 500ms — Slow, deliberate animations (match reveal, onboarding) */
  slow: 500,
  /** 800ms — Dramatic animations (celebration, achievement unlock) */
  dramatic: 800,
  /** 1200ms — Extended animations (splash screen, first-launch) */
  extended: 1200,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Spring Configs — Physics-based animations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Spring physics presets for react-native-reanimated's withSpring.
 * Springs feel more natural than timing for interactive elements.
 *
 * @example
 * ```ts
 * pressed.value = withSpring(1, spring.bouncy);
 * scale.value = withSpring(0.96, spring.gentle);
 * ```
 */
export const spring = {
  /**
   * Gentle — Soft, smooth settling. No bounce.
   * Use for: tooltips appearing, drawer opening, layout shifts.
   */
  gentle: {
    damping: 20,
    stiffness: 150,
    mass: 1,
    overshootClamping: false,
  },

  /**
   * Snappy — Quick response with minimal bounce.
   * Use for: button press scale, toggle switches, chip selection.
   */
  snappy: {
    damping: 15,
    stiffness: 300,
    mass: 0.8,
    overshootClamping: false,
  },

  /**
   * Bouncy — Playful overshoot with satisfying settle.
   * Use for: match animation, badge earned, like sent toast.
   */
  bouncy: {
    damping: 10,
    stiffness: 250,
    mass: 0.8,
    overshootClamping: false,
  },

  /**
   * Stiff — Fast, responsive with very slight overshoot.
   * Use for: card swipe snap-back, menu toggle, quick resets.
   */
  stiff: {
    damping: 20,
    stiffness: 400,
    mass: 0.6,
    overshootClamping: false,
  },

  /**
   * Elastic — Maximum bounce for celebration moments.
   * Use for: super compatible reveal, coin toss, reward unlock.
   */
  elastic: {
    damping: 8,
    stiffness: 200,
    mass: 1,
    overshootClamping: false,
  },

  /**
   * Card swipe — Tuned for natural card throw physics.
   * Use for: discovery card swipe left/right/up.
   */
  cardSwipe: {
    damping: 18,
    stiffness: 120,
    mass: 1.2,
    overshootClamping: true,
  },

  /**
   * Sheet — Smooth bottom sheet open/close.
   * Use for: bottom sheets, action sheets, filter panels.
   */
  sheet: {
    damping: 25,
    stiffness: 200,
    mass: 1,
    overshootClamping: false,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Easing Curves — For withTiming animations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cubic bezier easing curves for timing-based animations.
 * These map to Reanimated's Easing.bezier() values.
 *
 * @example
 * ```ts
 * import { Easing } from 'react-native-reanimated';
 * withTiming(1, {
 *   duration: duration.normal,
 *   easing: Easing.bezier(...easing.standard),
 * })
 * ```
 */
export const easing = {
  /** Standard — Natural deceleration for most transitions */
  standard: [0.4, 0.0, 0.2, 1.0] as const,
  /** Enter — Elements appearing from off-screen */
  enter: [0.0, 0.0, 0.2, 1.0] as const,
  /** Exit — Elements leaving the screen */
  exit: [0.4, 0.0, 1.0, 1.0] as const,
  /** Emphasized — Extra dramatic for attention-grabbing moments */
  emphasized: [0.2, 0.0, 0.0, 1.0] as const,
  /** Linear — Constant speed (progress bars, looping animations) */
  linear: [0.0, 0.0, 1.0, 1.0] as const,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Haptic Feedback Types — Tactile micro-interactions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haptic feedback mapping for consistent tactile responses.
 * Maps to expo-haptics ImpactFeedbackStyle and NotificationFeedbackType.
 *
 * Usage guide:
 * - light: button press, chip select, toggle
 * - medium: card swipe complete, match detected
 * - heavy: super compatible reveal, error shake
 * - success: match confirmed, message sent
 * - warning: approaching limit, low balance
 * - error: validation failure, blocked action
 *
 * @example
 * ```ts
 * import * as Haptics from 'expo-haptics';
 * Haptics.impactAsync(haptics.light);
 * Haptics.notificationAsync(haptics.success);
 * ```
 */
export const haptics = {
  /** Subtle tap — buttons, chips, toggles */
  light: 'Light' as const,
  /** Medium impact — card actions, confirmations */
  medium: 'Medium' as const,
  /** Strong impact — celebrations, errors */
  heavy: 'Heavy' as const,
  /** Success notification — match confirmed, purchase complete */
  success: 'Success' as const,
  /** Warning notification — approaching limits */
  warning: 'Warning' as const,
  /** Error notification — validation failures */
  error: 'Error' as const,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Animation Presets — Common motion patterns
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-configured animation configs for common UI patterns.
 * Combine spring/duration + transform properties for ready-to-use motion.
 */
export const motionPresets = {
  /** Button press — scale down slightly on press, spring back */
  buttonPress: {
    pressed: { scale: 0.96 },
    spring: spring.snappy,
  },

  /** Card press — softer scale for card interactions */
  cardPress: {
    pressed: { scale: 0.98 },
    spring: spring.gentle,
  },

  /** Fade in — standard content appearance */
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: duration.normal,
  },

  /** Slide up — bottom sheet, modal entrance */
  slideUp: {
    from: { translateY: 300, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
    spring: spring.sheet,
  },

  /** Slide in from right — screen transition */
  slideInRight: {
    from: { translateX: 100, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
    duration: duration.moderate,
  },

  /** Scale up — popup, tooltip appearance */
  scaleUp: {
    from: { scale: 0.8, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    spring: spring.bouncy,
  },

  /** Pulse — attention-drawing loop (notification dot, live indicator) */
  pulse: {
    from: { scale: 1, opacity: 1 },
    to: { scale: 1.15, opacity: 0.7 },
    duration: duration.slow,
  },

  /** Shake — error state, invalid input */
  shake: {
    keyframes: [-10, 10, -8, 8, -4, 4, 0],
    duration: duration.fast,
  },

  /** Match celebration — bouncy scale with rotation */
  matchCelebration: {
    from: { scale: 0, rotate: '-15deg' },
    to: { scale: 1, rotate: '0deg' },
    spring: spring.elastic,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Stagger Delays — Sequential animation timing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stagger delay values for sequential list/grid item animations.
 * Apply increasing delays to each item for a cascading entrance.
 *
 * @example
 * ```ts
 * items.map((item, index) => ({
 *   delay: index * stagger.fast,
 * }))
 * ```
 */
export const stagger = {
  /** 30ms per item — Quick cascade for lists */
  fast: 30,
  /** 60ms per item — Standard cascade for cards */
  normal: 60,
  /** 100ms per item — Dramatic cascade for onboarding/hero */
  slow: 100,
} as const;
