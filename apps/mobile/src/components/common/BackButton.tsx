// Premium circular back button — consistent across ALL screens

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { backButtonStyle } from '../../theme/spacing';

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  style?: object;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  color = '#FFFFFF',
  style,
}) => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => navigation.goBack())}
      style={[styles.container, style]}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel="Geri"
      accessibilityRole="button"
    >
      <Ionicons name="chevron-back" size={24} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: backButtonStyle.width,
    height: backButtonStyle.height,
    borderRadius: backButtonStyle.borderRadius,
    backgroundColor: backButtonStyle.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
