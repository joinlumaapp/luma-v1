// LUMA StyledText — Automatically maps fontWeight to Poppins font family
// This ensures all Text using fontWeight gets the correct Poppins variant.

import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { poppinsFonts } from '../../theme/typography';

/** Map numeric fontWeight to Poppins font family name */
const weightToFont: Record<string, string> = {
  '300': poppinsFonts.light,
  '400': poppinsFonts.regular,
  'normal': poppinsFonts.regular,
  '500': poppinsFonts.medium,
  '600': poppinsFonts.semibold,
  '700': poppinsFonts.bold,
  'bold': poppinsFonts.bold,
  '800': poppinsFonts.extrabold,
  '900': poppinsFonts.black,
};

export const StyledText: React.FC<TextProps> = ({ style, ...props }) => {
  const flatStyle = StyleSheet.flatten(style) || {};
  const weight = flatStyle.fontWeight as string | undefined;

  // If no explicit fontFamily is set, auto-map from fontWeight
  if (!flatStyle.fontFamily || flatStyle.fontFamily === 'System' || flatStyle.fontFamily === 'Roboto') {
    const poppinsFamily = weightToFont[weight || '400'] || poppinsFonts.regular;
    return <RNText {...props} style={[style, { fontFamily: poppinsFamily }]} />;
  }

  return <RNText {...props} style={style} />;
};
