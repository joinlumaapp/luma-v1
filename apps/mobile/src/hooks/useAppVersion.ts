// Uygulama sürüm kontrolü — başlangıçta sunucudan sürüm bilgisi alır
// Zorunlu güncelleme varsa engelleyici modal, opsiyonel güncelleme varsa banner gösterir

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { APP_VERSION } from '../constants/appInfo';

interface AppInfoResponse {
  appVersion: string;
  minSupportedVersion: string;
  forceUpdateBelow: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  timestamp: string;
}

interface UseAppVersionReturn {
  /** Zorunlu güncelleme gerekli mi */
  forceUpdateRequired: boolean;
  /** Opsiyonel güncelleme mevcut mu */
  optionalUpdateAvailable: boolean;
  /** Bakım modu aktif mi */
  maintenanceMode: boolean;
  /** Bakım modu mesajı */
  maintenanceMessage: string | null;
  /** Sunucudaki en son sürüm */
  latestVersion: string | null;
  /** Kontrol devam ediyor mu */
  isChecking: boolean;
  /** Kontrol hatası */
  error: string | null;
  /** Opsiyonel güncelleme banner'ını kapat */
  dismissOptionalUpdate: () => void;
  /** Sürüm kontrolünü tekrar çalıştır */
  recheckVersion: () => Promise<void>;
}

/**
 * İki sürüm dizgisini karşılaştırır (semver formatı: x.y.z).
 * a < b ise negatif, a > b ise pozitif, eşitse 0 döndürür.
 */
const compareVersions = (a: string, b: string): number => {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const maxLength = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLength; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;

    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }

  return 0;
};

export const useAppVersion = (): UseAppVersionReturn => {
  const [forceUpdateRequired, setForceUpdateRequired] = useState(false);
  const [optionalUpdateAvailable, setOptionalUpdateAvailable] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkVersion = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await api.get<AppInfoResponse>('/app/info');
      const info = response.data;

      setLatestVersion(info.appVersion);
      setMaintenanceMode(info.maintenanceMode);
      setMaintenanceMessage(info.maintenanceMessage);

      // Zorunlu güncelleme kontrolü: mevcut sürüm forceUpdateBelow'dan küçükse
      const isForceRequired = compareVersions(APP_VERSION, info.forceUpdateBelow) < 0;
      setForceUpdateRequired(isForceRequired);

      // Opsiyonel güncelleme kontrolü: mevcut sürüm en son sürümden küçükse
      if (!isForceRequired) {
        const isOptionalAvailable = compareVersions(APP_VERSION, info.appVersion) < 0;
        setOptionalUpdateAvailable(isOptionalAvailable);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Sürüm kontrolü başarısız oldu';
      setError(message);
      // Hata durumunda uygulamayı engelleme — kullanıcının devam etmesine izin ver
    } finally {
      setIsChecking(false);
    }
  }, []);

  const dismissOptionalUpdate = useCallback(() => {
    setOptionalUpdateAvailable(false);
  }, []);

  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  return {
    forceUpdateRequired,
    optionalUpdateAvailable,
    maintenanceMode,
    maintenanceMessage,
    latestVersion,
    isChecking,
    error,
    dismissOptionalUpdate,
    recheckVersion: checkVersion,
  };
};
