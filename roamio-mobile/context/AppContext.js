import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase';
import { registerForPushNotifications } from '../lib/notifications';
import { toast } from '../lib/toast';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [quest, setQuest] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (snap.exists()) {
            setIsPremium(snap.data().premium === true);
          }
          await registerForPushNotifications();
        } catch (err) {
          console.log('Premium fetch error', err);
        }
        try {
          const saved = await AsyncStorage.getItem('currentQuest');
          if (saved) setQuest(JSON.parse(saved));
        } catch (err) {
          console.log('Quest load error', err);
        }
      } else {
        setIsPremium(false);
        setQuest(null);
        await AsyncStorage.removeItem('currentQuest');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    async function persist() {
      if (quest) {
        try {
          await AsyncStorage.setItem('currentQuest', JSON.stringify(quest));
          toast('Quest cached for offline use');
        } catch (err) {
          console.log('Quest cache error', err);
          toast('Failed to cache quest');
        }
      }
    }
    persist();
  }, [quest]);

  return (
    <AppContext.Provider value={{ user, quest, setQuest, isPremium, loading }}>
      {children}
    </AppContext.Provider>
  );
}
