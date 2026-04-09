// Premium welcome modal — replaces plain Alert for new user onboarding
// Animated scale-in + confetti + gradient CTA

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  FadeIn,
} from 'react-native-reanimated';
import { ConfettiOverlay } from '../animations/ConfettiOverlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WelcomeModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ visible, onDismiss }) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      opacity.value = withDelay(100, withSpring(1, { damping: 20 }));
    } else {
      scale.value = 0.8;
      opacity.value = 0;
    }
  }, [visible, scale, opacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        {/* Confetti behind modal */}
        <ConfettiOverlay visible={visible} />

        <Animated.View style={[styles.card, cardStyle]}>
          {/* Heart emoji / logo */}
          <Animated.Text entering={FadeIn.delay(300)} style={styles.heartEmoji}>
            {'\uD83D\uDC9C'}
          </Animated.Text>

          {/* Title */}
          <Text style={styles.title}>Ho{'\u015F'} geldin!</Text>

          {/* Body */}
          <Text style={styles.body}>
            {'\u2B50'} 48 saatlik Premium deneyimin ba{'\u015F'}lad{'\u0131'}!{'\n'}
            Premium {'\u00F6'}zelliklerinin keyfini {'\u00E7'}{'\u0131'}kar.
          </Text>

          <Text style={styles.body}>
            {'\uD83C\uDF81'} Ho{'\u015F'} geldin hediyesi: <Text style={styles.bodyBold}>100 Jeton!</Text>
          </Text>

          {/* CTA Button */}
          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.85}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={['#9B6BF8', '#EC4899'] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Ba{'\u015F'}layal{'\u0131'}m!</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  heartEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 12,
  },
  bodyBold: {
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#8B5CF6',
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: '#9B6BF8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
