import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from 'firebase/auth';
import { auth, provider } from '../firebase';

export async function googleLogin() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function emailLogin(email, password) {
  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    return res.user;
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      return res.user;
    }
    throw err;
  }
}

export async function guestLogin() {
  const res = await signInAnonymously(auth);
  return res.user;
}
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function updateUserBadges(userId, badges) {
  if (!userId) return;
  await updateDoc(doc(db, 'users', userId), { badges });
}
