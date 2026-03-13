// Location service — permission handling, current location, backend sync,
// Haversine distance calculation, and Turkish distance formatting

import * as Location from 'expo-location';
import api from './api';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Haversine formula: calculates the great-circle distance between
 * two points on Earth given their latitude and longitude in degrees.
 * Returns distance in kilometers.
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Earth's radius in km
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Format distance in Turkish for display on discovery cards.
 * - < 1 km:    "500 m uzaginda"
 * - 1-10 km:   "2.3 km uzaginda"
 * - 10-50 km:  "15 km uzaginda"
 * - 50+ km:    "Ayni sehirde" or exact km
 * - null:      returns null (don't show)
 */
export const formatDistanceTr = (km: number | null | undefined): string | null => {
  if (km == null) return null;

  if (km < 1) {
    const meters = Math.round(km * 1000);
    // Show in 100m increments, minimum 100m
    const rounded = Math.max(100, Math.round(meters / 100) * 100);
    return `${rounded} m uzaginda`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km uzaginda`;
  }
  if (km < 50) {
    return `${Math.round(km)} km uzaginda`;
  }
  // 50+ km: show "Ayni sehirde" for moderate distances, exact for very far
  if (km < 100) {
    return 'Ayni sehirde';
  }
  return `${Math.round(km)} km uzaginda`;
};

export const locationService = {
  /**
   * Request foreground location permission from the user.
   * Returns true if permission was granted.
   */
  requestPermission: async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Check if location permission is already granted (no prompt).
   */
  checkPermission: async (): Promise<boolean> => {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Get current device location using balanced accuracy.
   * Returns coordinates or null if unavailable.
   */
  getCurrentLocation: async (): Promise<UserCoordinates | null> => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch {
      return null;
    }
  },

  /**
   * Send current location coordinates to the backend.
   * Updates the user's profile with the new lat/lng.
   */
  updateServerLocation: async (
    latitude: number,
    longitude: number,
  ): Promise<{ updated: boolean }> => {
    const response = await api.patch<{ updated: boolean }>(
      '/profiles/location',
      { latitude, longitude },
    );
    return response.data;
  },

  /**
   * Alias for updateServerLocation — matches the task spec naming.
   */
  sendLocationToBackend: async (
    latitude: number,
    longitude: number,
  ): Promise<{ updated: boolean }> => {
    return locationService.updateServerLocation(latitude, longitude);
  },

  /**
   * Convenience: get location and send to backend in one call.
   * Returns the coordinates that were sent, or null if unavailable.
   */
  syncLocation: async (): Promise<UserCoordinates | null> => {
    const coords = await locationService.getCurrentLocation();
    if (coords) {
      await locationService.updateServerLocation(coords.latitude, coords.longitude);
    }
    return coords;
  },
};
