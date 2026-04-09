import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_ENV === 'development';
const IS_PREVIEW = process.env.APP_ENV === 'preview';
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? '5a31e1e3-32b8-4ecf-a021-2de457659dc3';

const getAppName = (): string => {
  if (IS_DEV) return 'LUMA (Dev)';
  if (IS_PREVIEW) return 'LUMA (Preview)';
  return 'LUMA';
};

const getUniqueIdentifier = (): string => {
  if (IS_DEV) return 'com.luma.dating.dev';
  // Preview uses production package name to match google-services.json
  return 'com.luma.dating';
};

const getApiUrl = (): string => {
  if (IS_DEV) return process.env.API_URL ?? 'http://localhost:3000';
  if (IS_PREVIEW) return 'https://luma-v1-production.up.railway.app';
  return 'https://luma-v1-production.up.railway.app';
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'luma',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  scheme: 'luma',
  icon: './assets/icon.png',
  owner: 'luma-dev',

  splash: {
    image: './assets/images/luma-logo-pink-bg.png',
    resizeMode: 'contain',
    backgroundColor: '#E8959E',
  },

  updates: {
    enabled: !IS_DEV && !!EAS_PROJECT_ID,
    url: EAS_PROJECT_ID ? `https://u.expo.dev/${EAS_PROJECT_ID}` : undefined,
  },

  // Only set runtimeVersion when EAS project is configured — otherwise
  // Expo Go may attempt to check for OTA updates and crash on startup
  ...(EAS_PROJECT_ID
    ? { runtimeVersion: { policy: 'appVersion' as const } }
    : {}),

  ios: {
    supportsTablet: false,
    bundleIdentifier: getUniqueIdentifier(),
    buildNumber: '1',
    icon: './assets/icon.png',
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS ?? '',
    },
    associatedDomains: ['applinks:luma.dating', 'applinks:www.luma.dating'],
    infoPlist: {
      NSCameraUsageDescription:
        'LUMA, profil doğrulama ve fotoğraf çekmek için kameranıza erişim istiyor.',
      NSPhotoLibraryUsageDescription:
        'LUMA, profilinize fotoğraf eklemek için galeri erişiminize ihtiyaç duyuyor.',
      NSPhotoLibraryAddUsageDescription:
        'LUMA, fotoğrafları galerinize kaydetmek için izin istiyor.',
      NSLocationWhenInUseUsageDescription:
        'LUMA, yakınındaki kişileri göstermek için konumunuzu kullanıyor.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'LUMA, yakınındaki kişileri göstermek için arka planda konumunuzu kullanıyor.',
      NSMicrophoneUsageDescription:
        'LUMA, sesli mesajlar için mikrofonunuza erişim istiyor.',
      NSUserTrackingUsageDescription:
        'LUMA, size daha iyi bir deneyim sunmak için reklam takibi kullanmak istiyor.',
      ITSAppUsesNonExemptEncryption: false,
      LSApplicationQueriesSchemes: ['instagram', 'twitter', 'tiktok'],
      UIBackgroundModes: ['remote-notification'],
    },
  },

  android: {
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID ?? '',
      },
    },
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#E8959E',
    },
    softwareKeyboardLayoutMode: 'resize',
    package: getUniqueIdentifier(),
    versionCode: 1,
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'READ_MEDIA_IMAGES',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'POST_NOTIFICATIONS',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'RECORD_AUDIO',
    ],
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'luma.dating', pathPrefix: '/' },
          { scheme: 'https', host: 'www.luma.dating', pathPrefix: '/' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },

  plugins: [
    [
      './plugins/withAndroidStatusBar',
      {
        statusBarColor: '#0d0d14',
        lightIcons: true,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#3D1B5B',
        sounds: [],
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'LUMA, profil doğrulama ve fotoğraf çekmek için kameranıza erişim istiyor.',
        microphonePermission:
          'LUMA, sesli mesajlar için mikrofonunuza erişim istiyor.',
        recordAudioAndroid: true,
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'LUMA, yakınındaki kişileri göstermek için konumunuzu kullanıyor.',
        locationAlwaysPermission:
          'LUMA, yakınındaki kişileri göstermek için arka planda konumunuzu kullanıyor.',
        locationWhenInUsePermission:
          'LUMA, yakınındaki kişileri göstermek için konumunuzu kullanıyor.',
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'LUMA, profilinize fotoğraf eklemek için galeri erişiminize ihtiyaç duyuyor.',
        cameraPermission:
          'LUMA, profil doğrulama ve fotoğraf çekmek için kameranıza erişim istiyor.',
      },
    ],
  ],

  experiments: {
    typedRoutes: false,
  },

  extra: {
    apiUrl: getApiUrl(),
    appEnv: process.env.APP_ENV ?? 'development',
    sentryDsn: process.env.SENTRY_DSN ?? '',
    mixpanelToken: process.env.MIXPANEL_TOKEN ?? '',
    revenueCatApiKeyIos: process.env.REVENUECAT_API_KEY_IOS ?? '',
    revenueCatApiKeyAndroid: process.env.REVENUECAT_API_KEY_ANDROID ?? '',
    eas: {
      projectId: EAS_PROJECT_ID || undefined,
    },
  },
});
