// Phone number input with Turkish +90 country code prefix

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  autoFocus?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangeText,
  error,
  autoFocus = false,
}) => {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, error ? styles.containerError : null]}>
        {/* Country code prefix */}
        <View style={styles.prefix}>
          <Text style={styles.flag}>{'\uD83C\uDDF9\uD83C\uDDF7'}</Text>
          <Text style={styles.code}>+90</Text>
          <View style={styles.divider} />
        </View>

        {/* Phone input */}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="5XX XXX XX XX"
          placeholderTextColor={colors.textTertiary}
          keyboardType="phone-pad"
          maxLength={10}
          autoFocus={autoFocus}
          selectionColor={colors.primary}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.inputHeight,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  containerError: {
    borderColor: colors.error,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  flag: {
    fontSize: 20,
  },
  code: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginLeft: spacing.xs,
  },
});
