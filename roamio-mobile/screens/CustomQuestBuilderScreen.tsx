import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, Button } from 'react-native';
import SharedHeader from '../components/SharedHeader';
import { AppContext } from '../context/AppContext';
import { toast } from '../lib/toast';
import {
  validatePremium,
  createCustomQuest,
  publishCustomQuest,
  unpublishCustomQuest,
  createGroupQuest,
  getCustomQuest,
  updateCustomQuest,
} from '../lib/api';
import LocationInputRow, { PlaceInput } from '../components/LocationInputRow';
import MoodSelector from '../components/MoodSelector';
import TimeLimitSlider from '../components/TimeLimitSlider';

export default function CustomQuestBuilderScreen({ navigation, route }: any) {
  const { user, setQuest } = useContext(AppContext);
  const [checking, setChecking] = useState(true);
  const questId = route?.params?.questId as string | undefined;
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [moods, setMoods] = useState<string[]>([]);
  const [timeLimit, setTimeLimit] = useState(60);
  const [locations, setLocations] = useState<PlaceInput[]>([
    { name: '', place_id: '', lat: 0, lng: 0, duration_minutes: 10 },
    { name: '', place_id: '', lat: 0, lng: 0, duration_minutes: 10 },
  ]);
  const [status, setStatus] = useState('draft');
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
        if (questId) {
          try {
            const q = await getCustomQuest(questId);
            setTitle(q.title || '');
            setPrompt(q.custom_prompt || '');
            setMoods(q.mood_tags || q.mood || []);
            setTimeLimit(q.time_limit || 60);
            if (Array.isArray(q.places || q.locationList)) {
              setLocations(
                (q.places || q.locationList).map((p: any) => ({
                  name: p.name,
                  place_id: p.place_id || p.placeId,
                  lat: p.lat,
                  lng: p.lng,
                  duration_minutes: p.duration_minutes || p.duration || 10,
                }))
              );
            }
            setStatus(q.status || (q.public ? 'published' : 'draft'));
          } catch (err) {
            console.log('load quest', err);
          }
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
      if (questId) {
        await updateCustomQuest({ quest_id: questId, data: basePayload() });
      } else {
        await createCustomQuest(basePayload());
      }
      toast('Draft saved');
    } catch (err) {
      console.log('save error', err);
      toast('Failed to save');
    }
  };

  const handleStart = async () => {
    if (!validateForm()) return;
    try {
      let id = questId;
      if (questId) {
        await updateCustomQuest({ quest_id: questId, data: basePayload() });
      } else {
        const res = await createCustomQuest(basePayload());
        id = res.questId;
      }
      const quest = await getCustomQuest(id!);
      const group = await createGroupQuest(user!.uid, id!, user!.displayName || '');
      setQuest({ ...quest, id, visitedIndices: [] });
      navigation.navigate('QuestLive');
    } catch (err) {
      console.log('start error', err);
      toast('Failed to start quest');
    }
  };

  const handlePublish = async () => {
    if (!validateForm()) return;
    try {
      let id = questId;
      if (questId) {
        await updateCustomQuest({ quest_id: questId, data: basePayload() });
      } else {
        const res = await createCustomQuest(basePayload());
        id = res.questId;
      }
      await publishCustomQuest(user!.uid, id!);
      setStatus('published');
      setShareLink(`${Constants.expoConfig?.extra?.backendUrl}/q/${id}`);
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
        {questId && status === 'published' && (
          <Button
            title="Unpublish"
            onPress={async () => {
              try {
                await unpublishCustomQuest(user!.uid, questId);
                setStatus('draft');
                toast('Unpublished');
              } catch (err) {
                console.log('unpublish error', err);
              }
            }}
          />
        )}
        {shareLink && <Text className="mt-2 text-center">Share: {shareLink}</Text>}
      </View>
    </ScrollView>
  );
}
