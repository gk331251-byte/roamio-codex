import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const moodOptions = ['romantic', 'adventurous', 'cozy', 'spooky', 'whimsical', 'artsy'];

interface Props {
  selected: string[];
  onChange: (list: string[]) => void;
}

export default function MoodSelector({ selected, onChange }: Props) {
  const toggle = (m: string) => {
    if (selected.includes(m)) onChange(selected.filter((x) => x !== m));
    else onChange([...selected, m]);
  };
  return (
    <View className="flex-row flex-wrap mb-2">
      {moodOptions.map((m) => (
        <TouchableOpacity
          key={m}
          onPress={() => toggle(m)}
          className={`px-3 py-1 m-1 rounded-full border ${selected.includes(m) ? 'bg-green-600' : 'bg-white'}`}
        >
          <Text className={selected.includes(m) ? 'text-white' : 'text-black'}>{m}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
