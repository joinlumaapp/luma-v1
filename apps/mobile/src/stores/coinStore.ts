// Coin (Jeton) store — Zustand store for in-app currency

import { create } from 'zustand';

export interface CoinPack {
  id: string;
  coins: number;
  price: string;
  bestValue?: boolean;
}

export const COIN_PACKS: CoinPack[] = [
  { id: 'pack_100', coins: 100, price: '\u20BA29' },
  { id: 'pack_500', coins: 500, price: '\u20BA99' },
  { id: 'pack_1000', coins: 1000, price: '\u20BA179', bestValue: true },
];

export const DM_COST = 50;
export const AD_REWARD_MIN = 5;
export const AD_REWARD_MAX = 10;

// ── Spend costs ──
export const INSTANT_MESSAGE_COST = 20;
export const PROFILE_BOOST_COST = 100;
export const SUPER_LIKE_COST = 10;

// ── Earn rewards ──
export const DAILY_CHECKIN_REWARD = 5;
export const PROFILE_COMPLETION_REWARD = 50;
export const ACTIVITY_CREATION_REWARD = 10;

// ── Boost duration ──
export const BOOST_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface CoinTransaction {
  id: string;
  amount: number;
  type: 'spend' | 'earn' | 'purchase';
  reason: string;
  timestamp: number;
}

interface CoinState {
  balance: number;
  isLoading: boolean;
  transactions: CoinTransaction[];
  adCooldownUntil: number | null;
  lastDailyCheckin: string | null;  // ISO date string of last daily checkin
  boostActiveUntil: number | null;  // timestamp when boost expires

  // Actions
  fetchBalance: () => Promise<void>;
  spendCoins: (amount: number, reason: string) => Promise<boolean>;
  earnCoins: (amount: number, source: string) => void;
  purchaseCoins: (packId: string) => Promise<boolean>;
  watchAd: () => Promise<number>;
  startAdCooldown: () => void;
  isAdAvailable: () => boolean;

  // Earn actions
  claimDailyCheckin: () => boolean;
  claimProfileCompletion: () => void;
  claimActivityCreation: () => void;

  // Spend actions
  sendInstantMessage: (recipientId: string) => Promise<boolean>;
  activateProfileBoost: () => Promise<boolean>;
  sendSuperLike: (targetId: string) => Promise<boolean>;

  // Utility
  isBoostActive: () => boolean;
  isDailyCheckinAvailable: () => boolean;
}

const generateId = (): string =>
  `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

export const useCoinStore = create<CoinState>((set, get) => ({
  // Initial state — mock balance
  balance: 120,
  isLoading: false,
  transactions: [],
  adCooldownUntil: null,
  lastDailyCheckin: null,
  boostActiveUntil: null,

  // Actions
  fetchBalance: async () => {
    set({ isLoading: true });
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    set({ isLoading: false });
  },

  spendCoins: async (amount: number, reason: string): Promise<boolean> => {
    const { balance } = get();
    if (balance < amount) return false;

    set({ isLoading: true });
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 300));

    const transaction: CoinTransaction = {
      id: generateId(),
      amount: -amount,
      type: 'spend',
      reason,
      timestamp: Date.now(),
    };

    set((state) => ({
      balance: state.balance - amount,
      isLoading: false,
      transactions: [transaction, ...state.transactions],
    }));

    return true;
  },

  earnCoins: (amount: number, source: string) => {
    const transaction: CoinTransaction = {
      id: generateId(),
      amount,
      type: 'earn',
      reason: source,
      timestamp: Date.now(),
    };

    set((state) => ({
      balance: state.balance + amount,
      transactions: [transaction, ...state.transactions],
    }));
  },

  purchaseCoins: async (packId: string): Promise<boolean> => {
    const pack = COIN_PACKS.find((p) => p.id === packId);
    if (!pack) return false;

    set({ isLoading: true });
    // Mock IAP flow
    await new Promise((resolve) => setTimeout(resolve, 800));

    const transaction: CoinTransaction = {
      id: generateId(),
      amount: pack.coins,
      type: 'purchase',
      reason: `${pack.coins} Jeton paketi`,
      timestamp: Date.now(),
    };

    set((state) => ({
      balance: state.balance + pack.coins,
      isLoading: false,
      transactions: [transaction, ...state.transactions],
    }));

    return true;
  },

  watchAd: async (): Promise<number> => {
    set({ isLoading: true });
    // Mock ad watching delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const reward =
      AD_REWARD_MIN +
      Math.floor(Math.random() * (AD_REWARD_MAX - AD_REWARD_MIN + 1));

    const transaction: CoinTransaction = {
      id: generateId(),
      amount: reward,
      type: 'earn',
      reason: 'Reklam izleme odulu',
      timestamp: Date.now(),
    };

    set((state) => ({
      balance: state.balance + reward,
      isLoading: false,
      transactions: [transaction, ...state.transactions],
    }));

    // Start cooldown (30 minutes)
    get().startAdCooldown();

    return reward;
  },

  startAdCooldown: () => {
    const cooldownMs = 30 * 60 * 1000; // 30 minutes
    set({ adCooldownUntil: Date.now() + cooldownMs });
  },

  isAdAvailable: (): boolean => {
    const { adCooldownUntil } = get();
    if (!adCooldownUntil) return true;
    return Date.now() >= adCooldownUntil;
  },

  claimDailyCheckin: (): boolean => {
    const { lastDailyCheckin } = get();
    const today = new Date().toISOString().split('T')[0];
    if (lastDailyCheckin === today) return false;

    const transaction: CoinTransaction = {
      id: generateId(),
      amount: DAILY_CHECKIN_REWARD,
      type: 'earn',
      reason: 'Günlük giriş ödülü',
      timestamp: Date.now(),
    };

    set((state) => ({
      balance: state.balance + DAILY_CHECKIN_REWARD,
      lastDailyCheckin: today,
      transactions: [transaction, ...state.transactions],
    }));

    return true;
  },

  claimProfileCompletion: () => {
    const transaction: CoinTransaction = {
      id: generateId(),
      amount: PROFILE_COMPLETION_REWARD,
      type: 'earn',
      reason: 'Profil tamamlama ödülü',
      timestamp: Date.now(),
    };

    set((state) => ({
      balance: state.balance + PROFILE_COMPLETION_REWARD,
      transactions: [transaction, ...state.transactions],
    }));
  },

  claimActivityCreation: () => {
    const transaction: CoinTransaction = {
      id: generateId(),
      amount: ACTIVITY_CREATION_REWARD,
      type: 'earn',
      reason: 'Aktivite oluşturma ödülü',
      timestamp: Date.now(),
    };

    set((state) => ({
      balance: state.balance + ACTIVITY_CREATION_REWARD,
      transactions: [transaction, ...state.transactions],
    }));
  },

  sendInstantMessage: async (recipientId: string): Promise<boolean> => {
    const { balance } = get();
    if (balance < INSTANT_MESSAGE_COST) return false;

    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const transaction: CoinTransaction = {
      id: generateId(),
      amount: -INSTANT_MESSAGE_COST,
      type: 'spend',
      reason: `Hızlı mesaj: ${recipientId}`,
      timestamp: Date.now(),
    };

    set((state) => ({
      balance: state.balance - INSTANT_MESSAGE_COST,
      isLoading: false,
      transactions: [transaction, ...state.transactions],
    }));

    return true;
  },

  activateProfileBoost: async (): Promise<boolean> => {
    const { balance } = get();
    if (balance < PROFILE_BOOST_COST) return false;

    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const transaction: CoinTransaction = {
      id: generateId(),
      amount: -PROFILE_BOOST_COST,
      type: 'spend',
      reason: 'Profil Boost (30 dakika)',
      timestamp: Date.now(),
    };

    set((state) => ({
      balance: state.balance - PROFILE_BOOST_COST,
      isLoading: false,
      boostActiveUntil: Date.now() + BOOST_DURATION_MS,
      transactions: [transaction, ...state.transactions],
    }));

    return true;
  },

  sendSuperLike: async (targetId: string): Promise<boolean> => {
    const { balance } = get();
    if (balance < SUPER_LIKE_COST) return false;

    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const transaction: CoinTransaction = {
      id: generateId(),
      amount: -SUPER_LIKE_COST,
      type: 'spend',
      reason: `Süper Beğeni: ${targetId}`,
      timestamp: Date.now(),
    };

    set((state) => ({
      balance: state.balance - SUPER_LIKE_COST,
      isLoading: false,
      transactions: [transaction, ...state.transactions],
    }));

    return true;
  },

  isBoostActive: (): boolean => {
    const { boostActiveUntil } = get();
    if (!boostActiveUntil) return false;
    return Date.now() < boostActiveUntil;
  },

  isDailyCheckinAvailable: (): boolean => {
    const { lastDailyCheckin } = get();
    const today = new Date().toISOString().split('T')[0];
    return lastDailyCheckin !== today;
  },
}));
