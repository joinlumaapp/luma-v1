/**
 * Screen transition configurations for React Navigation (native-stack).
 *
 * Provides premium-quality transition presets compatible with
 * @react-navigation/native-stack v7:
 * - modalSlideUp: Bottom sheet style modal entrance
 * - cardExpand: Profile card expand into detail view
 * - fadeThrough: Material fade-through for tab switches
 * - horizontalSlide: Standard iOS push with parallax feel
 * - sharedElementConfig: Shared element transition helpers
 *
 * Native-stack uses native platform animations under the hood, so these
 * are configuration objects rather than custom JS interpolators.
 *
 * @example
 * <Stack.Screen name="ProfilePreview" options={modalSlideUp} />
 */

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

// ======================================================================
// 1. Modal Slide Up — Bottom sheet / modal style
// ======================================================================

/**
 * Slides the screen up from the bottom as a modal.
 * Uses native iOS/Android modal presentation for best performance.
 */
export const modalSlideUp: NativeStackNavigationOptions = {
  presentation: 'modal',
  animation: 'slide_from_bottom',
  gestureEnabled: true,
  gestureDirection: 'vertical',
};

// ======================================================================
// 2. Card Expand — Profile card to detail view
// ======================================================================

/**
 * Fade + slight zoom for card-to-detail transitions.
 * On iOS this uses the native fade animation; on Android it
 * uses a crossfade that feels like the card is expanding.
 */
export const cardExpand: NativeStackNavigationOptions = {
  animation: 'fade',
  animationDuration: 300,
  gestureEnabled: true,
};

// ======================================================================
// 3. Fade Through — Material Design tab switch transition
// ======================================================================

/**
 * Cross-fade between screens. Perfect for bottom tab content
 * switches or "replace" navigations where direction is irrelevant.
 */
export const fadeThrough: NativeStackNavigationOptions = {
  animation: 'fade',
  animationDuration: 250,
};

// ======================================================================
// 4. Horizontal Slide — iOS-style push
// ======================================================================

/**
 * Standard horizontal push from the right edge.
 * Uses native spring-based animation for the most polished feel.
 */
export const horizontalSlide: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};

// ======================================================================
// 5. Slide From Left — back-style navigation
// ======================================================================

/**
 * Horizontal push from the left. Useful for "go back" feel
 * when navigating to a logically-previous screen.
 */
export const slideFromLeft: NativeStackNavigationOptions = {
  animation: 'slide_from_left',
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};

// ======================================================================
// 6. No Animation — instant switch
// ======================================================================

/**
 * Instant screen change with no transition. Useful for
 * auth flow redirects or conditional screens.
 */
export const noAnimation: NativeStackNavigationOptions = {
  animation: 'none',
};

// ======================================================================
// 7. Shared Element Transition Helpers
// ======================================================================

/**
 * Configuration objects for shared element transitions.
 * Use with react-navigation-shared-element or react-native-shared-element.
 *
 * These are ID + config objects; actual SharedElement components must
 * wrap the source and target views in the respective screens.
 */
export const sharedElementConfig = {
  /** Profile photo shared element — used between card and detail */
  profilePhoto: {
    id: 'profile-photo',
    animation: 'move' as const,
    resize: 'auto' as const,
    align: 'auto' as const,
  },

  /** Profile card container — for card-to-detail expand */
  profileCard: {
    id: 'profile-card',
    animation: 'fade' as const,
    resize: 'auto' as const,
    align: 'auto' as const,
  },

  /** Match avatar — used in match list to chat transition */
  matchAvatar: {
    id: 'match-avatar',
    animation: 'move' as const,
    resize: 'auto' as const,
    align: 'auto' as const,
  },
} as const;

/**
 * Helper to create a unique shared element ID with a dynamic suffix.
 * Use for lists where each item needs a unique transition ID.
 *
 * @example
 * const photoId = createSharedElementId('profile-photo', user.id);
 * // => "profile-photo-abc123"
 */
export const createSharedElementId = (base: string, suffix: string | number): string =>
  `${base}-${suffix}`;
