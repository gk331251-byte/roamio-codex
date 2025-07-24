import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import SharedHeader from '../components/SharedHeader';
import { AppContext } from '../context/AppContext';
import { submitCustomQuest } from '../firebase';
import { toast } from '../lib/toast';

export default function CustomQuestScreen({ navigation }) {
  const { isPremium } = useContext(AppContext);
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState('');
  const [timeLimit, setTimeLimit] = useState(90);
  const [stops, setStops] = useState([
    { name: '', type: '', lat: '', lng: '' },
  ]);

  const addStop = () => {
    setStops([...stops, { name: '', type: '', lat: '', lng: '' }]);
  };

  const removeStop = (idx) => {
    setStops(stops.filter((_, i) => i !== idx));
  };

  const updateStop = (idx, field, value) => {
    const arr = [...stops];
    arr[idx][field] = value;
    setStops(arr);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast('Title required');
      return;
    }
    for (const s of stops) {
      if (!s.name || !s.type || !s.lat || !s.lng) {
        toast('Fill all stop fields');
        return;
      }
    }
    try {
      const locationList = stops.map((s) => ({
        name: s.name,
        type: s.type,
        lat: parseFloat(s.lat),
        lng: parseFloat(s.lng),
      }));
      await submitCustomQuest({ title, mood, timeLimit, locationList });
      toast('Custom quest saved');
      navigation.goBack();
    } catch (err) {
      console.log('Custom quest save error', err);
      toast('Failed to save');
    }
  };

  if (!isPremium) {
    return (
      <View className="flex-1 p-4 items-center">
        <SharedHeader title="Custom Quest" />
        <Text className="mt-4 text-center">
          Custom quests are a Roamio+ feature. Upgrade to plan your own adventures.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 p-4">
      <SharedHeader title="Custom Quest" />
      <TextInput
        className="border p-2 mb-2"
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        className="border p-2 mb-2"
        placeholder="Mood"
        value={mood}
        onChangeText={setMood}
      />
      <View className="mb-4">
        <Text>Time Limit: {timeLimit} minutes</Text>
        <Slider
          minimumValue={30}
          maximumValue={180}
          step={15}
          value={timeLimit}
          onValueChange={setTimeLimit}
        />
      </View>
      {stops.map((stop, idx) => (
        <View key={idx} className="mb-4 border p-2">
          <Text className="font-bold">Stop {idx + 1}</Text>
          <TextInput
            className="border p-2 mb-1"
            placeholder="Name"
            value={stop.name}
            onChangeText={(t) => updateStop(idx, 'name', t)}
          />
          <TextInput
            className="border p-2 mb-1"
            placeholder="Type"
            value={stop.type}
            onChangeText={(t) => updateStop(idx, 'type', t)}
          />
          <TextInput
            className="border p-2 mb-1"
            placeholder="Latitude"
            keyboardType="numeric"
            value={stop.lat}
            onChangeText={(t) => updateStop(idx, 'lat', t)}
          />
          <TextInput
            className="border p-2 mb-1"
            placeholder="Longitude"
            keyboardType="numeric"
            value={stop.lng}
            onChangeText={(t) => updateStop(idx, 'lng', t)}
          />
          <Button title="Remove" onPress={() => removeStop(idx)} />
        </View>
      ))}
      <Button title="Add Stop" onPress={addStop} />
      <View className="mt-4">
        <Button title="Submit Quest" onPress={handleSubmit} />
        <Button title="Cancel" onPress={() => navigation.goBack()} className="mt-2" />
      </View>
    </ScrollView>
  );
}
