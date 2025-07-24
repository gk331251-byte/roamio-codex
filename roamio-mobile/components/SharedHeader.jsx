import React from 'react';
import { View, Text } from 'react-native';

export default function SharedHeader({ title }) {
  return (
    <View className="w-full py-4 bg-blue-500 items-center">
      <Text className="text-white text-xl font-bold">{title}</Text>
    </View>
  );
}
