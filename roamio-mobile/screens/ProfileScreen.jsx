import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Image, FlatList, Button, TouchableOpacity } from 'react-native';
import SharedHeader from '../components/SharedHeader';
import { AppContext } from '../context/AppContext';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import BadgesModal from '../components/BadgesModal';

export default function ProfileScreen({ navigation }) {
  const { user } = useContext(AppContext);
  const [postcards, setPostcards] = useState([]);
  const [profile, setProfile] = useState({ xp: 0, level: 0, streakCount: 0 });
  const [badges, setBadges] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const usnap = await getDoc(doc(db, 'users', user.uid));
        if (usnap.exists()) setProfile(usnap.data());
        const bSnap = await getDocs(collection(db, 'users', user.uid, 'badges'));
        const bArr = bSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBadges(bArr);
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
      <Text className="mt-2">XP: {profile.xp || 0}</Text>
      <Text>Level: {profile.level || 0}</Text>
      <Text>Streak: {profile.streakCount || 0} days</Text>
      <TouchableOpacity onPress={() => setShowModal(true)} className="mb-2 mt-1">
        <Text className="text-blue-600">View Badges</Text>
      </TouchableOpacity>
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
      <Button title="My Custom Quests" onPress={() => navigation.navigate('MyQuests')} />
      <BadgesModal visible={showModal} onClose={() => setShowModal(false)} />
    </View>
  );
}
