import React, { useState, useContext } from 'react';
import { View, Text, Button, TextInput } from "react-native";
import Slider from "@react-native-community/slider";
import * as Location from 'expo-location';
import { toast } from '../lib/toast';
import SharedHeader from '../components/SharedHeader';
import { generateQuest } from '../lib/questApi';
import { AppContext } from '../context/AppContext';

export default function HomeScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [city, setCity] = useState('');
  const [mood, setMood] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [statusMsg, setStatusMsg] = useState('');
  const { setQuest, isPremium } = useContext(AppContext);

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setStatusMsg('Permission denied');
      toast('Location not shared — routing may be less accurate');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
    setStatusMsg('');
  };

  const handleGenerate = async () => {
    try {
      const questData = await generateQuest({
        city,
        moods: mood.split(',').map((m) => m.trim()).filter(Boolean),
        timeLimit,
        coords: location ? { lat: location.latitude, lng: location.longitude } : undefined,
      });
      setQuest({ ...questData.quest, id: questData.hash, visitedIndices: [] });
      navigation.navigate('QuestLive');
      if (questData.fallbackCity) {
        toast(`Showing results near ${questData.fallbackCity}`);
      }
    } catch (err) {
      console.log('Quest error', err);
      toast('Failed to generate quest');
    }
  };

  return (
    <View className="flex-1 items-center p-4">
      <SharedHeader title="Home" />
      <TextInput
        className="border w-full p-2 mb-2"
        placeholder="City"
        value={city}
        onChangeText={setCity}
      />
      <TextInput
        className="border w-full p-2 mb-2"
        placeholder="Mood (comma separated)"
        value={mood}
        onChangeText={setMood}
      />
      <View className="w-full mb-2">
        <Text>Time Limit: {timeLimit} minutes</Text>
        <Slider
          minimumValue={30}
          maximumValue={180}
          step={15}
          value={timeLimit}
          onValueChange={setTimeLimit}
        />
      </View>
      <Button title="Use GPS" onPress={requestLocation} />
      {statusMsg ? <Text>{statusMsg}</Text> : null}
      <Button title="Generate Quest" onPress={handleGenerate} className="mt-4" />
      <Button title="Custom Quest (Quest+)" disabled={!isPremium} className="mt-2" />
    </View>
  );
}
