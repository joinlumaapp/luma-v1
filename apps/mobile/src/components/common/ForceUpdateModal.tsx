// Zorunlu güncelleme modalı — tam ekran, kapatılamaz
// Kullanıcıyı mağazaya yönlendirir

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { getStoreUrl } from '../../constants/appInfo';

interface ForceUpdateModalProps {
  /** Modal görünür mü */
  visible: boolean;
  /** Opsiyonel güncelleme mi (true ise kapatılabilir) */
  isOptional?: boolean;
  /** Opsiyonel güncelleme kapatıldığında çağrılır */
  onDismiss?: () => void;
}

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  visible,
  isOptional = false,
  onDismiss,
}) => {
  const handleUpdate = async (): Promise<void> => {
    const storeUrl = getStoreUrl();
    const canOpen = await Linking.canOpenURL(storeUrl);

    if (canOpen) {
      await Linking.openURL(storeUrl);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={isOptional ? onDismiss : undefined}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>L</Text>
            </View>
          </View>

          {/* Başlık */}
          <Text style={styles.title}>
            {isOptional ? 'Yeni Sürüm Mevcut' : 'Güncelleme Gerekli'}
          </Text>

          {/* Açıklama */}
          <Text style={styles.description}>
            {isOptional
              ? "LUMA'nın yeni sürümü hazır! En iyi deneyimi yaşamak için güncelle."
              : "Daha iyi bir deneyim için LUMA'yı güncelle. Bu güncelleme uygulamayı kullanmaya devam etmek için gereklidir."}
          </Text>

          {/* Güncelle butonu */}
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdate}
            activeOpacity={0.8}
          >
            <Text style={styles.updateButtonText}>Güncelle</Text>
          </TouchableOpacity>

          {/* Kapat butonu (sadece opsiyonel güncelleme için) */}
          {isOptional && onDismiss ? (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissButtonText}>Daha Sonra</Text>
            </TouchableOpacity>
          ) : null}

          {/* Zorunlu güncelleme uyarı notu */}
          {!isOptional ? (
            <Text style={styles.warningNote}>
              Bu güncelleme olmadan uygulamayı kullanamazsın.
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  iconText: {
    ...typography.h1,
    color: colors.text,
    fontSize: 48,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  updateButton: {
    width: '100%',
    height: layout.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  updateButtonText: {
    ...typography.button,
    color: colors.text,
  },
  dismissButton: {
    width: '100%',
    height: layout.buttonHeight,
    backgroundColor: 'transparent',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dismissButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  warningNote: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
