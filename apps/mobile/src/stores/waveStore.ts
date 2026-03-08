// Wave store — Zustand store for wave (greeting) feature state

import { create } from 'zustand';
import { waveService } from '../services/waveService';
import type { Wave, WaveQuota } from '../services/waveService';

interface WaveState {
  // State
  receivedWaves: Wave[];
  sentWaves: Wave[];
  quota: WaveQuota | null;
  isLoading: boolean;
  pendingCount: number;

  // Actions
  fetchReceivedWaves: () => Promise<void>;
  fetchSentWaves: () => Promise<void>;
  fetchQuota: () => Promise<void>;
  sendWave: (receiverId: string, useCoins?: boolean) => Promise<boolean>;
  respondToWave: (waveId: string, accept: boolean) => Promise<string | null>;
}

export const useWaveStore = create<WaveState>((set, _get) => ({
  // Initial state
  receivedWaves: [],
  sentWaves: [],
  quota: null,
  isLoading: false,
  pendingCount: 0,

  // Actions
  fetchReceivedWaves: async () => {
    set({ isLoading: true });
    try {
      const response = await waveService.getReceivedWaves();
      const pending = response.waves.filter((w) => w.status === 'pending').length;
      set({
        receivedWaves: response.waves,
        pendingCount: pending,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchSentWaves: async () => {
    try {
      const response = await waveService.getSentWaves();
      set({ sentWaves: response.waves });
    } catch {
      // Silent fail
    }
  },

  fetchQuota: async () => {
    try {
      const quota = await waveService.getQuota();
      set({ quota });
    } catch {
      // Silent fail
    }
  },

  sendWave: async (receiverId, useCoins = false) => {
    try {
      const result = await waveService.sendWave(receiverId, useCoins);
      set((state) => ({
        sentWaves: [result.wave, ...state.sentWaves],
        quota: state.quota
          ? {
              ...state.quota,
              used: state.quota.used + 1,
              remaining: Math.max(0, state.quota.remaining - 1),
            }
          : state.quota,
      }));
      return true;
    } catch {
      return false;
    }
  },

  respondToWave: async (waveId, accept) => {
    try {
      const result = await waveService.respondToWave(waveId, accept);
      set((state) => ({
        receivedWaves: state.receivedWaves.map((w) =>
          w.id === waveId ? { ...w, status: accept ? 'accepted' as const : 'ignored' as const } : w,
        ),
        pendingCount: Math.max(0, state.pendingCount - 1),
      }));
      return result.chatId;
    } catch {
      return null;
    }
  },
}));
