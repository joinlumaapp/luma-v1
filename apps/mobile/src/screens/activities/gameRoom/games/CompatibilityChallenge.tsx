// CompatibilityChallenge — Placeholder game component for Uyumluluk Challenge

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export const CompatibilityChallenge: React.FC<{ roomId: string }> = ({ roomId: _roomId }) => (
  <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.gradient}>
    <SafeAreaView style={styles.container}>
      <Text style={styles.icon}>💕</Text>
      <Text style={styles.title}>Uyumluluk Challenge</Text>
      <Text style={styles.subtitle}>Oyun yukleniyor...</Text>
    </SafeAreaView>
  </LinearGradient>
);

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 8,
  },
});
