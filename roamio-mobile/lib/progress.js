import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig.extra.backendUrl || 'http://localhost:8080';

export async function saveQuestProgress(questId, visitedIndices) {
  const user = auth.currentUser;
  if (!user || !questId) return;
  try {
    await setDoc(
      doc(db, 'user_quests', user.uid, 'quests', questId),
      { visitedIndices },
      { merge: true }
    );
  } catch (err) {
    console.log('Progress save error', err);
  }
}

export async function completeQuest(quest) {
  const user = auth.currentUser;
  if (!user || !quest?.id) return;
  const payload = {
    userId: user.uid,
    questId: quest.id,
    title: quest.title,
    city: quest.city,
    mood: quest.mood,
    questText: quest.questText,
    locationList: quest.places,
    imageUrl: quest.imageUrl,
    imagePrompt: quest.imagePrompt,
    visitedIndices: quest.visitedIndices || [],
  };
  try {
    await fetch(`${BASE_URL}/quest-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.log('Complete quest error', err);
  }
}
