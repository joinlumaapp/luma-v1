// LUMA Favorite Spot Categories — icon + color mapping for profile spots

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface SpotCategory {
  key: string;
  label: string;
  icon: IoniconsName;
  color: string;
  bgColor: string;
}

export const SPOT_CATEGORIES: Record<string, SpotCategory> = {
  park: { key: 'park', label: 'Park', icon: 'leaf', color: '#10B981', bgColor: '#D1FAE5' },
  kafe: { key: 'kafe', label: 'Kafe', icon: 'cafe', color: '#92400E', bgColor: '#FEF3C7' },
  sahil: { key: 'sahil', label: 'Sahil', icon: 'water', color: '#0EA5E9', bgColor: '#E0F2FE' },
  restoran: { key: 'restoran', label: 'Restoran', icon: 'restaurant', color: '#F97316', bgColor: '#FED7AA' },
  bar: { key: 'bar', label: 'Bar', icon: 'wine', color: '#7C3AED', bgColor: '#EDE9FE' },
  muze: { key: 'muze', label: 'Müze', icon: 'business', color: '#6366F1', bgColor: '#E0E7FF' },
  semt: { key: 'semt', label: 'Semt', icon: 'location', color: '#EF4444', bgColor: '#FEE2E2' },
  doga: { key: 'doga', label: 'Doğa', icon: 'leaf', color: '#059669', bgColor: '#A7F3D0' },
  tarihi: { key: 'tarihi', label: 'Tarihi', icon: 'flag', color: '#B45309', bgColor: '#FDE68A' },
  eglence: { key: 'eglence', label: 'Eğlence', icon: 'musical-notes', color: '#EC4899', bgColor: '#FCE7F3' },
};

export const getSpotCategory = (key: string): SpotCategory =>
  SPOT_CATEGORIES[key] ?? SPOT_CATEGORIES.semt;
