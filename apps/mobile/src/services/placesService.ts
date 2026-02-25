// Places API service — check-in, shared places, memories, timeline

import api from './api';

export interface CheckInRequest {
  placeId: string;
  placeName: string;
  latitude: number;
  longitude: number;
  note?: string;
}

export interface CheckInResponse {
  id: string;
  placeId: string;
  placeName: string;
  latitude: number;
  longitude: number;
  note: string | null;
  createdAt: string;
}

/** Place status for map view color-coding */
export type PlaceStatus = 'visited' | 'wishlist' | 'partner_suggestion';

export interface SharedPlace {
  id: string;
  placeId: string;
  placeName: string;
  latitude: number;
  longitude: number;
  visitCount: number;
  lastVisitedAt: string;
  memories: PlaceMemory[];
  /** Used for map view color-coding — defaults to 'visited' */
  status?: PlaceStatus;
}

export interface PlaceMemory {
  id: string;
  placeId: string;
  text: string;
  photoUrl: string | null;
  createdAt: string;
  /** Display name of who added this memory */
  addedBy?: string;
}

export interface AddMemoryRequest {
  placeId: string;
  text: string;
  photoUrl?: string;
}

/** Timeline entry combining place + memory data */
export interface TimelineEntry {
  id: string;
  placeName: string;
  placeId: string;
  note: string | null;
  photoUrl: string | null;
  addedBy: string;
  createdAt: string;
}

export const placesService = {
  // Check in to a place
  checkIn: async (data: CheckInRequest): Promise<CheckInResponse> => {
    const response = await api.post<CheckInResponse>(
      '/places/check-in',
      data,
    );
    return response.data;
  },

  // Get places shared with a matched user
  getSharedPlaces: async (partnerId: string): Promise<SharedPlace[]> => {
    const response = await api.get<SharedPlace[]>(
      `/places/shared/${partnerId}`,
    );
    return response.data;
  },

  // Add a memory to a place
  addMemory: async (data: AddMemoryRequest): Promise<PlaceMemory> => {
    const response = await api.post<PlaceMemory>(
      '/places/memories',
      data,
    );
    return response.data;
  },

  // Get memories timeline for the relationship
  getMemoriesTimeline: async (partnerId: string): Promise<TimelineEntry[]> => {
    const response = await api.get<TimelineEntry[]>(
      `/places/timeline/${partnerId}`,
    );
    return response.data;
  },
};
