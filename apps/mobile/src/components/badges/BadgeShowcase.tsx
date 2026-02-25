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
  first_spark: { icon: '*', color: '#F59E0B', label: 'Ilk Kivilcim' },
  chat_master: { icon: '#', color: '#3B82F6', label: 'Sohbet Ustasi' },
  question_explorer: { icon: '?', color: '#8B5CF6', label: 'Merak Uzmani' },
  soul_mate: { icon: '&', color: '#EC4899', label: 'Ruh Ikizi' },
  verified_star: { icon: 'V', color: '#10B981', label: 'Dogrulanmis' },
  couple_goal: { icon: '+', color: '#EF4444', label: 'Cift Hedefi' },
  explorer: { icon: 'O', color: '#6366F1', label: 'Kasif' },
  gold_member: { icon: 'G', color: '#FFD700', label: 'Altin Uye' },
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
    fontWeight: '700',
  },
});
