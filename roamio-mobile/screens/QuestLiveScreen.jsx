import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import SharedHeader from '../components/SharedHeader';
import { AppContext } from '../context/AppContext';
import { saveQuestProgress, completeQuest } from '../lib/progress';
import { trackVisit, trackStopVisit } from '../lib/api';
import { toast } from '../lib/toast';
import * as Notifications from 'expo-notifications';

export default function QuestLiveScreen({ navigation }) {
  const { quest, setQuest } = useContext(AppContext);
  const [step, setStep] = useState(quest?.visitedIndices?.length || 0);
  const mapRef = useRef(null);

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

  useEffect(() => {
    if (!quest || !mapRef.current) return;
    const place = quest.places[step] || quest.places[quest.places.length - 1];
    mapRef.current.animateToRegion(
      {
        latitude: place.lat,
        longitude: place.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      500
    );
  }, [step, quest]);

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

  const handleVisit = async () => {
    const visited = [...(quest.visitedIndices || []), step];
    const updated = { ...quest, visitedIndices: visited };
    setQuest(updated);
    try {
      const res = await trackVisit(quest.userId || '', quest.id, step);
      if (res?.xp) toast(`+${res.xp} XP`);
    } catch (err) {
      console.log('track visit error', err);
    }
    await saveQuestProgress(quest.id, visited);
    setStep(step + 1);
  };

  const handleComplete = async () => {
    await completeQuest({ ...quest, visitedIndices: quest.visitedIndices || [] });
    setQuest(null);
    navigation.navigate('Profile');
  };

  return (
    <View className="flex-1">
      <SharedHeader title="Quest" />
      <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={region}>
        {quest.places.map((p, idx) => (
          <Marker
            key={idx}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.name}
            pinColor={idx === step ? 'blue' : 'gray'}
          />
        ))}
        {step < quest.places.length - 1 && (
          <Polyline
            coordinates={[
              { latitude: quest.places[step].lat, longitude: quest.places[step].lng },
              { latitude: quest.places[step + 1].lat, longitude: quest.places[step + 1].lng },
            ]}
            strokeColor="blue"
            strokeWidth={3}
          />
        )}
      </MapView>
      <View className="p-2">
        <FlatList
          data={quest.places}
          keyExtractor={(item, i) => `${item.name}-${i}`}
          renderItem={({ item, index }) => (
            <Text className={index === step ? 'font-bold' : ''}>{item.name}</Text>
          )}
        />
        {step < quest.places.length - 1 ? (
          <Button title="Mark as Visited" onPress={handleVisit} />
        ) : (
          <Button title="Complete Quest" onPress={handleComplete} />
        )}
      </View>
    </View>
  );
}
