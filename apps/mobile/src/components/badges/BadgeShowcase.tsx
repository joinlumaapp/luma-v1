// BadgeShowcase — Small row of circular badge icons for discovery cards.
// Shows up to 3 earned badges as compact colored circles.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing } from '../../theme/spacing';

// Badge key to icon/color mapping (matching BadgesScreen definitions)
interface BadgeMeta {
  icon: string;
  color: string;
  label: string;
}

const BADGE_META: Record<string, BadgeMeta> = {
  first_spark: { icon: '*', color: '#F59E0B', label: 'İlk Kıvılcım' },
  chat_master: { icon: '#', color: '#3B82F6', label: 'Sohbet Ustası' },
  question_explorer: { icon: '?', color: '#8B5CF6', label: 'Merak Uzmanı' },
  soul_mate: { icon: '&', color: '#EC4899', label: 'Ruh İkizi' },
  verified_star: { icon: 'V', color: '#10B981', label: 'Doğrulanmış' },
  couple_goal: { icon: '+', color: '#EF4444', label: 'Çift Hedefi' },
  explorer: { icon: 'O', color: '#6366F1', label: 'Kaşif' },
  deep_match: { icon: 'D', color: '#8B5CF6', label: 'Derin Uyum' },
  new_member: { icon: '✨', color: '#F59E0B', label: 'Yeni Üye' },
  popular: { icon: '🔥', color: '#EF4444', label: 'Popüler' },
  active: { icon: '💬', color: '#3B82F6', label: 'Aktif' },
  photo_lover: { icon: '📸', color: '#EC4899', label: 'Fotoğraf Tutkunu' },
  romantic: { icon: '❤️', color: '#F43F5E', label: 'Romantik' },
};

interface BadgeShowcaseProps {
  /** Badge keys to display (max 3 recommended) */
  badgeKeys: string[];
  /** Size of each badge circle (default 24) */
  size?: number;
}

export const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({
  badgeKeys,
  size = 24,
}) => {
  if (badgeKeys.length === 0) return null;

  return (
    <View style={styles.container}>
      {badgeKeys.map((key) => {
        const meta = BADGE_META[key];
        if (!meta) return null;

        return (
          <View
            key={key}
            style={[
              styles.badgeCircle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: meta.color + '25',
                borderColor: meta.color + '60',
              },
            ]}
          >
            <Text
              style={[
                styles.badgeIcon,
                {
                  color: meta.color,
                  fontSize: size * 0.5,
                },
              ]}
            >
              {meta.icon}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  badgeIcon: {
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});
