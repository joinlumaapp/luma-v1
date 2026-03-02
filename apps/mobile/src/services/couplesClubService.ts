// Couples Club API service — events, RSVP
// Routes through /relationships controller on backend

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
    const response = await api.get<CouplesEvent[]>('/relationships/events');
    return response.data;
  },

  /**
   * Bir etkinlige katilim bildirimi yap.
   */
  rsvpEvent: async (eventId: string): Promise<void> => {
    await api.post(`/relationships/events/${eventId}/rsvp`, { status: 'attending' });
  },

  /**
   * Bir etkinlik katilimini iptal et.
   * Backend uses POST with status values instead of DELETE.
   */
  cancelRsvp: async (eventId: string): Promise<void> => {
    await api.post(`/relationships/events/${eventId}/rsvp`, { status: 'declined' });
  },

  /**
   * Yeni bir etkinlik olustur.
   */
  createEvent: async (data: CreateEventRequest): Promise<CouplesEvent> => {
    const response = await api.post<CouplesEvent>('/relationships/events', data);
    return response.data;
  },

  /**
   * Liderlik tablosunu getir.
   */
  getLeaderboard: async (): Promise<LeaderboardResponse> => {
    const response = await api.get<LeaderboardResponse>('/relationships/leaderboard');
    return response.data;
  },
};
