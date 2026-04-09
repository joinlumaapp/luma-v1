// In-App Purchase service for React Native.
// Uses lazy dynamic import for expo-in-app-purchases to avoid crash when the
// native module is not installed (e.g., running in Expo Go or dev builds).
// All functions gracefully fall back to dev mock mode when the package is missing.

import { Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────

/** Product IDs registered in App Store Connect / Google Play Console */
const PRODUCT_IDS = {
  subscriptions: [
    'com.luma.dating.premium.monthly',
    'com.luma.dating.supreme.monthly',
  ],
  gold: [
    'com.luma.dating.gold.50',
    'com.luma.dating.gold.150',
    'com.luma.dating.gold.500',
    'com.luma.dating.gold.1000',
  ],
} as const;

/** Maps package tier IDs to store product IDs */
const TIER_TO_PRODUCT_ID: Record<string, string> = {
  PREMIUM: 'com.luma.dating.premium.monthly',
  SUPREME: 'com.luma.dating.supreme.monthly',
};

/** Result of a successful purchase containing receipt data */
export interface IAPPurchaseResult {
  receipt: string;
  productId: string;
  transactionId: string;
  platform: 'apple' | 'google';
}

/** Indicates the IAP module is operating in mock mode */
export interface IAPStatus {
  isAvailable: boolean;
  isMockMode: boolean;
}

// ─── Module state ────────────────────────────────────────────────────
// Type stubs for expo-in-app-purchases are declared in src/types/declarations.d.ts
// so TypeScript resolves the module even when the package is not installed.

type ExpoIAPModule = typeof import('expo-in-app-purchases');

let ExpoIAP: ExpoIAPModule | null = null;
let isInitialized = false;
let isMockMode = false;

// ─── Initialization ──────────────────────────────────────────────────

/**
 * Initialize the In-App Purchase connection.
 * Attempts to dynamically import expo-in-app-purchases.
 * If the package is not installed, activates dev mock mode.
 * Should be called once at app startup (e.g., in App.tsx).
 */
async function initIAP(): Promise<IAPStatus> {
  if (isInitialized) {
    return { isAvailable: !isMockMode, isMockMode };
  }

  try {
    ExpoIAP = await import('expo-in-app-purchases');
  } catch {
    if (__DEV__) {
      console.log(
        '[IAP] expo-in-app-purchases not installed — using mock mode for development',
      );
    }
    ExpoIAP = null;
    isMockMode = true;
    isInitialized = true;
    return { isAvailable: false, isMockMode: true };
  }

  try {
    await ExpoIAP.connectAsync();
    isInitialized = true;

    if (__DEV__) {
      console.log('[IAP] Connected to store successfully');
    }

    return { isAvailable: true, isMockMode: false };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (__DEV__) {
      console.warn(
        `[IAP] Store connection failed: ${message} — falling back to mock mode`,
      );
    }
    ExpoIAP = null;
    isMockMode = true;
    isInitialized = true;
    return { isAvailable: false, isMockMode: true };
  }
}

// ─── Subscription Purchase ───────────────────────────────────────────

/**
 * Purchase a subscription for the given package tier.
 * In production, triggers the native store payment sheet.
 * In mock mode, returns a clearly-labeled dev receipt.
 *
 * @param packageTier - The tier to subscribe to ('PREMIUM' | 'SUPREME')
 * @returns Purchase result with receipt data for backend validation
 */
async function purchaseSubscription(
  packageTier: string,
): Promise<IAPPurchaseResult> {
  const normalizedTier = packageTier.toUpperCase();
  const productId = TIER_TO_PRODUCT_ID[normalizedTier];
  if (!productId) {
    throw new Error(`Unknown package tier: ${packageTier}`);
  }

  const currentPlatform: 'apple' | 'google' =
    Platform.OS === 'ios' ? 'apple' : 'google';

  // Mock mode — dev only, blocked in production
  if (isMockMode || !ExpoIAP) {
    if (!__DEV__) {
      throw new Error('IAP not available. Please try again later.');
    }
    return createMockReceipt(productId, currentPlatform, 'subscription');
  }

  // Real IAP flow
  try {
    // Fetch products from the store
    const { results } = await ExpoIAP.getProductsAsync([productId]);

    if (!results || results.length === 0) {
      throw new Error(`Product not found in store: ${productId}`);
    }

    // Initiate the purchase
    await ExpoIAP.purchaseItemAsync(productId);

    // Listen for the purchase result
    const receipt = await waitForPurchaseResult(ExpoIAP);

    return {
      receipt,
      productId,
      transactionId: `${currentPlatform}_${Date.now()}`,
      platform: currentPlatform,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Purchase failed';
    throw new Error(`Subscription purchase failed: ${message}`);
  }
}

// ─── Gold Purchase ───────────────────────────────────────────────────

/**
 * Purchase a gold currency package via in-app purchase.
 * In production, triggers the native store payment sheet.
 * In mock mode, returns a clearly-labeled dev receipt.
 *
 * @param goldProductId - The gold product ID (e.g., 'com.luma.dating.gold.100')
 * @returns Purchase result with receipt data for backend validation
 */
async function purchaseGold(
  goldProductId: string,
): Promise<IAPPurchaseResult> {
  const currentPlatform: 'apple' | 'google' =
    Platform.OS === 'ios' ? 'apple' : 'google';

  // Mock mode — dev only, blocked in production
  if (isMockMode || !ExpoIAP) {
    if (!__DEV__) {
      throw new Error('IAP not available. Please try again later.');
    }
    return createMockReceipt(goldProductId, currentPlatform, 'gold');
  }

  // Real IAP flow
  try {
    const { results } = await ExpoIAP.getProductsAsync([goldProductId]);

    if (!results || results.length === 0) {
      throw new Error(`Gold product not found in store: ${goldProductId}`);
    }

    await ExpoIAP.purchaseItemAsync(goldProductId);

    const receipt = await waitForPurchaseResult(ExpoIAP);

    return {
      receipt,
      productId: goldProductId,
      transactionId: `${currentPlatform}_gold_${Date.now()}`,
      platform: currentPlatform,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Purchase failed';
    throw new Error(`Gold purchase failed: ${message}`);
  }
}

// ─── Restore Purchases ──────────────────────────────────────────────

/**
 * Restore previous purchases (required by App Store guidelines).
 * Returns the latest valid receipt if found.
 */
async function restorePurchases(): Promise<IAPPurchaseResult | null> {
  const currentPlatform: 'apple' | 'google' =
    Platform.OS === 'ios' ? 'apple' : 'google';

  if (isMockMode || !ExpoIAP) {
    if (__DEV__) {
      console.log('[IAP] [MOCK] restorePurchases — no purchases to restore in mock mode');
    }
    return null;
  }

  try {
    const { results } = await ExpoIAP.getPurchaseHistoryAsync();

    if (!results || results.length === 0) {
      return null;
    }

    // Return the most recent purchase
    const latest = results[results.length - 1];

    return {
      receipt: latest.transactionReceipt ?? '',
      productId: latest.productId,
      transactionId: latest.orderId ?? `restore_${Date.now()}`,
      platform: currentPlatform,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Restore failed';
    if (__DEV__) {
      console.warn(`[IAP] Restore purchases failed: ${message}`);
    }
    return null;
  }
}

// ─── Cleanup ─────────────────────────────────────────────────────────

/**
 * Disconnect from the store. Call on app shutdown or when leaving
 * payment screens permanently.
 */
async function disconnectIAP(): Promise<void> {
  if (!ExpoIAP || isMockMode) return;

  try {
    await ExpoIAP.disconnectAsync();
    isInitialized = false;

    if (__DEV__) {
      console.log('[IAP] Disconnected from store');
    }
  } catch {
    // Disconnect failure is non-critical
  }
}

// ─── Status ──────────────────────────────────────────────────────────

/**
 * Get current IAP module status.
 */
function getStatus(): IAPStatus {
  return {
    isAvailable: isInitialized && !isMockMode,
    isMockMode,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Wait for the store to emit a purchase result after purchaseItemAsync.
 * Returns the transaction receipt string.
 */
function waitForPurchaseResult(iapModule: ExpoIAPModule): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      iapModule.setPurchaseListener(() => {
        // Clear listener
      });
      reject(new Error('Purchase timed out after 120 seconds'));
    }, 120_000);

    iapModule.setPurchaseListener(({ responseCode, results }) => {
      clearTimeout(timeout);

      // responseCode 0 = OK
      if (responseCode === 0 && results && results.length > 0) {
        const receipt = results[0].transactionReceipt ?? '';
        if (receipt) {
          // Acknowledge the purchase (required for Google Play)
          if (results[0].acknowledged === false) {
            iapModule
              .finishTransactionAsync(results[0], true)
              .catch(() => {
                // Acknowledgement failure is logged but does not block the flow
              });
          }
          resolve(receipt);
        } else {
          reject(new Error('Purchase completed but no receipt returned'));
        }
      } else {
        // responseCode 1 = user cancelled, 2+ = error
        const reason =
          responseCode === 1 ? 'User cancelled the purchase' : `Store error (code: ${responseCode})`;
        reject(new Error(reason));
      }
    });
  });
}

/**
 * Create a mock receipt for development mode.
 * Clearly labeled so it's obvious during testing and backend validation.
 */
function createMockReceipt(
  productId: string,
  platform: 'apple' | 'google',
  purchaseType: 'subscription' | 'gold',
): IAPPurchaseResult {
  const mockTransactionId = `mock_${platform}_${purchaseType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const mockReceipt = JSON.stringify({
    isMock: true,
    environment: 'development',
    productId,
    transactionId: mockTransactionId,
    purchaseType,
    platform,
    timestamp: new Date().toISOString(),
  });

  if (__DEV__) {
    console.log(`[IAP] [MOCK] ${purchaseType} purchase — product: ${productId}`);
    console.log(`[IAP] [MOCK] Mock receipt generated: ${mockTransactionId}`);
    console.log(
      '[IAP] [MOCK] This is a development mock. In production, a real store receipt will be used.',
    );
  }

  return {
    receipt: mockReceipt,
    productId,
    transactionId: mockTransactionId,
    platform,
  };
}

// ─── Exports ─────────────────────────────────────────────────────────

export const iapService = {
  initIAP,
  purchaseSubscription,
  purchaseGold,
  restorePurchases,
  disconnectIAP,
  getStatus,
  PRODUCT_IDS,
  TIER_TO_PRODUCT_ID,
};
