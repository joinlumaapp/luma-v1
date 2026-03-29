// BrandedBackground — Subtle LUMA logo watermark pattern for beige surfaces
// Scatters the logo in various sizes at very low opacity (3-7%)
// Organic placement, partially cropped at edges, sparse and elegant
// Usage: Place as first child inside a beige-background container

import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const lumaLogo = require('../../../assets/splash-logo.png');

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Organic logo positions — hand-placed for natural distribution ────

interface LogoPlacement {
  size: number;
  top: number;
  left: number;
  opacity: number;
  rotate: string;
}

const PLACEMENTS: LogoPlacement[] = [
  // Top area — partially cropped at edges
  { size: 90, top: -20, left: -25, opacity: 0.07, rotate: '-12deg' },
  { size: 40, top: 30, left: SCREEN_W * 0.48, opacity: 0.06, rotate: '20deg' },
  { size: 55, top: 55, left: SCREEN_W * 0.78, opacity: 0.075, rotate: '8deg' },

  // Upper-mid
  { size: 65, top: SCREEN_H * 0.15, left: SCREEN_W * 0.06, opacity: 0.065, rotate: '15deg' },
  { size: 35, top: SCREEN_H * 0.20, left: SCREEN_W * 0.62, opacity: 0.07, rotate: '-5deg' },
  { size: 48, top: SCREEN_H * 0.26, left: SCREEN_W * 0.88, opacity: 0.06, rotate: '30deg' },

  // Center area
  { size: 50, top: SCREEN_H * 0.35, left: SCREEN_W * 0.30, opacity: 0.065, rotate: '22deg' },
  { size: 75, top: SCREEN_H * 0.40, left: -15, opacity: 0.06, rotate: '-18deg' },
  { size: 38, top: SCREEN_H * 0.45, left: SCREEN_W * 0.70, opacity: 0.07, rotate: '12deg' },

  // Lower-mid
  { size: 42, top: SCREEN_H * 0.55, left: SCREEN_W * 0.15, opacity: 0.07, rotate: '10deg' },
  { size: 60, top: SCREEN_H * 0.60, left: SCREEN_W * 0.55, opacity: 0.065, rotate: '-8deg' },
  { size: 35, top: SCREEN_H * 0.66, left: SCREEN_W * 0.90, opacity: 0.06, rotate: '28deg' },

  // Bottom area — partially cropped
  { size: 80, top: SCREEN_H * 0.75, left: SCREEN_W * 0.05, opacity: 0.06, rotate: '25deg' },
  { size: 45, top: SCREEN_H * 0.82, left: SCREEN_W * 0.45, opacity: 0.075, rotate: '-15deg' },
  { size: 55, top: SCREEN_H * 0.90, left: SCREEN_W - 20, opacity: 0.065, rotate: '5deg' },
];

export const BrandedBackground: React.FC = () => (
  <View style={styles.container} pointerEvents="none">
    {PLACEMENTS.map((p, i) => (
      <Image
        key={`luma-bg-${i}`}
        source={lumaLogo}
        style={[
          styles.logo,
          {
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            opacity: p.opacity,
            transform: [{ rotate: p.rotate }],
          },
        ]}
        resizeMode="contain"
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  logo: {
    position: 'absolute',
  },
});
