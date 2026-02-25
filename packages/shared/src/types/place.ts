// LUMA V1 — Place Types
// Subsystem 13: Places

export interface Place {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface PlaceCheckIn {
  id: string;
  userId: string;
  placeId: string;
  place: Place;
  checkedInAt: string;
}

export interface PlaceMemory {
  id: string;
  placeId: string;
  userId: string;
  note: string | null;
  photoUrl: string | null;
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
  lastVisited: string | null;
  memories: PlaceMemory[];
}

export interface TimelineEntry {
  id: string;
  placeName: string;
  placeId: string;
  note: string | null;
  photoUrl: string | null;
  addedBy: string;
  createdAt: string;
}
