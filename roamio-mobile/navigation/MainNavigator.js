import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import QuestLiveScreen from '../screens/QuestLiveScreen';
import GroupQuestScreen from '../screens/GroupQuestScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CustomQuestScreen from '../screens/CustomQuestScreen';
import CustomQuestBuilderScreen from '../screens/CustomQuestBuilderScreen';
import MyQuestsScreen from '../screens/MyQuestsScreen';
import QuestCompleteScreen from '../screens/QuestCompleteScreen';
import QuestHistoryScreen from '../screens/QuestHistoryScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import OnboardingFlow from '../screens/OnboardingFlow';
import { AppContext } from '../context/AppContext';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  const { user, showOnboarding } = useContext(AppContext);
  return (
    <Stack.Navigator>
      {user ? (
        <>
          {showOnboarding && (
            <Stack.Screen name="Onboarding" component={OnboardingFlow} options={{ headerShown: false }} />
          )}
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="QuestLive" component={QuestLiveScreen} options={{ title: 'Quest' }} />
          <Stack.Screen name="QuestComplete" component={QuestCompleteScreen} options={{ title: 'Quest Complete' }} />
          <Stack.Screen name="GroupQuest" component={GroupQuestScreen} options={{ title: 'Group Quest' }} />
          <Stack.Screen name="CustomQuest" component={CustomQuestScreen} options={{ title: 'Custom Quest' }} />
          <Stack.Screen name="CustomQuestBuilder" component={CustomQuestBuilderScreen} options={{ title: 'Build Quest' }} />
          <Stack.Screen name="MyQuests" component={MyQuestsScreen} options={{ title: 'My Quests' }} />
          <Stack.Screen name="QuestHistory" component={QuestHistoryScreen} options={{ title: 'Quest History' }} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboards' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
