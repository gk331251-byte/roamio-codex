import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import SharedHeader from '../components/SharedHeader';
import { AppContext } from '../context/AppContext';
import { listCustomQuests, publishCustomQuest, unpublishCustomQuest } from '../lib/api';

export default function MyQuestsScreen({ navigation }: any) {
  const { user, isPremium } = useContext(AppContext);
  const [quests, setQuests] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const res = await listCustomQuests(user.uid);
        setQuests(res.quests || []);
      } catch (err) {
        console.log('load error', err);
      }
    }
    load();
  }, [user]);

  const toggle = async (q: any) => {
    try {
      if (q.status === 'published' || q.public) {
        await unpublishCustomQuest(user!.uid, q.id);
        setQuests((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: 'draft', public: false } : x)));
      } else {
        await publishCustomQuest(user!.uid, q.id);
        setQuests((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: 'published', public: true } : x)));
      }
    } catch (err) {
      console.log('toggle error', err);
    }
  };

  return (
    <ScrollView className="flex-1 p-4">
      <SharedHeader title="My Custom Quests" />
      {quests.map((q) => (
        <View key={q.id} className="border p-2 mb-2">
          <Text className="font-bold">{q.title}</Text>
          <Text>Status: {q.status || (q.public ? 'published' : 'draft')}</Text>
          <View className="flex-row mt-1 space-x-2">
            <Button title="Edit" onPress={() => navigation.navigate('CustomQuestBuilder', { questId: q.id })} />
            {isPremium && (
              <Button title={q.status === 'published' || q.public ? 'Unpublish' : 'Publish'} onPress={() => toggle(q)} />
            )}
          </View>
        </View>
      ))}
      {quests.length === 0 && <Text>No custom quests yet</Text>}
    </ScrollView>
  );
}
