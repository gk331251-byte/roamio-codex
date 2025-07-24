import Constants from "expo-constants";
import { auth } from '../firebase';
import { getIdToken } from 'firebase/auth';

const BASE_URL = Constants.expoConfig.extra.backendUrl || "http://localhost:8080";
export async function generateQuest({ city, moods, timeLimit, coords }) {
  const user = auth.currentUser;
  const token = user ? await getIdToken(user) : null;
  const payload = {
    city,
    moods,
    time_limit: timeLimit,
    token,
    user_id: user?.uid,
    lat: coords?.lat,
    lng: coords?.lng,
  };

  const res = await fetch(`${BASE_URL}/generate-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return res.json();
}
