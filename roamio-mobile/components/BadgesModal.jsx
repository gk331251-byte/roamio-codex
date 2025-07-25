import React, { useContext, useEffect, useState } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { AppContext } from '../context/AppContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function BadgesModal({ visible, onClose }) {
  const { user } = useContext(AppContext);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    if (!visible || !user) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'badges'));
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBadges(arr);
      } catch (err) {
        console.log('badge load', err);
      }
    })();
  }, [visible, user]);

  return (
    <Modal visible={visible} animationType="slide">
      <View className="flex-1 p-4">
        <TouchableOpacity onPress={onClose} className="mb-2">
          <Text className="text-blue-600">Close</Text>
        </TouchableOpacity>
        <FlatList
          data={badges}
          numColumns={3}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="flex-1 items-center m-2">
              <Text className="text-2xl">{item.icon || '🎖️'}</Text>
              <Text className="text-xs text-center">{item.id}</Text>
            </View>
          )}
          ListEmptyComponent={<Text>No badges yet</Text>}
        />
      </View>
    </Modal>
  );
}
