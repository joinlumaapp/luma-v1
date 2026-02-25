// Report screen — navigation wrapper for ReportModal
// Used in DiscoveryStack and MatchesStack as a modal screen

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { DiscoveryStackParamList } from '../../navigation/types';
import { ReportModal } from '../../components/modals/ReportModal';
import { api } from '../../services/api';

type ReportRouteProp = RouteProp<DiscoveryStackParamList, 'Report'>;

export const ReportScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ReportRouteProp>();
  const { userId, userName } = route.params;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSubmit = useCallback(
    async (reason: string, details: string) => {
      setIsSubmitting(true);
      try {
        await api.post('/moderation/report', {
          reportedUserId: userId,
          reason,
          details,
        });
        Alert.alert(
          'Sikayet Gonderildi',
          'Sikayetiniz incelenmek uzere iletildi. Tesekkur ederiz.',
          [{ text: 'Tamam', onPress: handleClose }],
        );
      } catch {
        if (__DEV__) {
          console.warn('[ReportScreen] Sikayet gonderilemedi');
        }
        Alert.alert(
          'Hata',
          'Sikayet gonderilirken bir hata olustu. Lutfen tekrar deneyin.',
          [{ text: 'Tamam' }],
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, handleClose],
  );

  return (
    <View style={styles.container}>
      <ReportModal
        visible
        userId={userId}
        userName={userName}
        onSubmit={(reason, details) => void handleSubmit(reason, details)}
        onClose={handleClose}
        isSubmitting={isSubmitting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
