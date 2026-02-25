// LazyScreens — Deferred screen mounting for React Navigation
//
// React Navigation does not support React.lazy() / Suspense directly.
// Instead we provide a `withDeferredMount` HOC that:
//   1. Shows a lightweight loading placeholder immediately
//   2. Defers the actual component mount via InteractionManager
//   3. Ensures navigation animations finish before heavy screens render
//
// Use this for screens with expensive initial renders (radar charts,
// complex animations, large scrollable content, etc.)

import React, { useState, useEffect, ComponentType } from 'react';
import { View, ActivityIndicator, StyleSheet, InteractionManager } from 'react-native';
import { colors } from '../theme/colors';

/**
 * HOC that defers the actual screen component mount until after
 * navigation transitions complete. This prevents animation jank
 * when pushing heavy screens.
 *
 * Usage:
 *   const DeferredCompatibilityInsight = withDeferredMount(CompatibilityInsightScreen);
 *   <Stack.Screen name="CompatibilityInsight" component={DeferredCompatibilityInsight} />
 */
export function withDeferredMount<P extends object>(
  WrappedComponent: ComponentType<P>,
  displayName?: string,
): ComponentType<P> {
  const DeferredComponent: React.FC<P> = (props) => {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
      });
      return () => task.cancel();
    }, []);

    if (!isReady) {
      return (
        <View style={deferredStyles.container}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return React.createElement(WrappedComponent, props);
  };

  DeferredComponent.displayName = displayName ?? `Deferred(${
    WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component'
  })`;

  return DeferredComponent;
}

const deferredStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

// ─── Pre-wrapped Deferred Screens ──────────────────────────
//
// Import these directly in MainTabNavigator instead of the raw screen:
//
//   import { DeferredCompatibilityInsight } from '../navigation/LazyScreens';
//
// Note: The actual lazy imports are done inline via require() to keep
// the bundle-time import graph flat while deferring component mount.

// We re-export the withDeferredMount so navigators can wrap on their own
export { withDeferredMount as deferScreen };
