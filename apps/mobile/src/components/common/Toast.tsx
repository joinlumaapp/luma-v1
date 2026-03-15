// Toast system — provider + hook with 4 types, auto-dismiss 3s

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

const TOAST_DURATION = 3000;
const ANIMATION_DURATION = 300;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const getToastColors = (type: ToastType): { bg: string; border: string; icon: string } => {
  switch (type) {
    case 'success':
      return { bg: colors.success + '15', border: colors.success, icon: colors.success };
    case 'error':
      return { bg: colors.error + '15', border: colors.error, icon: colors.error };
    case 'warning':
      return { bg: colors.warning + '15', border: colors.warning, icon: colors.warning };
    case 'info':
      return { bg: colors.info + '15', border: colors.info, icon: colors.info };
  }
};

const getToastIcon = (type: ToastType): string => {
  switch (type) {
    case 'success':
      return '\u2713';
    case 'error':
      return '\u2717';
    case 'warning':
      return '!';
    case 'info':
      return 'i';
  }
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss(toast.id);
      });
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [translateY, opacity, onDismiss, toast.id]);

  const toastColors = getToastColors(toast.type);

  return (
    <Animated.View
      style={[
        styles.toastItem,
        {
          backgroundColor: toastColors.bg,
          borderLeftColor: toastColors.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: toastColors.border }]}>
        <Text style={styles.iconText}>{getToastIcon(toast.type)}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.toastTitle}>{toast.title}</Text>
        {toast.message ? (
          <Text style={styles.toastMessage} numberOfLines={2}>
            {toast.message}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    counterRef.current += 1;
    const id = `toast-${counterRef.current}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={[styles.container, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    gap: spacing.sm,
  },
  toastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    width: SCREEN_WIDTH - spacing.md * 2,
    gap: spacing.md,
    ...shadows.medium,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  textContainer: {
    flex: 1,
  },
  toastTitle: {
    ...typography.bodySmall,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  toastMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
