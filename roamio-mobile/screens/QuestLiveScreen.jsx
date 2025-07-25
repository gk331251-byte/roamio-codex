import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import SharedHeader from '../components/SharedHeader';
import { AppContext } from '../context/AppContext';
import { saveQuestProgress, completeQuest } from '../lib/progress';
import { trackVisit, trackStopVisit } from '../lib/api';
import { toast } from '../lib/toast';
import * as Notifications from 'expo-notifications';
import TooltipManager from '../components/TooltipManager';

export default function QuestLiveScreen({ navigation }) {
  const { quest, setQuest } = useContext(AppContext);
  const [step, setStep] = useState(quest?.visitedIndices?.length || 0);
  const mapRef = useRef(null);
  const visitedBtnRef = useRef(null);
  const xpRef = useRef(null);
  const routeRef = useRef(null);
  const inviteRef = useRef(null);

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
      if (res?.totalXP) toast(`+${res.totalXP} XP`);
    } catch (err) {
      console.log('track visit error', err);
    }
    await saveQuestProgress(quest.id, visited);
    setStep(step + 1);
  };

  const handleComplete = async () => {
    const summary = await completeQuest({
      ...quest,
      visitedIndices: quest.visitedIndices || [],
    });
    setQuest(null);
    if (summary) {
      navigation.navigate('QuestComplete', { summary });
    } else {
      navigation.navigate('Profile');
    }
  };

  return (
    <View className="flex-1">
      <SharedHeader title="Quest" />
      <Text ref={xpRef} className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs">
        XP
      </Text>
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
        <Text
          ref={routeRef}
          onPress={() => navigation.navigate('Route', { questId: quest.id })}
          className="text-blue-600 underline text-xs my-2"
        >
          View Full Route
        </Text>
        {step < quest.places.length - 1 ? (
          <Button ref={visitedBtnRef} title="Mark as Visited" onPress={handleVisit} />
        ) : (
          <Button title="Complete Quest" onPress={handleComplete} />
        )}
        <Text
          ref={inviteRef}
          onPress={() => toast('Upgrade to Quest+ to invite friends')}
          className="text-blue-600 underline text-xs mt-2 text-center"
        >
          Invite Friends with Quest+
        </Text>
      </View>
      <TooltipManager
        refs={{ visitedBtn: visitedBtnRef, xpBadge: xpRef, routeBtn: routeRef, inviteBtn: inviteRef }}
      />
    </View>
  );
}
