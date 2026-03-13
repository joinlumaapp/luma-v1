// Bildirim yönetim servisi — push bildirim tıklamaları ve ön plan bildirim yönetimi
// Bildirim türüne göre doğru ekrana yönlendirme sağlar

import type { NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import type { ParsedDeepLink } from './deepLinkService';
import { navigateToScreen } from './deepLinkService';

// ─── Bildirim Türleri ────────────────────────────────────────────────

/**
 * Push bildirim data payload'ından gelen bildirim türleri.
 * Backend'in gönderdiği `data.type` alanına karşılık gelir.
 */
export type NotificationRouteType =
  | 'new_match'
  | 'NEW_MATCH'
  | 'new_message'
  | 'NEW_MESSAGE'
  | 'new_like'
  | 'PROFILE_LIKE'
  | 'super_like'
  | 'SUPER_LIKE'
  | 'daily_picks'
  | 'DAILY_PICKS'
  | 'badge_earned'
  | 'BADGE_EARNED'
  | 'compatibility_update'
  | 'COMPATIBILITY_UPDATE'
  | 'boost_active'
  | 'BOOST_ACTIVE'
  | 'harmony_invite'
  | 'HARMONY_INVITE'
  | 'harmony_reminder'
  | 'HARMONY_REMINDER'
  | 'relationship_request'
  | 'RELATIONSHIP_REQUEST'
  | 'subscription_expiring'
  | 'SUBSCRIPTION_EXPIRING'
  | 'new_follower'
  | 'NEW_FOLLOWER'
  | 'post_like'
  | 'POST_LIKE'
  | 'post_comment'
  | 'POST_COMMENT'
  | 'comment_reply'
  | 'COMMENT_REPLY'
  | 'system'
  | 'SYSTEM';

// ─── Foreground Bildirim Verisi ──────────────────────────────────────

/** Ön planda gösterilecek bildirim banner verisi */
export interface InAppNotificationData {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// ─── Callback türleri ────────────────────────────────────────────────

type ForegroundNotificationCallback = (notification: InAppNotificationData) => void;

// ─── Foreground Listener Registry ────────────────────────────────────

let foregroundCallback: ForegroundNotificationCallback | null = null;

/**
 * Ön plan bildirim dinleyicisini kaydeder.
 * InAppNotificationBanner bileşeni tarafından kullanılır.
 */
export function registerForegroundListener(
  callback: ForegroundNotificationCallback,
): () => void {
  foregroundCallback = callback;
  return () => {
    foregroundCallback = null;
  };
}

/**
 * Ön planda alınan bir push bildirimi için banner gösterir.
 * notificationStore.setupForegroundListener tarafından çağrılır.
 */
export function handleForegroundNotification(notification: {
  title: string;
  body: string;
  data: Record<string, unknown>;
}): void {
  if (!foregroundCallback) return;

  const notifData: InAppNotificationData = {
    id: `fg_${Date.now()}`,
    title: notification.title,
    body: notification.body,
    type: (notification.data?.type as string) || 'SYSTEM',
    data: notification.data,
    timestamp: Date.now(),
  };

  foregroundCallback(notifData);
}

// ─── Bildirim Tıklama Yönlendirmesi ─────────────────────────────────

/**
 * Bildirim tıklandığında doğru ekrana yönlendirir.
 * Bildirim türü ve data payload'una göre hedef ekranı belirler.
 */
export function handleNotificationTap(
  navigationRef: NavigationContainerRef<RootStackParamList>,
  data: Record<string, unknown>,
): void {
  const parsed = mapNotificationToScreen(data);

  if (!parsed) {
    if (__DEV__) {
      console.warn('[BildirimHandler] Bilinmeyen bildirim türü:', data?.type);
    }
    return;
  }

  navigateToScreen(navigationRef, parsed);
}

/**
 * Bildirim data payload'unu hedef ekran bilgisine dönüştürür.
 * Backend'in gönderdiği `type`, `matchId`, `userId` vb. alanları kullanır.
 */
export function mapNotificationToScreen(
  data: Record<string, unknown>,
): ParsedDeepLink {
  if (!data || !data.type) return null;

  const type = (data.type as string).toUpperCase();

  switch (type) {
    // Yeni esleme — MatchDetailScreen
    case 'NEW_MATCH': {
      const matchId = data.matchId as string | undefined;
      if (!matchId) return null;
      return { screen: 'MatchDetail', params: { matchId } };
    }

    // Yeni mesaj — ChatScreen
    case 'NEW_MESSAGE':
    case 'MESSAGE': {
      const matchId = data.matchId as string | undefined;
      if (!matchId) return null;
      return {
        screen: 'Chat',
        params: {
          matchId,
          partnerName: (data.partnerName as string) || (data.userName as string) || '',
          partnerPhotoUrl: (data.partnerPhotoUrl as string) || (data.userPhoto as string) || '',
        },
      };
    }

    // Yeni begeni — LikesYouScreen
    case 'NEW_LIKE':
    case 'PROFILE_LIKE':
      return { screen: 'LikesYou', params: undefined };

    // Super begeni — LikesYouScreen
    case 'SUPER_LIKE':
      return { screen: 'LikesYou', params: undefined };

    // Gunluk secmeler — DailyPicksScreen
    case 'DAILY_PICKS':
      return { screen: 'DailyPicks', params: undefined };

    // Rozet kazanildi — BadgesScreen
    case 'BADGE_EARNED':
      return { screen: 'Badges', params: undefined };

    // Uyumluluk guncellemesi — CompatibilityInsightScreen
    case 'COMPATIBILITY_UPDATE': {
      const matchId = data.matchId as string | undefined;
      if (!matchId) return null;
      return {
        screen: 'CompatibilityInsight',
        params: {
          matchId,
          partnerName: (data.partnerName as string) || '',
        },
      };
    }

    // Boost aktif — DiscoveryScreen
    case 'BOOST_ACTIVE':
      return { screen: 'Discovery', params: undefined };

    // Harmony daveti — MatchDetailScreen (Harmony orada başlatılır)
    case 'HARMONY_INVITE':
    case 'HARMONY_REMINDER': {
      const matchId = data.matchId as string | undefined;
      if (!matchId) return null;
      return { screen: 'MatchDetail', params: { matchId } };
    }

    // İlişki isteği — MatchDetailScreen
    case 'RELATIONSHIP_REQUEST': {
      const matchId = data.matchId as string | undefined;
      if (!matchId) return null;
      return { screen: 'MatchDetail', params: { matchId } };
    }

    // Abonelik süresi doluyor — MembershipPlansScreen
    case 'SUBSCRIPTION_EXPIRING':
      return { screen: 'MembershipPlans', params: undefined };

    // Sistem bildirimi — yönlendirme yok, action alanına bak
    case 'SYSTEM': {
      const action = data.action as string | undefined;
      if (action) {
        return mapActionToScreen(action, data);
      }
      return null;
    }

    // Sosyal bildirimler — SocialFeed ekranina yonlendir
    case 'NEW_FOLLOWER':
    case 'POST_LIKE':
    case 'POST_COMMENT':
    case 'COMMENT_REPLY':
      return { screen: 'SocialFeed', params: undefined };

    // Re-engagement ve FOMO bildirimleri
    case 'RE_ENGAGEMENT':
    case 'FOMO':
      return { screen: 'Discovery', params: undefined };

    case 'MATCH_URGENCY': {
      const matchId = data.matchId as string | undefined;
      if (matchId) {
        return { screen: 'MatchDetail', params: { matchId } };
      }
      return { screen: 'Discovery', params: undefined };
    }

    case 'MISSED_LIKES':
      return { screen: 'MembershipPlans', params: undefined };

    case 'WEEKLY_CONTENT': {
      const subtype = data.subtype as string | undefined;
      if (subtype === 'sunday_report' || subtype === 'weekly_report') {
        return { screen: 'Discovery', params: undefined };
      }
      return { screen: 'Discovery', params: undefined };
    }

    case 'DATE_PLAN_REMINDER': {
      const matchId = data.matchId as string | undefined;
      if (matchId) {
        return { screen: 'MatchDetail', params: { matchId } };
      }
      return null;
    }

    default:
      if (__DEV__) {
        console.warn(`[BildirimHandler] Bilinmeyen bildirim türü: ${type}`);
      }
      return null;
  }
}

/**
 * Sistem bildirimi action alanına göre ekran eşlemesi yapar.
 * NotificationAction enum'undaki değerleri destekler.
 */
function mapActionToScreen(
  action: string,
  data: Record<string, unknown>,
): ParsedDeepLink {
  const actionUpper = action.toUpperCase();

  switch (actionUpper) {
    case 'DAILY_PICKS':
      return { screen: 'DailyPicks', params: undefined };

    case 'BOOST_ACTIVE':
      return { screen: 'Discovery', params: undefined };

    case 'INACTIVE_REMINDER':
      return { screen: 'Discovery', params: undefined };

    case 'MATCH_EXPIRING': {
      const matchId = data.matchId as string | undefined;
      if (matchId) {
        return { screen: 'MatchDetail', params: { matchId } };
      }
      return null;
    }

    case 'COMPATIBILITY_UPDATE': {
      const matchId = data.matchId as string | undefined;
      if (!matchId) return null;
      return {
        screen: 'CompatibilityInsight',
        params: {
          matchId,
          partnerName: (data.partnerName as string) || '',
        },
      };
    }

    case 'ANNOUNCEMENT':
      return null; // Duyurular genel bildirimdir, yönlendirme gerekmez

    default:
      return null;
  }
}
