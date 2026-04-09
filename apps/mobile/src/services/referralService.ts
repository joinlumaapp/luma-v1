// Referral API service — invite friends, claim codes, track referrals

import api from './api';

export interface ReferralInfo {
  referralCode: string;
  referralCount: number;
  totalEarned: number;
  referrals: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    joinedAt: string;
  }>;
}

export interface ClaimResult {
  referrerName: string;
  bonusJeton: number;
}

export interface DiscountStatus {
  hasDiscount: boolean;
  discountPercent: number;
  expiresAt: string | null;
  packageTier: string | null;
  originalPrice: number | null;
  discountedPrice: number | null;
}

export const referralService = {
  getMyReferrals: async (): Promise<ReferralInfo> => {
    const res = await api.get('/referral/me');
    return res.data;
  },

  claimReferralCode: async (code: string): Promise<ClaimResult> => {
    const res = await api.post('/referral/claim', { code });
    return res.data;
  },

  getDiscountStatus: async (): Promise<DiscountStatus> => {
    const res = await api.get('/payments/discount/status');
    return res.data;
  },

  claimDiscount: async (): Promise<{ claimed: boolean; newExpiryDate: string; discountPercent: number }> => {
    const res = await api.post('/payments/discount/claim');
    return res.data;
  },
};
