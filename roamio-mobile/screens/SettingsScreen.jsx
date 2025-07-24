import React from 'react';
import { View, Text, Button } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import SharedHeader from '../components/SharedHeader';

export default function SettingsScreen() {
  return (
    <View className="flex-1 items-center justify-center">
      <SharedHeader title="Settings" />
      <Button title="Logout" onPress={() => signOut(auth)} />
      <Text className="mt-4">Notifications (coming soon)</Text>
    </View>
  );
}
