// Firebase initialization for React Native
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Values are pulled from native config via process.env or expo-config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
});
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { app, db, auth, provider };

export async function submitCustomQuest(data) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const payload = {
    ...data,
    creatorId: user.uid,
    createdAt: serverTimestamp(),
    isPublic: false,
  };
  const ref = await addDoc(collection(db, 'custom_quests'), payload);
  return ref.id;
}
