// Location service — permission handling, current location, and backend sync

import * as Location from 'expo-location';
import api from './api';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

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
