import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import * as Location from 'expo-location';
import SharedHeader from '../components/SharedHeader';

export default function HomeScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setStatusMsg('Permission denied');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
  };

  return (
    <View className="flex-1 items-center justify-center">
      <SharedHeader title="Home" />
      <Text className="text-lg mb-2">Welcome to Roamio</Text>
      <Button title="Use GPS" onPress={requestLocation} />
      {statusMsg ? <Text>{statusMsg}</Text> : null}
      {location && (
        <Text className="mt-2">Lat: {location.latitude}, Lng: {location.longitude}</Text>
      )}
      <Button title="Generate Quest" className="mt-4" onPress={() => navigation.navigate('QuestLive')} />
    </View>
  );
}
