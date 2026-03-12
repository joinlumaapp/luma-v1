import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_ENV === 'development';
const IS_PREVIEW = process.env.APP_ENV === 'preview';

const getAppName = (): string => {
  if (IS_DEV) return 'LUMA (Dev)';
  if (IS_PREVIEW) return 'LUMA (Preview)';
  return 'LUMA';
};

const getUniqueIdentifier = (): string => {
  if (IS_DEV) return 'com.luma.dating.dev';
  if (IS_PREVIEW) return 'com.luma.dating.preview';
  return 'com.luma.dating';
};

const getApiUrl = (): string => {
  if (IS_DEV) return process.env.API_URL ?? 'http://localhost:3000';
  if (IS_PREVIEW) return 'https://api-preview.luma.dating';
  return 'https://api.luma.dating';
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
  owner: 'luma-dating',

  splash: {
    image: './assets/splash-logo.png',
    resizeMode: 'contain',
    backgroundColor: '#3D1B5B',
  },

  updates: {
    enabled: !IS_DEV,
    url: 'https://u.expo.dev/LUMA_PROJECT_ID',
  },

  runtimeVersion: {
    policy: 'appVersion',
  },

  ios: {
    supportsTablet: false,
    bundleIdentifier: getUniqueIdentifier(),
    buildNumber: '1',
    icon: './assets/icon.png',
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS ?? 'GOOGLE_MAPS_API_KEY_IOS_PLACEHOLDER',
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
        'LUMA, Harmony Room sesli görüşmeleri için mikrofonunuza erişim istiyor.',
      NSUserTrackingUsageDescription:
        'LUMA, size daha iyi bir deneyim sunmak için reklam takibi kullanmak istiyor.',
      ITSAppUsesNonExemptEncryption: false,
      LSApplicationQueriesSchemes: ['instagram', 'twitter', 'tiktok'],
      UIBackgroundModes: ['remote-notification'],
    },
  },

  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F5B0C0',
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
          'LUMA, Harmony Room sesli görüşmeleri için mikrofonunuza erişim istiyor.',
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
    'expo-haptics',
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
      projectId: process.env.EAS_PROJECT_ID ?? 'LUMA_PROJECT_ID',
    },
  },
});
