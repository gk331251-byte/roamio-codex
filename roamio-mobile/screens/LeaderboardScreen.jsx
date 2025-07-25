import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import SharedHeader from '../components/SharedHeader';

const BASE_URL = Constants.expoConfig.extra.backendUrl || 'http://localhost:8080';

async function fetchLeaderboard({ type = 'xp', period = 'allTime', city } = {}) {
  const docId = city ? `${type}_${city}_${period}` : `${type}_${period}`;
  const res = await fetch(`${BASE_URL}/leaderboard-snapshot/${docId}`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState([]);
  const [type, setType] = useState('xp');
  const [period, setPeriod] = useState('allTime');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchLeaderboard({ type, period });
        setEntries(data.entries || []);
      } catch (err) {
        console.log('lb fetch', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [type, period]);

  return (
    <View className="flex-1 p-4">
      <SharedHeader title="Leaderboards" />
      <View className="flex-row mb-2 space-x-2 justify-center">
        <TouchableOpacity onPress={() => setType('xp')}>
          <Text className={type === 'xp' ? 'font-bold' : ''}>XP</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setType('streaks')}>
          <Text className={type === 'streaks' ? 'font-bold' : ''}>Streaks</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPeriod(period === 'allTime' ? 'weekly' : 'allTime')}>
          <Text>{period === 'allTime' ? 'All Time' : 'This Week'}</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, idx) => item.uid || `${idx}`}
          renderItem={({ item, index }) => (
            <View className="flex-row justify-between border-b py-1">
              <Text>#{index + 1} {item.displayName || 'Anon'}</Text>
              <Text>{type === 'xp' ? `${item.xp} XP` : `${item.streakCount || 0} days`}</Text>
            </View>
          )}
          ListEmptyComponent={<Text>No data</Text>}
        />
      )}
    </View>
  );
}
