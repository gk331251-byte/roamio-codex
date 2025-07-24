import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [quest, setQuest] = useState(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setQuest(null);
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (snap.exists()) {
            setIsPremium(snap.data().premium === true);
          }
        } catch (err) {
          console.log('Premium fetch error', err);
        }
      } else {
        setIsPremium(false);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AppContext.Provider value={{ user, quest, setQuest, isPremium }}>
      {children}
    </AppContext.Provider>
  );
}
