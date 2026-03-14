// Wave service — send quick greetings to nearby users without matching
// Free: 3/day, Premium+: 20/day, or 5 gold coins per wave
// Also handles paid first messages (150 Jeton) for pre-match messaging

import api from './api';

// ─── Interfaces ────────────────────────────────────────────────────

export type WaveStatus = 'pending' | 'accepted' | 'ignored';

export interface Wave {
  id: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl: string | null;
  receiverId: string;
  receiverName: string;
  receiverPhotoUrl: string | null;
  status: WaveStatus;
  createdAt: string;
}

export interface WaveQuota {
  dailyLimit: number;
  used: number;
  remaining: number;
  coinCost: number;
}

interface WavesResponse {
  waves: Wave[];
  total: number;
}

interface SendWaveResponse {
  wave: Wave;
  usedCoins: boolean;
}

interface RespondWaveResponse {
  chatId: string | null;
}

// ─── Paid Message Types ──────────────────────────────────────────

export interface PaidMessageResponse {
  matchId: string;
  messageId: string;
  chatCreated: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────

const MOCK_RECEIVED_WAVES: Wave[] = [
  {
    id: 'w1',
    senderId: 'u10',
    senderName: 'Ari',
    senderPhotoUrl: null,
    receiverId: 'current_user',
    receiverName: 'Sen',
    receiverPhotoUrl: null,
    status: 'pending',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'w2',
    senderId: 'u11',
    senderName: 'Deniz',
    senderPhotoUrl: null,
    receiverId: 'current_user',
    receiverName: 'Sen',
    receiverPhotoUrl: null,
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'w3',
    senderId: 'u12',
    senderName: 'Selin',
    senderPhotoUrl: null,
    receiverId: 'current_user',
    receiverName: 'Sen',
    receiverPhotoUrl: null,
    status: 'accepted',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'w4',
    senderId: 'u13',
    senderName: 'Kaan',
    senderPhotoUrl: null,
    receiverId: 'current_user',
    receiverName: 'Sen',
    receiverPhotoUrl: null,
    status: 'ignored',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_SENT_WAVES: Wave[] = [
  {
    id: 'w5',
    senderId: 'current_user',
    senderName: 'Sen',
    senderPhotoUrl: null,
    receiverId: 'u14',
    receiverName: 'Elif',
    receiverPhotoUrl: null,
    status: 'pending',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'w6',
    senderId: 'current_user',
    senderName: 'Sen',
    senderPhotoUrl: null,
    receiverId: 'u15',
    receiverName: 'Merve',
    receiverPhotoUrl: null,
    status: 'accepted',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Service ───────────────────────────────────────────────────────

export const waveService = {
  getReceivedWaves: async (): Promise<WavesResponse> => {
    try {
      const response = await api.get<WavesResponse>('/waves/received');
      return response.data;
    } catch {
      return { waves: MOCK_RECEIVED_WAVES, total: MOCK_RECEIVED_WAVES.length };
    }
  },

  getSentWaves: async (): Promise<WavesResponse> => {
    try {
      const response = await api.get<WavesResponse>('/waves/sent');
      return response.data;
    } catch {
      return { waves: MOCK_SENT_WAVES, total: MOCK_SENT_WAVES.length };
    }
  },

  getQuota: async (): Promise<WaveQuota> => {
    try {
      const response = await api.get<WaveQuota>('/waves/quota');
      return response.data;
    } catch {
      // Mock: free user defaults
      return { dailyLimit: 3, used: 1, remaining: 2, coinCost: 5 };
    }
  },

  sendWave: async (receiverId: string, useCoins: boolean = false): Promise<SendWaveResponse> => {
    try {
      const response = await api.post<SendWaveResponse>('/waves', { receiverId, useCoins });
      return response.data;
    } catch {
      const mockWave: Wave = {
        id: `w_${Date.now()}`,
        senderId: 'current_user',
        senderName: 'Sen',
        senderPhotoUrl: null,
        receiverId,
        receiverName: 'Kullanici',
        receiverPhotoUrl: null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      return { wave: mockWave, usedCoins: useCoins };
    }
  },

  respondToWave: async (waveId: string, accept: boolean): Promise<RespondWaveResponse> => {
    try {
      const response = await api.post<RespondWaveResponse>(`/waves/${waveId}/respond`, { accept });
      return response.data;
    } catch {
      return { chatId: accept ? `chat_wave_${waveId}` : null };
    }
  },

  // ── Paid First Message ─────────────────────────────────────────

  sendPaidMessage: async (
    receiverId: string,
    message: string,
  ): Promise<PaidMessageResponse> => {
    try {
      const response = await api.post<PaidMessageResponse>('/messages/paid', {
        receiverId,
        message,
        amount: 150,
        currency: 'JETON',
      });
      return response.data;
    } catch {
      // Mock fallback — simulate successful payment and chat creation
      const mockMatchId = `paid_${Date.now()}`;
      return {
        matchId: mockMatchId,
        messageId: `msg_${Date.now()}`,
        chatCreated: true,
      };
    }
  },
};
