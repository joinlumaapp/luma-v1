// Crossed Paths store — Zustand store for crossed paths state

import { create } from 'zustand';
import { crossedPathsService } from '../services/crossedPathsService';
import type { CrossedPathProfile } from '../services/crossedPathsService';

interface CrossedPathsState {
  // State
  paths: CrossedPathProfile[];
  isLoading: boolean;
  totalCount: number;

  // Actions
  fetchPaths: () => Promise<void>;
  likePath: (userId: string) => Promise<boolean>;
  skipPath: (userId: string) => Promise<void>;
  removePath: (userId: string) => void;
}

export const useCrossedPathsStore = create<CrossedPathsState>((set, _get) => ({
  // Initial state
  paths: [],
  isLoading: false,
  totalCount: 0,

  // Actions
  fetchPaths: async () => {
    set({ isLoading: true });
    try {
      const response = await crossedPathsService.getCrossedPaths();
      set({
        paths: response.crossedPaths,
        totalCount: response.total,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  likePath: async (userId) => {
    try {
      const result = await crossedPathsService.likeCrossedPath(userId);
      set((state) => ({
        paths: state.paths.filter((p) => p.userId !== userId),
        totalCount: state.totalCount - 1,
      }));
      return result.matched;
    } catch {
      return false;
    }
  },

  skipPath: async (userId) => {
    try {
      await crossedPathsService.skipCrossedPath(userId);
      set((state) => ({
        paths: state.paths.filter((p) => p.userId !== userId),
        totalCount: state.totalCount - 1,
      }));
    } catch {
      // Silent fail
    }
  },

  removePath: (userId) =>
    set((state) => ({
      paths: state.paths.filter((p) => p.userId !== userId),
      totalCount: state.totalCount - 1,
    })),
}));
