// Premium text input — consistent height, radius, styling across all screens

import React from 'react';
import { TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { inputStyle, inputPlaceholderColor } from '../../theme/spacing';

interface PremiumInputProps extends TextInputProps {
  lightMode?: boolean;
}

export const PremiumInput: React.FC<PremiumInputProps> = ({
  lightMode = false,
  style,
  placeholderTextColor,
  ...props
}) => {
  return (
    <TextInput
      style={[
        styles.input,
        lightMode && styles.inputLight,
        style,
      ]}
      placeholderTextColor={placeholderTextColor ?? (lightMode ? '#9CA3AF' : inputPlaceholderColor)}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    height: inputStyle.height,
    borderRadius: inputStyle.borderRadius,
    backgroundColor: inputStyle.backgroundColor,
    borderWidth: inputStyle.borderWidth,
    borderColor: inputStyle.borderColor,
    paddingHorizontal: inputStyle.paddingHorizontal,
    fontSize: inputStyle.fontSize,
    fontWeight: inputStyle.fontWeight,
    color: '#FFFFFF',
  },
  inputLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    color: '#111827',
  },
});
