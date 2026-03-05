// Main tab navigator — LOCKED 4 tabs: Discovery, Matches, Harmony, Profile
// Enhanced: default slide_from_right, modal slide_from_bottom, premium tab bar
// Enhanced: unread message badge on Matches tab
// Performance: deferred mount for heavy sub-screens

import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type {
  MainTabParamList,
  DiscoveryStackParamList,
  MatchesStackParamList,
  HarmonyStackParamList,
  ProfileStackParamList,
} from './types';
import { useTheme } from '../theme/ThemeContext';
import { spacing, layout, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useChatStore } from '../stores/chatStore';
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
import { MatchDetailScreen } from '../screens/matches/MatchDetailScreen';
import { CompatibilityInsightScreen } from '../screens/compatibility/CompatibilityInsightScreen';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { IcebreakerGameScreen } from '../screens/chat/IcebreakerGame';

// Harmony screens
import { HarmonyListScreen } from '../screens/harmony/HarmonyListScreen';
import { HarmonyRoomScreen } from '../screens/harmony/HarmonyRoomScreen';

// Profile screens
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { BadgesScreen } from '../screens/profile/BadgesScreen';
import { PackagesScreen } from '../screens/profile/PackagesScreen';
import { PlacesScreen } from '../screens/places/PlacesScreen';
import { RelationshipScreen } from '../screens/relationship/RelationshipScreen';
import { CouplesClubScreen } from '../screens/couples-club/CouplesClubScreen';
import { NotificationSettingsScreen } from '../screens/settings/NotificationSettingsScreen';
import { PersonalitySelectionScreen } from '../screens/profile/PersonalitySelectionScreen';
import { ProfileCoachScreen } from '../screens/profile/ProfileCoachScreen';
import { ReportScreen } from '../screens/moderation/ReportScreen';

// Discovery extra screens
import { WeeklyReportScreen } from '../screens/discovery/WeeklyReportScreen';
import { CrossedPathsScreen } from '../screens/discovery/CrossedPathsScreen';
import { SocialFeedScreen } from '../screens/discovery/SocialFeedScreen';

// Matches extra screens
import { DatePlannerScreen } from '../screens/matches/DatePlannerScreen';
import { AICoachScreen } from '../screens/chat/AICoachScreen';

// Compatibility game screens
import { CompatibilityQuizScreen } from '../screens/chat/CompatibilityQuizScreen';
import { WordAssociationScreen } from '../screens/chat/WordAssociationScreen';
import { ImagineGameScreen } from '../screens/chat/ImagineGameScreen';
import { EmojiStoryScreen } from '../screens/chat/EmojiStoryScreen';

// ── Deferred Screens ─────────────────────────────────────────
// Heavy screens that benefit from deferred mount after navigation animation
const DeferredCompatibilityInsight = withDeferredMount(CompatibilityInsightScreen);
const DeferredDailyQuestion = withDeferredMount(DailyQuestionScreen);
const DeferredIcebreakerGame = withDeferredMount(IcebreakerGameScreen);
const DeferredHarmonyRoom = withDeferredMount(HarmonyRoomScreen);

// Stack navigators for each tab
const DiscoveryStack = createNativeStackNavigator<DiscoveryStackParamList>();
const MatchesStack = createNativeStackNavigator<MatchesStackParamList>();
const HarmonyStack = createNativeStackNavigator<HarmonyStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const Tab = createBottomTabNavigator<MainTabParamList>();

// Ionicons name map for active/inactive tab states
const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  compass: { active: 'compass', inactive: 'compass-outline' },
  heart: { active: 'heart', inactive: 'heart-outline' },
  music: { active: 'musical-notes', inactive: 'musical-notes-outline' },
  user: { active: 'person', inactive: 'person-outline' },
};

// Tab icon component with 6px active dot indicator
const TabIcon: React.FC<{ name: string; focused: boolean }> = ({ name, focused }) => {
  const icons = TAB_ICONS[name];
  const iconName = icons ? (focused ? icons.active : icons.inactive) : 'help-outline';
  const iconColor = focused ? '#8B5CF6' : 'rgba(255, 255, 255, 0.5)';

  return (
    <View style={styles.tabIconContainer}>
      <Ionicons name={iconName} size={24} color={iconColor} />
      {focused && <View style={styles.tabIndicator} />}
    </View>
  );
};

// Tab icon with unread count badge (red circle with white number)
const TabIconWithBadge: React.FC<{
  name: string;
  focused: boolean;
  badgeCount: number;
}> = ({ name, focused, badgeCount }) => {
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
};

// Discovery tab stack — default slide_from_right, modals slide_from_bottom
const DiscoveryStackNavigator: React.FC = () => (
  <DiscoveryStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <DiscoveryStack.Screen name="Discovery" component={DiscoveryScreen} />
    <DiscoveryStack.Screen
      name="ProfilePreview"
      component={ProfilePreviewScreen}
      options={{ animation: 'slide_from_bottom' }}
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
      name="SocialFeed"
      component={SocialFeedScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <DiscoveryStack.Screen
      name="Report"
      component={ReportScreen}
      options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
    />
  </DiscoveryStack.Navigator>
);

// Matches tab stack — default slide_from_right, modals slide_from_bottom
const MatchesStackNavigator: React.FC = () => (
  <MatchesStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <MatchesStack.Screen name="MatchesList" component={MatchesListScreen} />
    <MatchesStack.Screen name="MatchDetail" component={MatchDetailScreen} />
    <MatchesStack.Screen
      name="CompatibilityInsight"
      component={DeferredCompatibilityInsight}
      options={{ animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen name="ChatList" component={ChatListScreen} />
    <MatchesStack.Screen name="Chat" component={ChatScreen} />
    <MatchesStack.Screen
      name="IcebreakerGame"
      component={DeferredIcebreakerGame}
      options={{ animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen
      name="CompatibilityQuiz"
      component={CompatibilityQuizScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen
      name="WordAssociation"
      component={WordAssociationScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen
      name="ImagineGame"
      component={ImagineGameScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen
      name="EmojiStory"
      component={EmojiStoryScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen name="DatePlanner" component={DatePlannerScreen} />
    <MatchesStack.Screen
      name="AICoach"
      component={AICoachScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <MatchesStack.Screen
      name="Report"
      component={ReportScreen}
      options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
    />
  </MatchesStack.Navigator>
);

// Harmony tab stack — default slide_from_right, room is modal
const HarmonyStackNavigator: React.FC = () => (
  <HarmonyStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <HarmonyStack.Screen name="HarmonyList" component={HarmonyListScreen} />
    <HarmonyStack.Screen
      name="HarmonyRoom"
      component={DeferredHarmonyRoom}
      options={{ animation: 'slide_from_bottom' }}
    />
  </HarmonyStack.Navigator>
);

// Profile tab stack — default slide_from_right for push screens
const ProfileStackNavigator: React.FC = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    <ProfileStack.Screen name="Badges" component={BadgesScreen} />
    <ProfileStack.Screen name="Packages" component={PackagesScreen} />
    <ProfileStack.Screen name="Places" component={PlacesScreen} />
    <ProfileStack.Screen name="Relationship" component={RelationshipScreen} />
    <ProfileStack.Screen name="CouplesClub" component={CouplesClubScreen} />
    <ProfileStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    <ProfileStack.Screen name="PersonalitySelection" component={PersonalitySelectionScreen} />
    <ProfileStack.Screen name="ProfileCoach" component={ProfileCoachScreen} />
  </ProfileStack.Navigator>
);

export const MainTabNavigator: React.FC = () => {
  const totalUnread = useChatStore((state) => state.totalUnread);
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.tabBarBackground }],
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          ...typography.tabBar,
        },
      }}
    >
      <Tab.Screen
        name="DiscoveryTab"
        component={DiscoveryStackNavigator}
        options={{
          tabBarLabel: 'Keşfet',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="compass" focused={focused} />
          ),
          tabBarAccessibilityLabel: 'Keşfet',
          tabBarButtonTestID: 'tab-discovery',
        }}
      />
      <Tab.Screen
        name="MatchesTab"
        component={MatchesStackNavigator}
        options={{
          tabBarLabel: 'Eşleşmeler',
          tabBarIcon: ({ focused }) => (
            <TabIconWithBadge
              name="heart"
              focused={focused}
              badgeCount={totalUnread}
            />
          ),
          tabBarAccessibilityLabel: `Eşleşmeler${totalUnread > 0 ? `, ${totalUnread} okunmamış mesaj` : ''}`,
          tabBarButtonTestID: 'tab-matches',
        }}
      />
      <Tab.Screen
        name="HarmonyTab"
        component={HarmonyStackNavigator}
        options={{
          tabBarLabel: 'Uyum',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="music" focused={focused} />
          ),
          tabBarAccessibilityLabel: 'Uyum Odası',
          tabBarButtonTestID: 'tab-harmony',
        }}
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
      />
    </Tab.Navigator>
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
    fontWeight: '700',
    fontSize: 9,
    lineHeight: 12,
  },
});
