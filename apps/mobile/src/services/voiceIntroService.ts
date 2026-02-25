// Voice Intro API service — upload, get, and delete voice introductions

import { Platform } from 'react-native';
import api from './api';

// ─── Request / Response Types ────────────────────────────────

export interface VoiceIntroFile {
  uri: string;
  name: string;
  type: string;
}

export interface VoiceIntroResponse {
  voiceIntroUrl: string;
  duration: number;
}

// ─── Service ─────────────────────────────────────────────────

export const voiceIntroService = {
  // Upload a voice intro via multipart/form-data
  uploadVoiceIntro: async (
    file: VoiceIntroFile,
    durationSeconds: number,
  ): Promise<VoiceIntroResponse> => {
    const formData = new FormData();
    formData.append('voiceIntro', {
      uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
      type: file.type,
      name: file.name,
    } as unknown as Blob);
    formData.append('durationSeconds', String(durationSeconds));

    const response = await api.post<VoiceIntroResponse>(
      '/profiles/voice-intro',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  // Get a user's voice intro (returns null if none exists)
  getVoiceIntro: async (userId: string): Promise<VoiceIntroResponse | null> => {
    const response = await api.get<VoiceIntroResponse | null>(
      `/profiles/voice-intro/${userId}`,
    );
    return response.data;
  },

  // Delete the current user's voice intro
  deleteVoiceIntro: async (): Promise<void> => {
    await api.delete('/profiles/voice-intro');
  },
};
