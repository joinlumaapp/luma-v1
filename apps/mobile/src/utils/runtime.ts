// Runtime environment detection utilities

import Constants from 'expo-constants';

/**
 * Returns true when running inside Expo Go (the store client).
 * In development builds or standalone apps this returns false,
 * so native modules like expo-notifications work normally.
 */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}
