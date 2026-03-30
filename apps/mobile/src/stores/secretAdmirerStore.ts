import { create } from 'zustand';
import api from '../services/api';

interface SecretAdmirer {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  candidates: string[];
  guessesUsed: number;
  maxGuesses: number;
  createdAt: string;
  expiresAt: string;
}

interface SecretAdmirerState {
  receivedAdmirers: SecretAdmirer[];
  isLoading: boolean;
  error: string | null;

  fetchReceived: () => Promise<void>;
  sendAdmirer: (receiverId: string) => Promise<{ id: string; costGold: number }>;
  guess: (admirerId: string, guessedUserId: string) => Promise<{ correct: boolean; matchCreated: boolean; guessesRemaining: number }>;
}

export const useSecretAdmirerStore = create<SecretAdmirerState>((set) => ({
  receivedAdmirers: [],
  isLoading: false,
  error: null,

  fetchReceived: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/matches/secret-admirers');
      set({ receivedAdmirers: res.data, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bir hata oluştu';
      set({ error: message, isLoading: false });
    }
  },

  sendAdmirer: async (receiverId: string) => {
    const res = await api.post('/matches/secret-admirer', { receiverId });
    return res.data;
  },

  guess: async (admirerId: string, guessedUserId: string) => {
    const res = await api.post(`/matches/secret-admirer/${admirerId}/guess`, { guessedUserId });
    return res.data;
  },
}));
