import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../../common/decorators/current-user.decorator";

/** Minimum desteklenen uygulama sürümü */
const CURRENT_APP_VERSION = "1.0.0";
const MIN_SUPPORTED_VERSION = "1.0.0";
const FORCE_UPDATE_BELOW = "1.0.0";

interface AppInfoResponse {
  appVersion: string;
  minSupportedVersion: string;
  forceUpdateBelow: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  timestamp: string;
}

interface FeatureFlag {
  enabled: boolean;
  description: string;
}

interface AppConfigResponse {
  featureFlags: Record<string, FeatureFlag>;
  remoteConfig: Record<string, string | number | boolean>;
  timestamp: string;
}

@ApiTags("Health")
@Controller("app")
export class AppInfoController {
  /**
   * GET /app/info
   * Uygulama sürümü, minimum desteklenen sürüm ve bakım modu bilgisi döndürür.
   */
  @Public()
  @Get("info")
  @ApiOperation({
    summary: "Get app version, min supported version & maintenance status",
  })
  getAppInfo(): AppInfoResponse {
    return {
      appVersion: CURRENT_APP_VERSION,
      minSupportedVersion: MIN_SUPPORTED_VERSION,
      forceUpdateBelow: FORCE_UPDATE_BELOW,
      maintenanceMode: false,
      maintenanceMessage: null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /app/config
   * Özellik bayrakları ve uzaktan yapılandırma değerleri döndürür.
   */
  @Public()
  @Get("config")
  @ApiOperation({
    summary: "Get feature flags and remote configuration values",
  })
  getAppConfig(): AppConfigResponse {
    return {
      featureFlags: {
        harmonyRoom: {
          enabled: true,
          description: "Harmony Room sesli sohbet özelliği",
        },
        couplesClub: {
          enabled: true,
          description: "Çiftler Kulübü sosyal alan",
        },
        places: {
          enabled: true,
          description: "Mekan önerileri özelliği",
        },
        premiumQuestions: {
          enabled: true,
          description: "Premium uyumluluk soruları (25 adet)",
        },
        badges: {
          enabled: true,
          description: "Rozet ve başarım sistemi",
        },
        pushNotifications: {
          enabled: true,
          description: "Anlık bildirimler",
        },
        inAppPurchases: {
          enabled: true,
          description: "Uygulama içi satın alımlar",
        },
      },
      remoteConfig: {
        maxPhotos: 6,
        minPhotos: 1,
        maxBioLength: 500,
        freeDailyLikes: 10,
        cardStackSize: 20,
        defaultDistanceKm: 50,
        maxDistanceKm: 200,
        harmonyDefaultDurationMinutes: 30,
        harmonyExtensionMinutes: 15,
        harmonyMaxExtensions: 3,
        supportEmail: "destek@luma.dating",
        privacyUrl: "https://luma.dating/gizlilik",
        termsUrl: "https://luma.dating/kullanim-kosullari",
      },
      timestamp: new Date().toISOString(),
    };
  }
}
