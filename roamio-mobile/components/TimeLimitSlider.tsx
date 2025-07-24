import React from 'react';
import { View, Text } from 'react-native';
import Slider from '@react-native-community/slider';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export default function TimeLimitSlider({ value, onChange }: Props) {
  return (
    <View className="mb-4">
      <Text>Time Limit: {value} minutes</Text>
      <Slider
        minimumValue={30}
        maximumValue={240}
        step={15}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}
