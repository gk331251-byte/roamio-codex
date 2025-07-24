import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, Button } from 'react-native';
import SharedHeader from '../components/SharedHeader';
import { AppContext } from '../context/AppContext';
import { toast } from '../lib/toast';
import {
  validatePremium,
  createCustomQuest,
  publishCustomQuest,
  createGroupQuest,
  getCustomQuest,
} from '../lib/api';
import LocationInputRow, { PlaceInput } from '../components/LocationInputRow';
import MoodSelector from '../components/MoodSelector';
import TimeLimitSlider from '../components/TimeLimitSlider';

export default function CustomQuestBuilderScreen({ navigation }: any) {
  const { user, setQuest } = useContext(AppContext);
  const [checking, setChecking] = useState(true);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [moods, setMoods] = useState<string[]>([]);
  const [timeLimit, setTimeLimit] = useState(60);
  const [locations, setLocations] = useState<PlaceInput[]>([
    { name: '', place_id: '', lat: 0, lng: 0, duration_minutes: 10 },
    { name: '', place_id: '', lat: 0, lng: 0, duration_minutes: 10 },
  ]);
  const [shareLink, setShareLink] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await validatePremium();
        if (!res.isPremium) {
          toast('Quest+ membership required');
          navigation.goBack();
          return;
        }
      } catch (err) {
        console.log('premium check', err);
        navigation.goBack();
        return;
      }
      setChecking(false);
    }
    check();
  }, []);

  const updateLocation = (idx: number, place: PlaceInput) => {
    const arr = [...locations];
    arr[idx] = place;
    setLocations(arr);
  };

  const addLocation = () => {
    if (locations.length >= 5) return;
    setLocations([
      ...locations,
      { name: '', place_id: '', lat: 0, lng: 0, duration_minutes: 10 },
    ]);
  };

  const removeLocation = (idx: number) => {
    if (locations.length <= 2) return;
    setLocations(locations.filter((_, i) => i !== idx));
  };

  const validateForm = () => {
    if (!title.trim()) {
      toast('Title required');
      return false;
    }
    if (moods.length === 0) {
      toast('Select at least one mood');
      return false;
    }
    if (locations.some((l) => !l.place_id)) {
      toast('Select valid locations');
      return false;
    }
    return true;
  };

  const basePayload = () => ({
    user_id: user?.uid,
    title,
    mood_tags: moods,
    places: locations,
    time_limit: timeLimit,
    custom_prompt: prompt,
    status: 'draft',
  });

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      await createCustomQuest(basePayload());
      toast('Draft saved');
    } catch (err) {
      console.log('save error', err);
      toast('Failed to save');
    }
  };

  const handleStart = async () => {
    if (!validateForm()) return;
    try {
      const res = await createCustomQuest(basePayload());
      const quest = await getCustomQuest(res.questId);
      const group = await createGroupQuest(user!.uid, res.questId, user!.displayName || '');
      setQuest({ ...quest, id: res.questId, visitedIndices: [] });
      navigation.navigate('QuestLive');
    } catch (err) {
      console.log('start error', err);
      toast('Failed to start quest');
    }
  };

  const handlePublish = async () => {
    if (!validateForm()) return;
    try {
      const res = await createCustomQuest(basePayload());
      await publishCustomQuest(user!.uid, res.questId);
      setShareLink(`${Constants.expoConfig?.extra?.backendUrl}/q/${res.questId}`);
      toast('Quest published');
    } catch (err) {
      console.log('publish error', err);
      toast('Failed to publish');
    }
  };

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Checking subscription...</Text>
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
        placeholder="Optional Prompt"
        value={prompt}
        onChangeText={setPrompt}
        multiline
      />
      <MoodSelector selected={moods} onChange={setMoods} />
      <TimeLimitSlider value={timeLimit} onChange={setTimeLimit} />
      {locations.map((loc, idx) => (
        <LocationInputRow
          key={idx}
          index={idx}
          value={loc}
          onChange={(p) => updateLocation(idx, p)}
          onRemove={() => removeLocation(idx)}
        />
      ))}
      {locations.length < 5 && <Button title="Add Stop" onPress={addLocation} />}
      <View className="mt-4 space-y-2">
        <Button title="Save Draft" onPress={handleSave} />
        <Button title="Start Quest" onPress={handleStart} />
        <Button title="Publish" onPress={handlePublish} />
        {shareLink && <Text className="mt-2 text-center">Share: {shareLink}</Text>}
      </View>
    </ScrollView>
  );
}
