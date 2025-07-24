import React from 'react';
import { View, Text } from 'react-native';
import SharedHeader from '../components/SharedHeader';

export default function QuestLiveScreen() {
  return (
    <View className="flex-1 items-center justify-center">
      <SharedHeader title="Quest" />
      <Text>Quest in Progress</Text>
      {/* Map and quest stops will go here */}
    </View>
  );
}
