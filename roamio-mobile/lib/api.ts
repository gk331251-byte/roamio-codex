import Constants from 'expo-constants';
import { auth } from '../firebase';
import { getIdToken } from 'firebase/auth';

const BASE_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:8080';

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('Auth required');
  const token = await getIdToken(user);
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function validatePremium() {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/validate-premium`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Premium validation failed');
  return res.json();
}

export async function createCustomQuest(payload: any) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/create-custom-quest`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Custom quest create failed');
  return res.json();
}

export async function getCustomQuest(id: string) {
  const res = await fetch(`${BASE_URL}/custom-quests/${id}`);
  if (!res.ok) throw new Error('Fetch quest failed');
  return res.json();
}

export async function publishCustomQuest(userId: string, questId: string) {
  const res = await fetch(`${BASE_URL}/publish-custom-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, quest_id: questId }),
  });
  if (!res.ok) throw new Error('Publish failed');
  return res.json();
}

export async function unpublishCustomQuest(userId: string, questId: string) {
  const res = await fetch(`${BASE_URL}/unpublish-custom-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, quest_id: questId }),
  });
  if (!res.ok) throw new Error('Unpublish failed');
  return res.json();
}

export async function updateCustomQuest(payload: any) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/update-custom-quest`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
}

export async function listCustomQuests(userId: string) {
  const url = new URL(`${BASE_URL}/custom-quests`);
  url.searchParams.set('creatorId', userId);
  url.searchParams.set('publicOnly', 'false');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('List failed');
  return res.json();
}

export async function createGroupQuest(userId: string, questId: string, displayName: string) {
  const res = await fetch(`${BASE_URL}/create-group-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, questId, displayName }),
  });
  if (!res.ok) throw new Error('Group quest create failed');
  return res.json();
}

export async function getGroupQuest(groupId: string) {
  const res = await fetch(`${BASE_URL}/group-quest/${groupId}`);
  if (!res.ok) throw new Error('Fetch group quest failed');
  return res.json();
}
