// Payment API service — packages, subscriptions, receipts, gold

import api from './api';

export interface PackageInfo {
  id: string;
  tier: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
}

export interface SubscribeRequest {
  packageTier: string;
  platform: string;
  receipt: string;
}

export interface SubscribeResponse {
  subscriptionId: string;
  packageTier: string;
  expiresAt: string;
}

export interface DowngradeRequest {
  targetTier: string;
  platform: string;
  receipt: string;
}

export interface DowngradeResponse {
  downgraded: boolean;
  previousTier: string;
  newTier: string;
  subscriptionId: string;
  expiresAt: string;
}

export interface ValidateReceiptRequest {
  receipt: string;
  platform: string;
}

export interface ValidateReceiptResponse {
  isValid: boolean;
  productId: string;
  expiresAt: string;
}

export interface GoldBalanceResponse {
  balance: number;
}

export interface PurchaseGoldRequest {
  packageId: string;
  receipt: string;
  platform: string;
}

export interface PurchaseGoldResponse {
  newBalance: number;
  goldAdded: number;
}

/** Subscription status response from GET /payments/status */
export interface SubscriptionStatusResponse {
  packageTier: string;
  packageName: string;
  isPaid: boolean;
  isActive: boolean;
  autoRenew: boolean;
  expiryDate: string | null;
  startDate: string | null;
  cancelledAt: string | null;
  isExpiringSoon: boolean;
  isTrial: boolean;
  trialDaysRemaining: number;
  isInGracePeriod: boolean;
  platform: string | null;
  goldBalance: number;
  features: {
    dailySwipes: number;
    coreQuestions: number;
    premiumQuestions: number;
    harmonyMinutes: number;
    monthlyGold: number;
    dailyCompatibilityChecks: number;
    dailySuperCompatibility: number;
    seeWhoLikesYou: boolean;
    profileBoost: boolean;
    readReceipts: boolean;
    undoSwipe: boolean;
    priorityInFeed: boolean;
  };
}

/** Gold transaction entry from GET /payments/gold/history */
export interface GoldTransaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

/** Paginated gold history response */
export interface GoldHistoryResponse {
  transactions: GoldTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const paymentService = {
  // Get all subscription packages (4 tiers)
  getPackages: async (): Promise<PackageInfo[]> => {
    const response = await api.get<PackageInfo[]>('/payments/packages');
    return response.data;
  },

  // Subscribe to a package tier
  subscribe: async (data: SubscribeRequest): Promise<SubscribeResponse> => {
    const response = await api.post<SubscribeResponse>(
      '/payments/subscribe',
      data,
    );
    return response.data;
  },

  // Cancel current subscription
  cancelSubscription: async (): Promise<void> => {
    await api.delete('/payments/subscribe');
  },

  // Downgrade to a lower package tier
  downgradePackage: async (data: DowngradeRequest): Promise<DowngradeResponse> => {
    const response = await api.post<DowngradeResponse>(
      '/payments/package/downgrade',
      data,
    );
    return response.data;
  },

  // Validate App Store / Play Store receipt
  validateReceipt: async (data: ValidateReceiptRequest): Promise<ValidateReceiptResponse> => {
    const response = await api.post<ValidateReceiptResponse>(
      '/payments/validate-receipt',
      data,
    );
    return response.data;
  },

  // Get current gold balance
  getGoldBalance: async (): Promise<GoldBalanceResponse> => {
    const response = await api.get<GoldBalanceResponse>('/payments/gold/balance');
    return response.data;
  },

  // Purchase gold via in-app purchase
  purchaseGold: async (data: PurchaseGoldRequest): Promise<PurchaseGoldResponse> => {
    const response = await api.post<PurchaseGoldResponse>(
      '/payments/gold/purchase',
      data,
    );
    return response.data;
  },

  // Get current subscription status (tier, expiry, gold balance, features)
  getSubscriptionStatus: async (): Promise<SubscriptionStatusResponse> => {
    const response = await api.get<SubscriptionStatusResponse>(
      '/payments/status',
    );
    return response.data;
  },

  // Get gold transaction history with pagination
  getGoldHistory: async (
    page: number = 1,
    limit: number = 20,
  ): Promise<GoldHistoryResponse> => {
    const response = await api.get<GoldHistoryResponse>(
      `/payments/gold/history?page=${page}&limit=${limit}`,
    );
    return response.data;
  },
};
