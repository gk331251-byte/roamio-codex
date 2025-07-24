import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import QuestLiveScreen from '../screens/QuestLiveScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CustomQuestScreen from '../screens/CustomQuestScreen';
import CustomQuestBuilderScreen from '../screens/CustomQuestBuilderScreen';
import MyQuestsScreen from '../screens/MyQuestsScreen';
import { AppContext } from '../context/AppContext';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  const { user } = useContext(AppContext);
  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="QuestLive" component={QuestLiveScreen} options={{ title: 'Quest' }} />
          <Stack.Screen name="CustomQuest" component={CustomQuestScreen} options={{ title: 'Custom Quest' }} />
          <Stack.Screen name="CustomQuestBuilder" component={CustomQuestBuilderScreen} options={{ title: 'Build Quest' }} />
          <Stack.Screen name="MyQuests" component={MyQuestsScreen} options={{ title: 'My Quests' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
