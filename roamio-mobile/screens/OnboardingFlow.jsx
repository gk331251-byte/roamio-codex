import React, { useContext, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { AppContext } from '../context/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import SharedHeader from '../components/SharedHeader';

const steps = [
  {
    title: 'Welcome',
    text: "We aren't an app to keep you indoors. We get you moving. Start adventuring.",
  },
  {
    title: 'How Quests Work',
    text: 'Pick a mood and time limit, then follow the map to new spots.',
  },
  {
    title: 'Progression',
    text: 'Earn XP, maintain streaks and collect badges as you level up.',
  },
  {
    title: 'Group Quests',
    text: 'Quest with friends for bonus rewards and shared progress.',
  },
];

export default function OnboardingFlow({ navigation }) {
  const { user, setShowOnboarding } = useContext(AppContext);
  const [index, setIndex] = useState(0);

  const next = async () => {
    if (index < steps.length - 1) {
      setIndex(index + 1);
    } else {
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), { onboardingComplete: true });
        } catch (err) {
          console.log('onboarding save', err);
        }
      }
      setShowOnboarding(false);
      navigation.replace('Home');
    }
  };

  return (
    <View className="flex-1 items-center justify-center p-4">
      <SharedHeader title={steps[index].title} />
      <Text className="mb-4 text-center">{steps[index].text}</Text>
      <Button title={index === steps.length - 1 ? 'Start Adventuring' : 'Next'} onPress={next} />
    </View>
  );
}
