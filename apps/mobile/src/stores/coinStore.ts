// Coin (Jeton) store — Zustand store for in-app currency
// Persists balance and daily check-in state to AsyncStorage via storage utility

import { create } from 'zustand';
import { storage } from '../utils/storage';
import { api } from '../services/api';

export interface CoinPack {
  id: string;
  coins: number;
  price: string;
  bestValue?: boolean;
}

// Pricing aligned with GOLD_PACKS_TRY in @luma/shared/types/package.ts
export const COIN_PACKS: CoinPack[] = [
  { id: 'gold_50', coins: 50, price: '₺29,99' },
  { id: 'gold_150', coins: 150, price: '₺79,99' },
  { id: 'gold_500', coins: 500, price: '₺199,99', bestValue: true },
  { id: 'gold_1000', coins: 1000, price: '₺349,99' },
];

export const DM_COST = 50;
export const AD_REWARD_MIN = 5;
export const AD_REWARD_MAX = 10;

// ── Spend costs ──
export const INSTANT_MESSAGE_COST = 20;
export const PROFILE_BOOST_COST = 100;
export const SUPER_LIKE_COST = 25; // aligned with GOLD_COSTS.SUPER_LIKE in @luma/shared

// ── Earn rewards ──
export const DAILY_CHECKIN_REWARD = 5;
export const PROFILE_COMPLETION_REWARD = 50;
export const ACTIVITY_CREATION_REWARD = 10;

// ── Boost duration ──
export const BOOST_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// ── Persistence keys ──
const STORAGE_KEYS = {
  BALANCE: 'coin.balance',
  LAST_DAILY_CHECKIN: 'coin.lastDailyCheckin',
  TRANSACTIONS: 'coin.transactions',
} as const;

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

// ── Persistence helpers ──

/** Save current balance to AsyncStorage */
function persistBalance(balance: number): void {
  storage.setNumber(STORAGE_KEYS.BALANCE, balance);
}

/** Save last daily check-in date to AsyncStorage */
function persistLastCheckin(date: string | null): void {
  if (date) {
    storage.setString(STORAGE_KEYS.LAST_DAILY_CHECKIN, date);
  } else {
    storage.delete(STORAGE_KEYS.LAST_DAILY_CHECKIN);
  }
}

/** Save recent transactions to AsyncStorage (last 50 to avoid bloat) */
function persistTransactions(transactions: CoinTransaction[]): void {
  const trimmed = transactions.slice(0, 50);
  storage.setString(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(trimmed));
}

/** Load persisted balance from AsyncStorage (returns null if not set) */
function loadPersistedBalance(): number | null {
  return storage.getNumber(STORAGE_KEYS.BALANCE);
}

/** Load persisted last daily check-in date */
function loadPersistedLastCheckin(): string | null {
  return storage.getString(STORAGE_KEYS.LAST_DAILY_CHECKIN);
}

/** Load persisted transactions */
function loadPersistedTransactions(): CoinTransaction[] {
  const raw = storage.getString(STORAGE_KEYS.TRANSACTIONS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CoinTransaction[];
  } catch {
    return [];
  }
}

export const useCoinStore = create<CoinState>((set, get) => ({
  // Initial state — 0 default, will be hydrated from storage/API in fetchBalance
  balance: 0,
  isLoading: false,
  transactions: [],
  adCooldownUntil: null,
  lastDailyCheckin: null,
  boostActiveUntil: null,

  // Actions
  fetchBalance: async () => {
    set({ isLoading: true });

    // 1. Immediately hydrate from local persistence (synchronous via cache)
    const persistedBalance = loadPersistedBalance();
    const persistedCheckin = loadPersistedLastCheckin();
    const persistedTransactions = loadPersistedTransactions();

    if (persistedBalance !== null || persistedCheckin !== null) {
      set({
        balance: persistedBalance ?? 0,
        lastDailyCheckin: persistedCheckin,
        transactions: persistedTransactions,
      });
    }

    // 2. Try real API for authoritative balance
    try {
      const response = await api.get<{ balance: number; lastDailyCheckin?: string }>(
        '/users/me/balance',
      );
      const apiBalance = response.data.balance;
      const apiCheckin = response.data.lastDailyCheckin ?? null;

      set({
        balance: apiBalance,
        lastDailyCheckin: apiCheckin,
        isLoading: false,
      });

      // Sync API values back to local persistence
      persistBalance(apiBalance);
      if (apiCheckin) {
        persistLastCheckin(apiCheckin);
      }
    } catch {
      // API unavailable (dev mode / offline) — keep persisted local values
      set({ isLoading: false });
    }
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

    const newBalance = balance - amount;
    const newTransactions = [transaction, ...get().transactions];

    set({
      balance: newBalance,
      isLoading: false,
      transactions: newTransactions,
    });

    persistBalance(newBalance);
    persistTransactions(newTransactions);

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

    const newBalance = get().balance + amount;
    const newTransactions = [transaction, ...get().transactions];

    set({
      balance: newBalance,
      transactions: newTransactions,
    });

    persistBalance(newBalance);
    persistTransactions(newTransactions);
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

    const newBalance = get().balance + pack.coins;
    const newTransactions = [transaction, ...get().transactions];

    set({
      balance: newBalance,
      isLoading: false,
      transactions: newTransactions,
    });

    persistBalance(newBalance);
    persistTransactions(newTransactions);

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

    const newBalance = get().balance + reward;
    const newTransactions = [transaction, ...get().transactions];

    set({
      balance: newBalance,
      isLoading: false,
      transactions: newTransactions,
    });

    persistBalance(newBalance);
    persistTransactions(newTransactions);

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

    const newBalance = get().balance + DAILY_CHECKIN_REWARD;
    const newTransactions = [transaction, ...get().transactions];

    set({
      balance: newBalance,
      lastDailyCheckin: today,
      transactions: newTransactions,
    });

    persistBalance(newBalance);
    persistLastCheckin(today);
    persistTransactions(newTransactions);

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

    const newBalance = get().balance + PROFILE_COMPLETION_REWARD;
    const newTransactions = [transaction, ...get().transactions];

    set({
      balance: newBalance,
      transactions: newTransactions,
    });

    persistBalance(newBalance);
    persistTransactions(newTransactions);
  },

  claimActivityCreation: () => {
    const transaction: CoinTransaction = {
      id: generateId(),
      amount: ACTIVITY_CREATION_REWARD,
      type: 'earn',
      reason: 'Aktivite oluşturma ödülü',
      timestamp: Date.now(),
    };

    const newBalance = get().balance + ACTIVITY_CREATION_REWARD;
    const newTransactions = [transaction, ...get().transactions];

    set({
      balance: newBalance,
      transactions: newTransactions,
    });

    persistBalance(newBalance);
    persistTransactions(newTransactions);
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

    const newBalance = balance - INSTANT_MESSAGE_COST;
    const newTransactions = [transaction, ...get().transactions];

    set({
      balance: newBalance,
      isLoading: false,
      transactions: newTransactions,
    });

    persistBalance(newBalance);
    persistTransactions(newTransactions);

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

    const newBalance = balance - PROFILE_BOOST_COST;
    const newTransactions = [transaction, ...get().transactions];

    set({
      balance: newBalance,
      isLoading: false,
      boostActiveUntil: Date.now() + BOOST_DURATION_MS,
      transactions: newTransactions,
    });

    persistBalance(newBalance);
    persistTransactions(newTransactions);

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

    const newBalance = balance - SUPER_LIKE_COST;
    const newTransactions = [transaction, ...get().transactions];

    set({
      balance: newBalance,
      isLoading: false,
      transactions: newTransactions,
    });

    persistBalance(newBalance);
    persistTransactions(newTransactions);

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
