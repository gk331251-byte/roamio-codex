import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, Image } from 'react-native';
import SharedHeader from '../components/SharedHeader';
import { AppContext } from '../context/AppContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function QuestHistoryScreen() {
  const { user } = useContext(AppContext);
  const [quests, setQuests] = useState([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const q = query(
          collection(db, 'user_quests', user.uid, 'quests'),
          orderBy('completedAt', 'desc')
        );
        const snap = await getDocs(q);
        const arr = [];
        snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));
        setQuests(arr);
      } catch (err) {
        console.log('history load', err);
      }
    })();
  }, [user]);

  return (
    <View className="flex-1 p-4">
      <SharedHeader title="Quest History" />
      <FlatList
        data={quests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="flex-row items-center mb-2">
            {item.postcardUrl && (
              <Image source={{ uri: item.postcardUrl }} className="w-16 h-16 mr-2" />
            )}
            <View>
              <Text className="font-bold">{item.title}</Text>
              <Text className="text-xs text-gray-600">
                {item.completedAt
                  ? new Date(item.completedAt).toLocaleDateString()
                  : ''}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text>No quests completed yet</Text>}
      />
    </View>
  );
}
