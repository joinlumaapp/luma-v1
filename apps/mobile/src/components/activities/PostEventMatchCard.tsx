// PostEventMatchCard — Shows after event ends, suggests connections with attendees
// "Bu etkinlikte kimlerle tanistin?" flow

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CachedAvatar } from '../common/CachedAvatar';
import { colors, palette } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontWeights } from '../../theme/typography';

interface Attendee {
  userId: string;
  name: string;
  photoUrl: string;
  isVerified: boolean;
}

interface PostEventMatchCardProps {
  eventTitle: string;
  eventEmoji: string;
  attendees: Attendee[];
  onMatchPress: (userId: string) => void;
  onChatPress: (userId: string) => void;
  onDismiss: () => void;
}

export const PostEventMatchCard: React.FC<PostEventMatchCardProps> = ({
  eventTitle,
  eventEmoji,
  attendees,
  onMatchPress,
  onChatPress,
  onDismiss,
}) => {
  if (attendees.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>{eventEmoji}</Text>
          <View>
            <Text style={styles.headerTitle}>Etkinlik Sona Erdi</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{eventTitle}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.prompt}>Bu etkinlikte kimlerle tanismak istersin?</Text>

      {/* Attendee list */}
      {attendees.map((attendee) => (
        <View key={attendee.userId} style={styles.attendeeRow}>
          <CachedAvatar uri={attendee.photoUrl} size={44} borderRadius={22} />
          <View style={styles.attendeeInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.attendeeName}>{attendee.name}</Text>
              {attendee.isVerified && (
                <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => onChatPress(attendee.userId)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={16} color={palette.purple[600]} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onMatchPress(attendee.userId)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[palette.purple[500], palette.pink[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.matchBtn}
            >
              <Ionicons name="heart" size={16} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerEmoji: { fontSize: 24 },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
  },
  prompt: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  attendeeInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeeName: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  chatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.purple[500] + '12',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.purple[500] + '25',
  },
  matchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
