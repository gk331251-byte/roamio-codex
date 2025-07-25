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
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

export async function updateUserBadges(userId, badges) {
  if (!userId) return;
  await updateDoc(doc(db, 'users', userId), { badges });
}

export async function getUserSettings(userId) {
  if (!userId) return {};
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? snap.data() : {};
}

export async function setShowRoamioWatermark(userId, value) {
  if (!userId) return;
  await updateDoc(doc(db, 'users', userId), { showRoamioWatermark: value });
}

export async function setSkipSharePrompt(userId, value) {
  if (!userId) return;
  await updateDoc(doc(db, 'users', userId), { skipSharePrompt: value });
}

export async function setUGCBoostActive(userId, value) {
  if (!userId) return;
  await updateDoc(doc(db, 'users', userId), { ugcBoostActive: value });
}

export async function getCreatorProfile(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'creators', uid));
  return snap.exists() ? snap.data() : null;
}

export async function getUserUGCSubmissions(uid) {
  if (!uid) return [];
  const q = query(collection(db, 'ugc_submissions'), where('uid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function setPublicSharingOptIn(uid, val) {
  if (!uid) return;
  await updateDoc(doc(db, 'users', uid), { publicSharingOptIn: val });
}

export async function setShowUsernameOnShare(uid, val) {
  if (!uid) return;
  await updateDoc(doc(db, 'users', uid), { showUsernameOnShare: val });
}

export async function setShowCityOnShare(uid, val) {
  if (!uid) return;
  await updateDoc(doc(db, 'users', uid), { showCityOnShare: val });
}

export async function setShowOnLeaderboard(uid, val) {
  if (!uid) return;
  await updateDoc(doc(db, 'users', uid), { showOnLeaderboard: val });
}

export async function setNickname(uid, name) {
  if (!uid) return;
  await updateDoc(doc(db, 'users', uid), { nickname: name });
}
