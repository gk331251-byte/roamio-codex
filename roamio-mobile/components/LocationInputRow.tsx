import React from 'react';
import { View, Text, Button } from 'react-native';
import Slider from '@react-native-community/slider';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';

export type PlaceInput = {
  name: string;
  place_id: string;
  lat: number;
  lng: number;
  duration_minutes: number;
};

interface Props {
  index: number;
  value: PlaceInput;
  onChange: (p: PlaceInput) => void;
  onRemove: () => void;
}

export default function LocationInputRow({ index, value, onChange, onRemove }: Props) {
  const apiKey = Constants.expoConfig?.extra?.googlePlacesApiKey || '';
  return (
    <View className="mb-4">
      <Text className="font-bold">Stop {index + 1}</Text>
      <GooglePlacesAutocomplete
        placeholder="Search place"
        fetchDetails
        query={{ key: apiKey, language: 'en' }}
        onPress={(data, details = null) => {
          if (!details) return;
          onChange({
            ...value,
            name: data.description,
            place_id: data.place_id,
            lat: details.geometry.location.lat,
            lng: details.geometry.location.lng,
          });
        }}
        styles={{
          textInput: { borderWidth: 1, borderColor: '#ccc', padding: 4 },
          listView: { zIndex: 1000 },
        }}
      />
      <View className="mt-2">
        <Text>Duration: {value.duration_minutes} mins</Text>
        <Slider
          minimumValue={10}
          maximumValue={45}
          step={5}
          value={value.duration_minutes}
          onValueChange={(v) => onChange({ ...value, duration_minutes: v })}
        />
      </View>
      <Button title="Remove" onPress={onRemove} />
    </View>
  );
}
