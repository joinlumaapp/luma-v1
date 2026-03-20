// LumaLogo — Reusable LUMA 3D heart logo component
// Usage: <LumaLogo size={52} /> or <LumaLogo size="large" />
// Available to all departments for consistent branding across the app

import React from 'react';
import { Image, StyleSheet } from 'react-native';

const lumaLogoSource = require('../../../assets/splash-logo.png');

type PresetSize = 'small' | 'medium' | 'large' | 'xlarge' | 'hero';

const SIZE_MAP: Record<PresetSize, number> = {
  small: 28,
  medium: 40,
  large: 52,
  xlarge: 80,
  hero: 120,
};

interface LumaLogoProps {
  /** Numeric pixel size or preset name */
  size?: number | PresetSize;
  /** Optional style overrides */
  style?: object;
}

export const LumaLogo: React.FC<LumaLogoProps> = ({ size = 'large', style }) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size];

  return (
    <Image
      source={lumaLogoSource}
      style={[{ width: pixelSize, height: pixelSize }, style]}
      resizeMode="contain"
    />
  );
};

/** Direct require for screens that need the raw source (e.g. splash, headers) */
export const lumaLogoAsset = lumaLogoSource;
