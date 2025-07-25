import React, { useContext } from 'react';
import { View, Text, Image, Button } from 'react-native';
import SharedHeader from '../components/SharedHeader';
import { AppContext } from '../context/AppContext';
import { toast } from '../lib/toast';

export default function QuestCompleteScreen({ route, navigation }) {
  const { summary } = route.params || {};
  const { user } = useContext(AppContext);

  return (
    <View className="flex-1 items-center p-4">
      <SharedHeader title="Quest Complete" />
      {summary?.imageUrl && (
        <Image source={{ uri: summary.imageUrl }} className="w-48 h-48 mb-4" />
      )}
      <Text className="text-xl font-bold mb-2">+{summary?.xpEarned || 0} XP</Text>
      <Text className="mb-1">Level {summary?.level}</Text>
      {summary?.streakCount ? (
        <Text className="mb-1">🔥 {summary.streakCount}-Day Streak!</Text>
      ) : null}
      {summary?.badgesUnlocked?.length > 0 && (
        <View className="items-center mb-2">
          <Text>You earned:</Text>
          {summary.badgesUnlocked.map((b) => (
            <Text key={b}>🎖️ {b}</Text>
          ))}
        </View>
      )}
      <Button title="Share Quest" onPress={() => toast('Sharing coming soon')} />
      <Button title="Back to Profile" onPress={() => navigation.navigate('Profile')} />
    </View>
  );
}
