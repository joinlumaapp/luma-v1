// Platform-safe haptics wrapper — noop on web, real on native
import { Platform } from 'react-native';

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

const isNative = Platform.OS !== 'web';

// Lazy-load expo-haptics only on native platforms
let Haptics: typeof import('expo-haptics') | null = null;

if (isNative) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Haptics = require('expo-haptics');
  } catch {
    // expo-haptics not available
  }
}

const IMPACT_MAP: Record<ImpactStyle, string> = {
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
};

export async function impactAsync(style: ImpactStyle = 'medium'): Promise<void> {
  if (!Haptics) return;
  const feedbackStyle = Haptics.ImpactFeedbackStyle[
    IMPACT_MAP[style] as keyof typeof Haptics.ImpactFeedbackStyle
  ];
  await Haptics.impactAsync(feedbackStyle);
}

export async function notificationAsync(type: NotificationType = 'success'): Promise<void> {
  if (!Haptics) return;
  const notificationType = Haptics.NotificationFeedbackType[
    (type.charAt(0).toUpperCase() + type.slice(1)) as keyof typeof Haptics.NotificationFeedbackType
  ];
  await Haptics.notificationAsync(notificationType);
}

export async function selectionAsync(): Promise<void> {
  if (!Haptics) return;
  await Haptics.selectionAsync();
}

// Re-export for convenience — components can do:
// import { impactAsync } from '@/utils/haptics';
// instead of:
// import * as Haptics from 'expo-haptics'; // crashes on web
