import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import SharedHeader from '../components/SharedHeader';
import { AppContext } from '../context/AppContext';
import * as Notifications from 'expo-notifications';

export default function QuestLiveScreen() {
  const { quest } = useContext(AppContext);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step === 1) {
      const t = setTimeout(() => {
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Next Stop Ahead!',
            body: 'Your next destination is just a few minutes away.',
          },
          trigger: null,
        });
      }, 15000);
      return () => clearTimeout(t);
    }
  }, [step]);

  if (!quest) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>No active quest</Text>
      </View>
    );
  }

  const region = {
    latitude: quest.places[0].lat,
    longitude: quest.places[0].lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View className="flex-1">
      <SharedHeader title="Quest" />
      <MapView style={{ flex: 1 }} initialRegion={region}>
        {quest.places.map((p, idx) => (
          <Marker
            key={idx}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.name}
          />
        ))}
      </MapView>
      <View className="p-2">
        <FlatList
          data={quest.places}
          keyExtractor={(item, i) => `${item.name}-${i}`}
          renderItem={({ item, index }) => (
            <Text className={index === step ? 'font-bold' : ''}>{item.name}</Text>
          )}
        />
        {step < quest.places.length && (
          <Button title="Mark as Visited" onPress={() => setStep(step + 1)} />
        )}
      </View>
    </View>
  );
}
