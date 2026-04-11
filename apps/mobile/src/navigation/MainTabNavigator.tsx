// Main tab navigator — 5 tabs: Feed, Discovery, Activities, Matches, Profile
// Enhanced: default slide_from_right, modal slide_from_bottom, premium tab bar
// Enhanced: unread message badge on Matches tab
// Performance: lazy:true defers tab mount, freezeOnBlur prevents hidden re-renders,
//   detachInactiveScreens frees memory, React.memo stack navigators,
//   deferred mount for heavy sub-screens (chat, edit profile, etc.)

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import type {
  MainTabParamList,
  DiscoveryStackParamList,
  MatchesStackParamList,
  FeedStackParamList,
  LiveStackParamList,
  ProfileStackParamList,
} from './types';
import { borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useChatStore } from '../stores/chatStore';
import { useMatchStore } from '../stores/matchStore';
import { useNotificationStore } from '../stores/notificationStore';
import { NotificationPermissionModal } from '../components/notifications/NotificationPermissionModal';
import { PromotionModal } from '../components/premium/PromotionModal';
import { usePresenceTracking } from '../hooks/usePresence';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../hooks/useSocket';
import { setupCallStoreListeners } from '../stores/callStore';
import { withDeferredMount } from './LazyScreens';

// Discovery screens
import { DiscoveryScreen } from '../screens/discovery/DiscoveryScreen';
import { ProfilePreviewScreen } from '../screens/discovery/ProfilePreviewScreen';
import { FilterScreen } from '../screens/discovery/FilterScreen';
import { LikesYouScreen } from '../screens/discovery/LikesYouScreen';
import { DailyPicksScreen } from '../screens/discovery/DailyPicksScreen';
import { DailyQuestionScreen } from '../screens/compatibility/DailyQuestionScreen';

// Matches screens
import { MatchesListScreen } from '../screens/matches/MatchesListScreen';
import { ViewersPreviewScreen } from '../screens/matches/ViewersPreviewScreen';
import { MatchDetailScreen } from '../screens/matches/MatchDetailScreen';
import { CompatibilityInsightScreen } from '../screens/compatibility/CompatibilityInsightScreen';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';

// Profile screens
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { MyPostsScreen } from '../screens/profile/MyPostsScreen';
import { PlacesScreen } from '../screens/places/PlacesScreen';
import { NotificationSettingsScreen } from '../screens/settings/NotificationSettingsScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { MembershipPlansScreen } from '../screens/settings/MembershipPlansScreen';
import { PersonalitySelectionScreen } from '../screens/profile/PersonalitySelectionScreen';
import { ProfileCoachScreen } from '../screens/profile/ProfileCoachScreen';
import { FollowListScreen } from '../screens/profile/FollowListScreen';
import { BlockedUsersScreen } from '../screens/settings/BlockedUsersScreen';
import { SafetyCenterScreen } from '../screens/settings/SafetyCenterScreen';
import { AccountDeletionScreen } from '../screens/settings/AccountDeletionScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { QuestionsScreen } from '../screens/profile/QuestionsScreen';
import { InterestPickerScreen } from '../screens/profile/InterestPickerScreen';
import { WeeklyReportScreen } from '../screens/profile/WeeklyReportScreen';
import { ReportScreen } from '../screens/moderation/ReportScreen';
import { JetonMarketScreen } from '../screens/store/JetonMarketScreen';

import { BoostMarketScreen } from '../screens/store/BoostMarketScreen';

// Feed extra screens
import { FeedProfileScreen } from '../screens/feed/FeedProfileScreen';
import { PostDetailScreen } from '../screens/feed/PostDetailScreen';
import { StoryViewerScreen } from '../screens/discovery/StoryViewerScreen';
import { StoryCreator } from '../components/stories/StoryCreator';

// Discovery extra screens
import { CrossedPathsScreen } from '../screens/discovery/CrossedPathsScreen';
import { SocialFeedScreen } from '../screens/discovery/SocialFeedScreen';
import { InstantConnectScreen } from '../screens/discovery/InstantConnectScreen';

// Live screen (replaces Activities)
import { LiveScreen } from '../screens/live/LiveScreen';

// Waves screen
import { WavesScreen } from '../screens/waves/WavesScreen';

// Matches extra screens
import { DatePlannerScreen } from '../screens/matches/DatePlannerScreen';
import SecretAdmirerScreen from '../screens/matches/SecretAdmirerScreen';
import WeeklyTopScreen from '../screens/matches/WeeklyTopScreen';
import { CallScreen } from '../screens/chat/CallScreen';
import { IcebreakerGameScreen } from '../screens/icebreaker/IcebreakerGameScreen';
import { TwoTruthsGameScreen } from '../screens/icebreaker/TwoTruthsGameScreen';
import { ThisOrThatGameScreen } from '../screens/icebreaker/ThisOrThatGameScreen';
import { QuickQuestionsGameScreen } from '../screens/icebreaker/QuickQuestionsGameScreen';
import { IncomingCallOverlay } from '../components/chat/IncomingCallOverlay';
import { MinimizedCallBar } from '../components/chat/MinimizedCallBar';
// ── Deferred Screens ─────────────────────────────────────────
// Heavy screens that benefit from deferred mount after navigation animation
const DeferredCompatibilityInsight = withDeferredMount(CompatibilityInsightScreen);
const DeferredDailyQuestion = withDeferredMount(DailyQuestionScreen);
const DeferredChatScreen = withDeferredMount(ChatScreen);
const DeferredEditProfile = withDeferredMount(EditProfileScreen);
// Stack navigators for each tab
const DiscoveryStack = createNativeStackNavigator<DiscoveryStackParamList>();
const MatchesStack = createNativeStackNavigator<MatchesStackParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const LiveStack = createNativeStackNavigator<LiveStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Creates a tabPress listener that always resets the stack to root
 * when the user taps a tab — whether switching to it or re-pressing it.
 * Also triggers haptic feedback (Impact.Light) on every tab press.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTabResetListener(navigation: any, route: { name: string }) {
  return {
    tabPress: (e: { preventDefault: () => void }) => {
      // Haptic feedback on every tab press
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const tabState = navigation.getState?.();
      if (!tabState?.routes) return;
      const thisRoute = tabState.routes.find((r: { name: string }) => r.name === route.name);
      // Reset if the tab has any nested navigation state (deep stack)
      if (thisRoute?.state) {
        e.preventDefault();
        navigation.dispatch(
          CommonActions.reset({
            ...tabState,
            routes: tabState.routes.map((r: { name: string; state?: unknown }) =>
              r.name === route.name ? { ...r, state: undefined } : r,
            ),
          }),
        );
      }
    },
  };
}

// Ionicons name map for active/inactive tab states
const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  compass: { active: 'compass', inactive: 'compass-outline' },
  heart: { active: 'heart', inactive: 'heart-outline' },
  feed: { active: 'home', inactive: 'home-outline' },
  live: { active: 'videocam', inactive: 'videocam-outline' },
  user: { active: 'person', inactive: 'person-outline' },
};

// Tab icon component with animated scale press + animated active dot indicator
const TabIcon: React.FC<{ name: string; focused: boolean }> = React.memo(({ name, focused }) => {
  const icons = TAB_ICONS[name];
  const iconName = icons ? (focused ? icons.active : icons.inactive) : 'help-outline';
  const iconColor = focused ? '#9B6BF8' : 'rgba(255, 255, 255, 0.4)';

  // Scale press animation — bounces from 0.85 to 1.0 when tab changes
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // Indicator dot scale — animates from 0 to 1 when becoming active
  const dotScale = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    if (focused) {
      // Bounce the icon
      scaleAnim.setValue(0.85);
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
      // Scale in the dot
      Animated.spring(dotScale, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      // Scale out the dot
      Animated.timing(dotScale, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [focused, scaleAnim, dotScale]);

  return (
    <Animated.View style={[styles.tabIconContainer, { transform: [{ scale: scaleAnim }] }]}>
      <Ionicons name={iconName} size={26} color={iconColor} />
      <Animated.View
        style={[
          styles.tabIndicator,
          { transform: [{ scale: dotScale }], opacity: dotScale },
        ]}
      />
    </Animated.View>
  );
});
TabIcon.displayName = 'TabIcon';

// Tab icon with unread count badge (red circle with white number) — memoized
// Animation 7: Badge bounces when unread count increases
const TabIconWithBadge: React.FC<{
  name: string;
  focused: boolean;
  badgeCount: number;
}> = React.memo(({ name, focused, badgeCount }) => {
  const badgeScale = useSharedValue(1);
  const prevCountRef = useRef(badgeCount);

  useEffect(() => {
    // Only bounce when count increases (not on initial render or decrease)
    if (badgeCount > prevCountRef.current && badgeCount > 0) {
      badgeScale.value = withSequence(
        withSpring(1.4, { damping: 6, stiffness: 300 }),
        withSpring(0.9, { damping: 8, stiffness: 250 }),
        withSpring(1.1, { damping: 10, stiffness: 200 }),
        withSpring(1.0, { damping: 12, stiffness: 180 }),
      );
    }
    prevCountRef.current = badgeCount;
  }, [badgeCount, badgeScale]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  return (
    <View style={styles.tabIconContainer}>
      <View>
        <TabIcon name={name} focused={focused} />
        {badgeCount > 0 && (
          <Reanimated.View style={[styles.unreadBadge, badgeAnimatedStyle]}>
            <Text style={styles.unreadBadgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </Reanimated.View>
        )}
      </View>
    </View>
  );
});
TabIconWithBadge.displayName = 'TabIconWithBadge';

// Discovery tab stack — default slide_from_right, modals slide_from_bottom
const DiscoveryStackNavigator: React.FC = React.memo(() => (
  <DiscoveryStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      statusBarStyle: 'light',
    }}
  >
    <DiscoveryStack.Screen name="Discovery" component={DiscoveryScreen} />
    <DiscoveryStack.Screen
      name="InstantConnect"
      component={InstantConnectScreen}
      options={{ animation: 'fade', presentation: 'fullScreenModal' }}
    />
    <DiscoveryStack.Screen
      name="ProfilePreview"
      component={ProfilePreviewScreen}
      options={{ animation: 'fade_from_bottom', gestureEnabled: true, gestureDirection: 'vertical' }}
    />
    <DiscoveryStack.Screen
      name="Filter"
      component={FilterScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <DiscoveryStack.Screen
      name="LikesYou"
      component={LikesYouScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <DiscoveryStack.Screen
      name="DailyPicks"
      component={DailyPicksScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <DiscoveryStack.Screen
      name="DailyQuestion"
      component={DeferredDailyQuestion}
      options={{ animation: 'slide_from_bottom' }}
    />
    <DiscoveryStack.Screen
      name="CrossedPaths"
      component={CrossedPathsScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <DiscoveryStack.Screen
      name="Waves"
      component={WavesScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <DiscoveryStack.Screen
      name="Report"
      component={ReportScreen}
      options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
    />
    <DiscoveryStack.Screen
      name="MembershipPlans"
      component={MembershipPlansScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <DiscoveryStack.Screen
      name="JetonMarket"
      component={JetonMarketScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
  </DiscoveryStack.Navigator>
));
DiscoveryStackNavigator.displayName = 'DiscoveryStackNavigator';

// Matches tab stack — default slide_from_right, modals slide_from_bottom
const MatchesStackNavigator: React.FC = React.memo(() => (
  <MatchesStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      statusBarStyle: 'light',
    }}
  >
    <MatchesStack.Screen name="MatchesList" component={MatchesListScreen} />
    <MatchesStack.Screen
      name="ViewersPreview"
      component={ViewersPreviewScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen
      name="ProfilePreview"
      component={ProfilePreviewScreen}
      options={{ animation: 'fade_from_bottom', gestureEnabled: true, gestureDirection: 'vertical' }}
    />
    <MatchesStack.Screen name="MatchDetail" component={MatchDetailScreen} />
    <MatchesStack.Screen
      name="CompatibilityInsight"
      component={DeferredCompatibilityInsight}
      options={{ animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen name="ChatList" component={ChatListScreen} />
    <MatchesStack.Screen
      name="Chat"
      component={DeferredChatScreen}
      options={{ gestureEnabled: true, freezeOnBlur: true }}
    />
    <MatchesStack.Screen
      name="Call"
      component={CallScreen}
      options={{ animation: 'fade_from_bottom', gestureEnabled: false }}
    />
    <MatchesStack.Screen
      name="JetonMarket"
      component={JetonMarketScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen name="DatePlanner" component={DatePlannerScreen} />
    <MatchesStack.Screen name="LikesYou" component={LikesYouScreen} />
    <MatchesStack.Screen
      name="Report"
      component={ReportScreen}
      options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen
      name="MembershipPlans"
      component={MembershipPlansScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen
      name="SecretAdmirer"
      component={SecretAdmirerScreen}
      options={{
        headerShown: false,
        animation: 'slide_from_bottom',
        presentation: 'modal',
      }}
    />
    <MatchesStack.Screen
      name="WeeklyTop"
      component={WeeklyTopScreen}
      options={{
        headerShown: false,
        animation: 'slide_from_bottom',
      }}
    />
    <MatchesStack.Screen
      name="IcebreakerGame"
      component={IcebreakerGameScreen}
      options={{ headerShown: false, animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen
      name="TwoTruthsGame"
      component={TwoTruthsGameScreen}
      options={{ headerShown: false }}
    />
    <MatchesStack.Screen
      name="ThisOrThatGame"
      component={ThisOrThatGameScreen}
      options={{ headerShown: false }}
    />
    <MatchesStack.Screen
      name="QuickQuestionsGame"
      component={QuickQuestionsGameScreen}
      options={{ headerShown: false }}
    />
  </MatchesStack.Navigator>
));
MatchesStackNavigator.displayName = 'MatchesStackNavigator';

// Feed tab stack — social feed as tab root
const FeedStackNavigator: React.FC = React.memo(() => (
  <FeedStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      statusBarStyle: 'light',
    }}
  >
    <FeedStack.Screen name="SocialFeed" component={SocialFeedScreen} />
    <FeedStack.Screen name="FeedProfile" component={FeedProfileScreen} />
    <FeedStack.Screen name="ProfilePreview" component={ProfilePreviewScreen} />
    <FeedStack.Screen
      name="PostDetail"
      component={PostDetailScreen}
      options={{ animation: 'slide_from_bottom', gestureEnabled: true, gestureDirection: 'vertical' }}
    />
    <FeedStack.Screen
      name="StoryViewer"
      component={StoryViewerScreen}
      options={{ animation: 'fade', gestureEnabled: true, gestureDirection: 'vertical' }}
    />
    <FeedStack.Screen
      name="StoryCreator"
      component={StoryCreator}
      options={{ animation: 'slide_from_bottom', gestureEnabled: true, gestureDirection: 'vertical' }}
    />
    <FeedStack.Screen name="Notifications" component={NotificationsScreen} />
  </FeedStack.Navigator>
));
FeedStackNavigator.displayName = 'FeedStackNavigator';

// Live tab stack — instant video connection
const LiveStackNavigator: React.FC = React.memo(() => (
  <LiveStack.Navigator
    screenOptions={{
      headerShown: false,
      statusBarStyle: 'light',
    }}
  >
    <LiveStack.Screen name="Live" component={LiveScreen} />
    <LiveStack.Screen name="JetonMarket" component={JetonMarketScreen} />
    <LiveStack.Screen name="MembershipPlans" component={MembershipPlansScreen} />
  </LiveStack.Navigator>
));
LiveStackNavigator.displayName = 'LiveStackNavigator';

// Profile tab stack — default slide_from_right for push screens
const ProfileStackNavigator: React.FC = React.memo(() => (
  <ProfileStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      statusBarStyle: 'light',
    }}
  >
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={DeferredEditProfile} />
    <ProfileStack.Screen name="InterestPicker" component={InterestPickerScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    <ProfileStack.Screen name="JetonMarket" component={JetonMarketScreen} />
    <ProfileStack.Screen name="Places" component={PlacesScreen} />
    <ProfileStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    <ProfileStack.Screen name="MembershipPlans" component={MembershipPlansScreen} />
    <ProfileStack.Screen name="PersonalitySelection" component={PersonalitySelectionScreen} />
    <ProfileStack.Screen name="ProfileCoach" component={ProfileCoachScreen} />
    <ProfileStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
    <ProfileStack.Screen name="SafetyCenter" component={SafetyCenterScreen} />
    <ProfileStack.Screen name="AccountDeletion" component={AccountDeletionScreen} />
    <ProfileStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    <ProfileStack.Screen name="Questions" component={QuestionsScreen} />
    <ProfileStack.Screen name="FollowList" component={FollowListScreen} />
    <ProfileStack.Screen name="MyPosts" component={MyPostsScreen} />
    <ProfileStack.Screen
      name="WeeklyReport"
      component={WeeklyReportScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <ProfileStack.Screen
      name="BoostMarket"
      component={BoostMarketScreen}
      options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
    />
  </ProfileStack.Navigator>
));
ProfileStackNavigator.displayName = 'ProfileStackNavigator';

export const MainTabNavigator: React.FC = () => {
  const { t } = useTranslation();
  usePresenceTracking();

  // Socket lifecycle — connect/disconnect on foreground/background/network changes
  useSocket();

  // Chat socket listeners — incoming messages, typing, read receipts
  useEffect(() => {
    useChatStore.getState().connectSocketListeners();
    return () => {
      useChatStore.getState().disconnectSocketListeners();
    };
  }, []);

  // Call store listeners — WebRTC event bridge
  useEffect(() => {
    const cleanup = setupCallStoreListeners();
    return cleanup;
  }, []);

  const totalUnread = useChatStore((state) => state.totalUnread);
  const newMatchCount = useMatchStore((state) => state.newMatchCount);
  // Single source of truth: new matches + unread messages
  const matchesTabBadge = newMatchCount + totalUnread;

  // Notification store integration
  const showPermissionModal = useNotificationStore((s) => s.showPermissionModal);
  const checkAndPromptPermission = useNotificationStore((s) => s.checkAndPromptPermission);
  const allowPermission = useNotificationStore((s) => s.allowPermission);
  const dismissPermissionModal = useNotificationStore((s) => s.dismissPermissionModal);

  // Permission prompt on mount (foreground listener is handled by useNotificationHandler hook)
  useEffect(() => {
    checkAndPromptPermission();
  }, [checkAndPromptPermission]);

  return (
    <>
    <Tab.Navigator
      initialRouteName="DiscoveryTab"
      backBehavior="history"
      detachInactiveScreens
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        animation: 'fade',
        tabBarStyle: {
          backgroundColor: '#08080F',
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#9B6BF8',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedStackNavigator}
        options={{
          tabBarLabel: t('tabs.feed'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={26} color={color} />
          ),
          tabBarAccessibilityLabel: t('tabs.feed'),
          tabBarButtonTestID: 'tab-feed',
        }}
        listeners={({ navigation, route }) => createTabResetListener(navigation, route)}
      />
      <Tab.Screen
        name="DiscoveryTab"
        component={DiscoveryStackNavigator}
        options={{
          tabBarLabel: t('tabs.discover'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="compass" size={26} color={color} />
          ),
          tabBarAccessibilityLabel: t('tabs.discover'),
          tabBarButtonTestID: 'tab-discovery',
        }}
        listeners={({ navigation, route }) => createTabResetListener(navigation, route)}
      />
      <Tab.Screen
        name="LiveTab"
        component={LiveStackNavigator}
        options={{
          tabBarLabel: t('tabs.live'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="videocam" size={26} color={color} />
          ),
          tabBarAccessibilityLabel: t('tabs.live'),
          tabBarButtonTestID: 'tab-live',
        }}
        listeners={({ navigation, route }) => createTabResetListener(navigation, route)}
      />
      <Tab.Screen
        name="MatchesTab"
        component={MatchesStackNavigator}
        options={{
          tabBarLabel: t('tabs.matches'),
          tabBarIcon: ({ color }) => (
            <View>
              <Ionicons name="heart" size={26} color={color} />
              {matchesTabBadge > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {matchesTabBadge > 99 ? '99+' : matchesTabBadge}
                  </Text>
                </View>
              )}
            </View>
          ),
          tabBarAccessibilityLabel: `Eşleşmeler${matchesTabBadge > 0 ? `, ${newMatchCount} yeni eşleşme, ${totalUnread} okunmamış mesaj` : ''}`,
          tabBarButtonTestID: 'tab-matches',
        }}
        listeners={({ navigation, route }) => createTabResetListener(navigation, route)}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={26} color={color} />
          ),
          tabBarAccessibilityLabel: t('tabs.profile'),
          tabBarButtonTestID: 'tab-profile',
        }}
        listeners={({ navigation, route }) => createTabResetListener(navigation, route)}
      />
    </Tab.Navigator>
    <NotificationPermissionModal
      visible={showPermissionModal}
      onAllow={allowPermission}
      onDismiss={dismissPermissionModal}
    />
    <IncomingCallOverlay />
    <MinimizedCallBar />
    <PromotionModal />
    </>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Active tab indicator dot under the icon
  tabIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8B5CF6',
  },
  // Unread message badge
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#08080F',
  },
  unreadBadgeText: {
    ...typography.captionSmall,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    fontSize: 9,
    lineHeight: 12,
  },
});
