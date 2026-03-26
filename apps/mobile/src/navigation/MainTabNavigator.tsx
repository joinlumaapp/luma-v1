// Main tab navigator — 5 tabs: Feed, Discovery, Activities, Matches, Profile
// Enhanced: default slide_from_right, modal slide_from_bottom, premium tab bar
// Enhanced: unread message badge on Matches tab
// Performance: lazy:true defers tab mount, freezeOnBlur prevents hidden re-renders,
//   detachInactiveScreens frees memory, React.memo stack navigators,
//   deferred mount for heavy sub-screens (chat, edit profile, etc.)

import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import type {
  MainTabParamList,
  DiscoveryStackParamList,
  MatchesStackParamList,
  FeedStackParamList,
  ActivitiesStackParamList,
  ProfileStackParamList,
} from './types';
import { darkTheme } from '../theme/colors';
import { spacing, layout, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useChatStore } from '../stores/chatStore';
import { useMatchStore } from '../stores/matchStore';
import { useNotificationStore } from '../stores/notificationStore';
import { NotificationPermissionModal } from '../components/notifications/NotificationPermissionModal';
import { PromotionModal } from '../components/premium/PromotionModal';
import { usePresenceTracking } from '../hooks/usePresence';
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
import { BadgesScreen } from '../screens/badges/BadgesScreen';
import { PackagesScreen } from '../screens/profile/PackagesScreen';
import { PlacesScreen } from '../screens/places/PlacesScreen';
import { RelationshipScreen } from '../screens/relationship/RelationshipScreen';
import { CouplesClubScreen } from '../screens/couples-club/CouplesClubScreen';
import { NotificationSettingsScreen } from '../screens/settings/NotificationSettingsScreen';
import { MembershipPlansScreen } from '../screens/settings/MembershipPlansScreen';
import { PersonalitySelectionScreen } from '../screens/profile/PersonalitySelectionScreen';
import { ProfileCoachScreen } from '../screens/profile/ProfileCoachScreen';
import { BlockedUsersScreen } from '../screens/settings/BlockedUsersScreen';
import { SafetyCenterScreen } from '../screens/settings/SafetyCenterScreen';
import { AccountDeletionScreen } from '../screens/settings/AccountDeletionScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { QuestionsScreen } from '../screens/onboarding/QuestionsScreen';
import { ReportScreen } from '../screens/moderation/ReportScreen';
import { JetonMarketScreen } from '../screens/store/JetonMarketScreen';

// Feed extra screens
import { FeedProfileScreen } from '../screens/feed/FeedProfileScreen';

// Discovery extra screens
import { WeeklyReportScreen } from '../screens/discovery/WeeklyReportScreen';
import { CrossedPathsScreen } from '../screens/discovery/CrossedPathsScreen';
import { SocialFeedScreen } from '../screens/discovery/SocialFeedScreen';
import { StoryViewerScreen } from '../screens/discovery/StoryViewerScreen';
import { VideoFeedScreen } from '../screens/discovery/VideoFeedScreen';
import { InstantConnectScreen } from '../screens/discovery/InstantConnectScreen';
import { StoryCreator } from '../components/stories/StoryCreator';

// Activities screens
import { ActivitiesScreen } from '../screens/activities/ActivitiesScreen';
import { CreateActivityScreen } from '../screens/activities/CreateActivityScreen';
import { ActivityDetailScreen } from '../screens/activities/ActivityDetailScreen';
import { ActivityGroupChatScreen } from '../screens/activities/ActivityGroupChatScreen';
import { EventMapScreen } from '../screens/activities/EventMapScreen';
import { IcebreakerRoomScreen } from '../screens/harmony/IcebreakerRoomScreen';

// Waves screen
import { WavesScreen } from '../screens/waves/WavesScreen';

// Notifications screen
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';

// Matches extra screens
import { DatePlannerScreen } from '../screens/matches/DatePlannerScreen';
import { CallScreen } from '../screens/chat/CallScreen';
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
const ActivitiesStack = createNativeStackNavigator<ActivitiesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Safe accessor for nested navigator state — avoids fragile `as` type assertions */
function getNestedStateIndex(
  route: { state?: { index?: number } } | undefined,
): number | undefined {
  return route?.state?.index;
}

/**
 * Creates a tabPress listener that resets the stack to root when
 * the user taps a tab that is already focused and has a deep stack.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTabResetListener(
  navigation: any,
  route: { name: string },
) {
  return {
    tabPress: (e: { preventDefault: () => void }) => {
      const tabState = navigation.getState?.();
      if (!tabState?.routes) return;
      const thisRoute = tabState.routes.find((r: { name: string }) => r.name === route.name);
      const nestedIndex = getNestedStateIndex(thisRoute);
      const isDeep = nestedIndex !== undefined && nestedIndex > 0;
      if (isDeep) {
        e.preventDefault();
        navigation.dispatch(
          CommonActions.reset({
            ...tabState,
            routes: tabState.routes.map((r: { name: string; state?: unknown }) =>
              r.name === route.name ? { ...r, state: undefined } : r
            ),
          })
        );
      }
    },
  };
}

// Ionicons name map for active/inactive tab states
const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  compass: { active: 'compass', inactive: 'compass-outline' },
  heart: { active: 'heart', inactive: 'heart-outline' },
  feed: { active: 'newspaper', inactive: 'newspaper-outline' },
  activities: { active: 'flash', inactive: 'flash-outline' },
  user: { active: 'person', inactive: 'person-outline' },
};

// Tab icon component with 6px active dot indicator — memoized to prevent re-renders
const TabIcon: React.FC<{ name: string; focused: boolean }> = React.memo(({ name, focused }) => {
  const icons = TAB_ICONS[name];
  const iconName = icons ? (focused ? icons.active : icons.inactive) : 'help-outline';
  const iconColor = focused ? '#8B5CF6' : 'rgba(150, 150, 150, 0.7)';

  return (
    <View style={styles.tabIconContainer}>
      <Ionicons name={iconName} size={24} color={iconColor} />
      {focused && <View style={styles.tabIndicator} />}
    </View>
  );
});
TabIcon.displayName = 'TabIcon';

// Tab icon with unread count badge (red circle with white number) — memoized
const TabIconWithBadge: React.FC<{
  name: string;
  focused: boolean;
  badgeCount: number;
}> = React.memo(({ name, focused, badgeCount }) => {
  return (
    <View style={styles.tabIconContainer}>
      <View>
        <TabIcon name={name} focused={focused} />
        {badgeCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
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
    }}
  >
    <DiscoveryStack.Screen name="Discovery" component={DiscoveryScreen} />
    <DiscoveryStack.Screen
      name="VideoFeed"
      component={VideoFeedScreen}
      options={{ animation: 'fade', presentation: 'fullScreenModal' }}
    />
    <DiscoveryStack.Screen
      name="InstantConnect"
      component={InstantConnectScreen}
      options={{ animation: 'fade', presentation: 'fullScreenModal' }}
    />
    <DiscoveryStack.Screen name="Notifications" component={NotificationsScreen} />
    <DiscoveryStack.Screen
      name="ProfilePreview"
      component={ProfilePreviewScreen}
      options={{ animation: 'fade_from_bottom', gestureEnabled: true, gestureDirection: 'vertical' }}
    />
    <DiscoveryStack.Screen
      name="StoryViewer"
      component={StoryViewerScreen}
      options={{ animation: 'fade', presentation: 'fullScreenModal' }}
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
      name="WeeklyReport"
      component={WeeklyReportScreen}
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
      name="StoryCreator"
      component={StoryCreator}
      options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
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
  </MatchesStack.Navigator>
));
MatchesStackNavigator.displayName = 'MatchesStackNavigator';

// Feed tab stack — social feed as tab root
const FeedStackNavigator: React.FC = React.memo(() => (
  <FeedStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <FeedStack.Screen name="SocialFeed" component={SocialFeedScreen} />
    <FeedStack.Screen name="FeedProfile" component={FeedProfileScreen} />
    <FeedStack.Screen name="ProfilePreview" component={ProfilePreviewScreen} />
    <FeedStack.Screen
      name="StoryCreator"
      component={StoryCreator}
      options={{ animation: 'slide_from_bottom', gestureEnabled: true, gestureDirection: 'vertical' }}
    />
    <FeedStack.Screen
      name="StoryViewer"
      component={StoryViewerScreen}
      options={{ animation: 'fade', presentation: 'fullScreenModal' }}
    />
  </FeedStack.Navigator>
));
FeedStackNavigator.displayName = 'FeedStackNavigator';

// Activities tab stack — activities as tab root
const ActivitiesStackNavigator: React.FC = React.memo(() => (
  <ActivitiesStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <ActivitiesStack.Screen name="Activities" component={ActivitiesScreen} />
    <ActivitiesStack.Screen
      name="CreateActivity"
      component={CreateActivityScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <ActivitiesStack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
    <ActivitiesStack.Screen name="ActivityGroupChat" component={ActivityGroupChatScreen} />
    <ActivitiesStack.Screen name="EventMap" component={EventMapScreen} />
    <ActivitiesStack.Screen
      name="IcebreakerRoom"
      component={IcebreakerRoomScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
  </ActivitiesStack.Navigator>
));
ActivitiesStackNavigator.displayName = 'ActivitiesStackNavigator';

// Profile tab stack — default slide_from_right for push screens
const ProfileStackNavigator: React.FC = React.memo(() => (
  <ProfileStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={DeferredEditProfile} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    <ProfileStack.Screen name="Badges" component={BadgesScreen} />
    <ProfileStack.Screen name="Packages" component={PackagesScreen} />
    <ProfileStack.Screen name="JetonMarket" component={JetonMarketScreen} />
    <ProfileStack.Screen name="Places" component={PlacesScreen} />
    <ProfileStack.Screen name="Relationship" component={RelationshipScreen} />
    <ProfileStack.Screen name="CouplesClub" component={CouplesClubScreen} />
    <ProfileStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    <ProfileStack.Screen name="MembershipPlans" component={MembershipPlansScreen} />
    <ProfileStack.Screen name="PersonalitySelection" component={PersonalitySelectionScreen} />
    <ProfileStack.Screen name="ProfileCoach" component={ProfileCoachScreen} />
    <ProfileStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
    <ProfileStack.Screen name="SafetyCenter" component={SafetyCenterScreen} />
    <ProfileStack.Screen name="AccountDeletion" component={AccountDeletionScreen} />
    <ProfileStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    <ProfileStack.Screen name="Questions" component={QuestionsScreen} />
  </ProfileStack.Navigator>
));
ProfileStackNavigator.displayName = 'ProfileStackNavigator';

export const MainTabNavigator: React.FC = () => {
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
  const notifUnreadCount = useNotificationStore((s) => s.unreadCount);
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
      initialRouteName="FeedTab"
      backBehavior="history"
      detachInactiveScreens
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarStyle: [styles.tabBar, { backgroundColor: darkTheme.tabBarBackground }],
        tabBarActiveTintColor: darkTheme.tabBarActive,
        tabBarInactiveTintColor: darkTheme.tabBarInactive,
        tabBarLabelStyle: {
          ...typography.tabBar,
          fontSize: 9,
          lineHeight: 14,
        },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedStackNavigator}
        options={{
          tabBarLabel: 'Akış',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="feed" focused={focused} />
          ),
          tabBarAccessibilityLabel: 'Sosyal Akış',
          tabBarButtonTestID: 'tab-feed',
        }}
        listeners={({ navigation, route }) => createTabResetListener(navigation, route)}
      />
      <Tab.Screen
        name="DiscoveryTab"
        component={DiscoveryStackNavigator}
        options={{
          tabBarLabel: 'Keşfet',
          tabBarIcon: ({ focused }) => (
            <TabIconWithBadge
              name="compass"
              focused={focused}
              badgeCount={notifUnreadCount}
            />
          ),
          tabBarAccessibilityLabel: `Keşfet${notifUnreadCount > 0 ? `, ${notifUnreadCount} bildirim` : ''}`,
          tabBarButtonTestID: 'tab-discovery',
        }}
        listeners={({ navigation, route }) => createTabResetListener(navigation, route)}
      />
      <Tab.Screen
        name="ActivitiesTab"
        component={ActivitiesStackNavigator}
        options={{
          tabBarLabel: 'Aktiviteler',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="activities" focused={focused} />
          ),
          tabBarAccessibilityLabel: 'Aktiviteler',
          tabBarButtonTestID: 'tab-activities',
        }}
        listeners={({ navigation, route }) => createTabResetListener(navigation, route)}
      />
      <Tab.Screen
        name="MatchesTab"
        component={MatchesStackNavigator}
        options={{
          tabBarLabel: 'Eşleşme',
          tabBarIcon: ({ focused }) => (
            <TabIconWithBadge
              name="heart"
              focused={focused}
              badgeCount={matchesTabBadge}
            />
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
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="user" focused={focused} />
          ),
          tabBarAccessibilityLabel: 'Profil',
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
  tabBar: {
    borderTopWidth: 0,
    height: layout.tabBarHeight,
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
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
