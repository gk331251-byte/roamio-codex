export function applyXPBoost(xp, multiplier = 1) {
  return Math.round(xp * multiplier);
}

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function fetchWeeklyTagConfig() {
  const snap = await getDoc(doc(db, 'config', 'ugcWeeklyTag'));
  return snap.exists() ? snap.data() : {};
}
