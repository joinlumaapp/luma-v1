// Test mode store — enables founder bypass of OTP/selfie verification in __DEV__

import { create } from 'zustand';

interface TestModeState {
  isTestMode: boolean;
  setTestMode: (value: boolean) => void;
}

export const useTestModeStore = create<TestModeState>((set) => ({
  isTestMode: false,
  setTestMode: (value: boolean) => set({ isTestMode: value }),
}));
