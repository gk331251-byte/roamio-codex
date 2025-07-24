import React, { useEffect, useState, useRef, useContext } from 'react';
import { View, Text, FlatList, Button } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { AppContext } from '../context/AppContext';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { decode } from '@googlemaps/polyline-codec';

export default function GroupQuestScreen({ route }) {
  const { groupId, quest } = route.params;
  const { user } = useContext(AppContext);
  const [group, setGroup] = useState<any>(null);
  const [poly, setPoly] = useState<{lat:number,lng:number}[]>([]);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'group_quests', groupId), snap => {
      setGroup(snap.data());
    });
    return () => unsub();
  }, [groupId]);

  useEffect(() => {
    if (quest?.route?.polyline) {
      setPoly(decode(quest.route.polyline).map(([lat,lng])=>({lat, lng})));
    }
  }, [quest]);

  const step = group?.progress?.[user?.uid || '']?.length || 0;

  const lastIndexFor = (uid:string) => {
    const arr = group?.progress?.[uid] || [];
    return arr.length ? Math.min(arr[arr.length-1], quest.places.length-1) : -1;
  };

  return (
    <View className="flex-1">
      <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={{
        latitude: quest.places[0].lat,
        longitude: quest.places[0].lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}>
        {quest.places.map((p, idx) => (
          <Marker
            key={idx}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.name}
            pinColor={idx === step ? 'blue' : idx < step ? 'green' : 'gray'}
          />
        ))}
        {poly.length > 1 && (
          <Polyline
            coordinates={poly.map(p => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor="blue"
            strokeWidth={3}
          />
        )}
        {group?.members?.map((m:any) => {
          const idx = lastIndexFor(m.userId);
          if (idx < 0) return null;
          const place = quest.places[idx];
          return (
            <Marker
              key={m.userId}
              coordinate={{ latitude: place.lat, longitude: place.lng }}
              title={m.displayName || m.userId}
              pinColor="orange"
            />
          );
        })}
      </MapView>
      <View className="p-2">
        <FlatList
          data={quest.places}
          keyExtractor={(it, i) => `${i}`}
          renderItem={({ item, index }) => (
            <Text className={index === step ? 'font-bold' : ''}>{item.name}</Text>
          )}
        />
      </View>
    </View>
  );
}
