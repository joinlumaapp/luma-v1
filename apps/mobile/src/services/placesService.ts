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
  checkInId: string;
  placeId: string;
  placeName: string;
  checkedInAt: string;
}

/** Place status for map view color-coding */
export type PlaceStatus = 'visited' | 'wishlist' | 'partner_suggestion';

interface SharedPlaceMemory {
  id: string;
  note: string | null;
  photoUrl: string | null;
  userId: string;
  createdAt: string;
}

export interface SharedPlace {
  placeId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  myVisits: number;
  partnerVisits: number;
  lastVisited: string;
  memories: SharedPlaceMemory[];
  /** Used for map view color-coding — defaults to 'visited' */
  status?: PlaceStatus;
}

export interface PlaceMemory {
  memoryId: string;
  placeId: string;
  text: string | null;
  photoUrl: string | null;
  createdAt: string;
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

/** Backend wrapper responses */
interface SharedPlacesResponse {
  sharedPlaces: SharedPlace[];
  total: number;
}

interface TimelineResponse {
  timeline: TimelineEntry[];
  total: number;
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
    const response = await api.get<SharedPlacesResponse>(
      `/places/shared/${partnerId}`,
    );
    const body = response.data;
    return (body as SharedPlacesResponse).sharedPlaces ?? (body as unknown as SharedPlace[]);
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
    const response = await api.get<TimelineResponse>(
      `/places/timeline/${partnerId}`,
    );
    const body = response.data;
    return (body as TimelineResponse).timeline ?? (body as unknown as TimelineEntry[]);
  },
};
