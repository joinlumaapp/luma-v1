// AnimatedTextInput — Shared input with focus border animation, floating label, and subtle glow
// Border transitions from gray to purple on focus (200ms), label floats up and shrinks,
// and a soft purple glow/shadow appears around the focused input.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  Animated,
  StyleSheet,
  Platform,
  type TextInputProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors, palette } from '../../theme/colors';

interface AnimatedTextInputProps extends TextInputProps {
  /** Floating label text — displayed as placeholder when unfocused */
  label: string;
  /** Optional container style override */
  containerStyle?: ViewStyle;
  /** Optional input style override */
  inputStyle?: TextStyle;
  /** Optional error text below input */
  error?: string;
}

const FOCUS_DURATION = 200;
const LABEL_TOP_UNFOCUSED = 16;
const LABEL_TOP_FOCUSED = -8;
const LABEL_FONT_UNFOCUSED = 15;
const LABEL_FONT_FOCUSED = 11;

export const AnimatedTextInput: React.FC<AnimatedTextInputProps> = ({
  label,
  containerStyle,
  inputStyle,
  error,
  value,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = Boolean(value && value.length > 0);

  // Animated values
  const borderColor = useRef(new Animated.Value(0)).current; // 0 = gray, 1 = purple
  const labelPosition = useRef(new Animated.Value(hasValue ? 1 : 0)).current; // 0 = down, 1 = up
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Update label position on external value changes (e.g. form reset)
  useEffect(() => {
    if (hasValue && !isFocused) {
      labelPosition.setValue(1);
    }
  }, [hasValue, isFocused, labelPosition]);

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(borderColor, {
        toValue: 1,
        duration: FOCUS_DURATION,
        useNativeDriver: false, // borderColor is not natively animatable
      }),
      Animated.timing(labelPosition, {
        toValue: 1,
        duration: FOCUS_DURATION,
        useNativeDriver: false,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: FOCUS_DURATION,
        useNativeDriver: false,
      }),
    ]).start();
  }, [borderColor, labelPosition, glowOpacity]);

  const animateOut = useCallback(() => {
    const toLabel = hasValue ? 1 : 0; // Keep label up if there's text
    Animated.parallel([
      Animated.timing(borderColor, {
        toValue: 0,
        duration: FOCUS_DURATION,
        useNativeDriver: false,
      }),
      Animated.timing(labelPosition, {
        toValue: toLabel,
        duration: FOCUS_DURATION,
        useNativeDriver: false,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: FOCUS_DURATION,
        useNativeDriver: false,
      }),
    ]).start();
  }, [borderColor, labelPosition, glowOpacity, hasValue]);

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      setIsFocused(true);
      animateIn();
      onFocus?.(e);
    },
    [animateIn, onFocus],
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      setIsFocused(false);
      animateOut();
      onBlur?.(e);
    },
    [animateOut, onBlur],
  );

  // Interpolations
  const animatedBorderColor = borderColor.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border || 'rgba(255,255,255,0.12)', palette.purple[500]],
  });

  const labelTop = labelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [LABEL_TOP_UNFOCUSED, LABEL_TOP_FOCUSED],
  });

  const labelFontSize = labelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [LABEL_FONT_UNFOCUSED, LABEL_FONT_FOCUSED],
  });

  const labelColor = labelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.textTertiary || 'rgba(255,255,255,0.35)', palette.purple[400]],
  });

  const glowShadowOpacity = glowOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Animated.View
        style={[
          styles.container,
          {
            borderColor: animatedBorderColor,
            ...Platform.select({
              ios: {
                shadowColor: palette.purple[500],
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: glowShadowOpacity as unknown as number,
                shadowRadius: 8,
              },
              android: {}, // Android glow not supported natively
            }),
          },
        ]}
      >
        {/* Floating label */}
        <Animated.Text
          style={[
            styles.label,
            {
              top: labelTop,
              fontSize: labelFontSize,
              color: labelColor,
            },
          ]}
          pointerEvents="none"
        >
          {label}
        </Animated.Text>

        <TextInput
          style={[styles.input, inputStyle]}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor="transparent"
          {...rest}
        />
      </Animated.View>

      {/* Android glow fallback */}
      {Platform.OS === 'android' && isFocused && (
        <Animated.View
          style={[
            styles.androidGlow,
            { opacity: glowOpacity },
          ]}
          pointerEvents="none"
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  container: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: 14,
    backgroundColor: 'transparent',
    fontFamily: 'Poppins_500Medium',
    zIndex: 1,
  },
  input: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.text || '#FFFFFF',
    padding: 0,
    margin: 0,
    minHeight: 22,
  },
  androidGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  errorText: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: palette.error || '#EF4444',
  },
});
