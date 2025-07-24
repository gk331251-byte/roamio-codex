import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Image, FlatList } from 'react-native';
import SharedHeader from '../components/SharedHeader';
import { AppContext } from '../context/AppContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function ProfileScreen() {
  const { user } = useContext(AppContext);
  const [postcards, setPostcards] = useState([]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const q = collection(db, 'user_quests', user.uid, 'quests');
        const snap = await getDocs(q);
        const arr = [];
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.imageUrl) arr.push({ id: doc.id, url: data.imageUrl });
        });
        setPostcards(arr);
      } catch (err) {
        console.log('Postcard fetch error', err);
      }
    }
    load();
  }, [user]);

  return (
    <View className="flex-1 p-4 items-center">
      <SharedHeader title="Profile" />
      <FlatList
        data={postcards}
        numColumns={3}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Image source={{ uri: item.url }} className="w-24 h-24 m-1" />
        )}
        ListEmptyComponent={
          <Text>You haven\u2019t completed any quests yet!</Text>
        }
      />
    </View>
  );
}
