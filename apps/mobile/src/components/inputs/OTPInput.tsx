// 6-digit OTP input with individual digit boxes

import React, { useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface OTPInputProps {
  value: string;
  onChangeText: (text: string) => void;
  length?: number;
  error?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChangeText,
  length = 6,
  error,
}) => {
  const inputRef = useRef<TextInput>(null);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={handlePress} style={styles.container}>
        {digits.map((digit, index) => {
          const isFocused = index === value.length && value.length < length;
          return (
            <View
              key={index}
              style={[
                styles.box,
                isFocused && styles.boxFocused,
                error ? styles.boxError : null,
                digit ? styles.boxFilled : null,
              ]}
            >
              <Text style={styles.digit}>{digit}</Text>
            </View>
          );
        })}
      </Pressable>

      {/* Hidden text input that captures keyboard input */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={(text) => {
          const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
          onChangeText(cleaned);
        }}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        selectionColor="transparent"
        caretHidden
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const BOX_SIZE = 48;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  boxFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  boxError: {
    borderColor: colors.error,
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  digit: {
    fontFamily: typography.h3.fontFamily,
    fontWeight: typography.h3.fontWeight,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
});
