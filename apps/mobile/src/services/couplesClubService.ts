// Couples Club API service — events, RSVP, leaderboard

import api from './api';

export interface CouplesEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  capacity: number;
  attendeeCount: number;
  isRsvped: boolean;
  createdByName: string;
  imageUrl: string | null;
  isPro: boolean;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  date: string;
  location: string;
  capacity: number;
}

export interface LeaderboardEntry {
  rank: number;
  coupleId: string;
  partnerAName: string;
  partnerBName: string;
  score: number;
  badgeCount: number;
  durationDays: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  myRank: number | null;
}

export const couplesClubService = {
  /**
   * Ciftler kulubundeki etkinlikleri listele.
   */
  getEvents: async (): Promise<CouplesEvent[]> => {
    const response = await api.get<CouplesEvent[]>('/couples-club/events');
    return response.data;
  },

  /**
   * Bir etkinlige katilim bildirimi yap.
   */
  rsvpEvent: async (eventId: string): Promise<void> => {
    await api.post(`/couples-club/events/${eventId}/rsvp`);
  },

  /**
   * Bir etkinlik katilimini iptal et.
   */
  cancelRsvp: async (eventId: string): Promise<void> => {
    await api.delete(`/couples-club/events/${eventId}/rsvp`);
  },

  /**
   * Yeni bir etkinlik olustur (Pro+ kullanicilar icin).
   */
  createEvent: async (data: CreateEventRequest): Promise<CouplesEvent> => {
    const response = await api.post<CouplesEvent>('/couples-club/events', data);
    return response.data;
  },

  /**
   * Ciftler siralamasi (leaderboard) bilgilerini al.
   */
  getLeaderboard: async (): Promise<LeaderboardResponse> => {
    const response = await api.get<LeaderboardResponse>('/couples-club/leaderboard');
    return response.data;
  },
};
