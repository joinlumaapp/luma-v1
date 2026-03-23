// useKeyboard — keyboard visibility and height tracking
//
// Why this exists:
//   Several screens need to know whether the keyboard is visible so they can
//   adjust their input bar's bottom padding (home indicator vs keyboard gap).
//   This hook centralises that logic so screens don't each duplicate the same
//   Keyboard.addListener pattern.
//
// Platform notes:
//   iOS:     keyboardWillShow / keyboardWillHide — fires BEFORE the animation,
//            so the UI adjusts in sync with the keyboard slide.
//   Android: keyboardDidShow / keyboardDidHide — fires AFTER the keyboard has
//            fully appeared. Android's adjustResize handles the actual layout
//            shift at the OS level (set in app.json), so we only need the
//            visibility flag for padding decisions.
//
// Usage:
//   const { isVisible, height } = useKeyboard();
//   paddingBottom = isVisible ? spacing.xs : Math.max(insets.bottom, spacing.sm)

import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';
import type { KeyboardEvent } from 'react-native';

export interface KeyboardState {
  /** True from the moment the keyboard starts appearing until it finishes hiding */
  isVisible: boolean;
  /** Current keyboard height in logical pixels (0 when hidden) */
  height: number;
}

export function useKeyboard(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({ isVisible: false, height: 0 });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) =>
      setState({ isVisible: true, height: e.endCoordinates.height });

    const onHide = () =>
      setState({ isVisible: false, height: 0 });

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return state;
}
