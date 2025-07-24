import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const tips = [
  { key: 'visitedHint', ref: 'visitedBtn', text: 'Tap when you arrive at this stop.' },
  { key: 'xpHint', ref: 'xpBadge', text: 'Earn XP and unlock badges as you complete stops.' },
  { key: 'routeHint', ref: 'routeBtn', text: 'View your full quest route here.' },
  { key: 'groupHint', ref: 'inviteBtn', text: 'Want to do this with friends? Try group quests with Quest+.' },
];

export default function TooltipManager({ refs }: { refs: Record<string, any> }) {
  const [index, setIndex] = useState(-1);
  const [shown, setShown] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user) return;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        const flags = snap.data()?.onboarding?.tooltipsShown || {};
        setShown(flags);
        const idx = tips.findIndex((t) => !flags[t.key]);
        setIndex(idx);
      })
      .catch((err) => console.log('tooltip load', err));
  }, []);

  const updateFlags = async (flags: Record<string, boolean>) => {
    const user = getAuth().currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { 'onboarding.tooltipsShown': flags });
    } catch (err) {
      console.log('tooltip update', err);
    }
  };

  const dismiss = async () => {
    const key = tips[index]?.key;
    if (!key) return;
    const newFlags = { ...shown, [key]: true };
    setShown(newFlags);
    await updateFlags(newFlags);
    const idx = tips.findIndex((t) => !newFlags[t.key]);
    setIndex(idx);
  };

  const skip = async () => {
    const all = tips.reduce((acc, t) => ({ ...acc, [t.key]: true }), {} as Record<string, boolean>);
    setShown(all);
    await updateFlags(all);
    setIndex(-1);
  };

  if (index === -1) return null;
  const tip = tips[index];
  return (
    <View style={{ position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'white', padding: 10, borderRadius: 8, elevation: 4 }}>
      <Text>{tip.text}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
        <TouchableOpacity onPress={dismiss} style={{ marginRight: 16 }}>
          <Text style={{ color: '#019863' }}>Got it</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={skip}>
          <Text style={{ color: 'gray' }}>Skip Tour</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
