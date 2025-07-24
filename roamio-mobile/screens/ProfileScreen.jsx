import React from 'react';
import { View, Text } from 'react-native';
import SharedHeader from '../components/SharedHeader';

export default function ProfileScreen() {
  return (
    <View className="flex-1 items-center justify-center">
      <SharedHeader title="Profile" />
      <Text>Completed Quests</Text>
      {/* Quest history grid/list placeholder */}
    </View>
  );
}
