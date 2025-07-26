const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';

/**
 * Fetches a generated quest from the backend
 * @param {string} city - The city for the quest
 * @param {string[]} mood - Array of selected moods (e.g. ["adventurous", "cozy"])
 * @param {number} timeLimit - Time limit in minutes
 * @param {string} token - Firebase user token for auth
 */
export async function generateQuest(city, mood, timeLimit, token, userId, coords, difficulty = 'Easy') {
  if (!city || !Array.isArray(mood) || mood.length === 0 || typeof timeLimit !== 'number') {
    throw new Error("Invalid input: city, mood[], and numeric timeLimit are required.");
  }

  const url = `${BASE_URL}/generate-quest`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      city,
      moods: mood,
      time_limit: timeLimit,
      token,
      user_id: userId,
      lat: coords?.lat,
      lng: coords?.lng,
      difficulty,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate quest: ${errorText}`);
  }

  return await response.json();
}

export async function generateDemoQuest(city, token, userId, coords) {
  const url = `${BASE_URL}/generate-demo-quest`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city, user_id: userId, lat: coords?.lat, lng: coords?.lng, token })
  });
  if (!resp.ok) throw new Error('Failed to generate demo quest');
  return resp.json();
}

export async function completeQuest(userId, questId, data) {
  const url = `${BASE_URL}/quest-complete`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, questId, ...data })

  });
  if (!resp.ok) {
    throw new Error('Failed to save quest');
  }
  return resp.json();
}

export async function uploadPostcard(userId, questId, imageUrl) {
  const url = `${BASE_URL}/upload-postcard`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, questId, imageUrl })
  });
  if (!resp.ok) {
    throw new Error('Failed to upload postcard');
  }
  return resp.json();
}

export async function validatePremium(userId, sessionId) {
  if (sessionId && userId) {
    const url = new URL(`${BASE_URL}/validate-premium/${userId}`);
    url.searchParams.set('session_id', sessionId);
    const resp = await fetch(url.toString());
    if (!resp.ok) throw new Error('Failed to validate premium');
    const data = await resp.json();
    return { premium: !!data.premium, isPremium: !!data.premium };
  }
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return { premium: false, isPremium: false };
  const token = await user.getIdToken();
  const resp = await fetch(`${BASE_URL}/validate-premium`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('Failed to validate premium');
  const data = await resp.json();
  return { premium: !!data.premium, isPremium: !!data.premium };
}

export async function getUserQuests(userId) {
  const resp = await fetch(`${BASE_URL}/get-user-quests?userId=${userId}`);
  if (!resp.ok) {
    throw new Error('Failed to load quests');
  }
  return resp.json();
}

export async function getUserXP(userId) {
  const resp = await fetch(`${BASE_URL}/user-xp/${userId}`);
  if (!resp.ok) throw new Error('Failed to fetch XP');
  return resp.json();
}

export async function getUserBadges(userId) {
  const resp = await fetch(`${BASE_URL}/user-badges/${userId}`);
  if (!resp.ok) throw new Error('Failed to fetch badges');
  return resp.json();
}

export async function getLeaderboard({ field = 'xp', city, timeframe = 'all', limit = 50 } = {}) {
  const url = new URL(`${BASE_URL}/leaderboard`);
  url.searchParams.set('field', field);
  url.searchParams.set('limit', limit);
  if (city) url.searchParams.set('city', city);
  if (timeframe) url.searchParams.set('timeframe', timeframe);
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error('Failed to fetch leaderboard');
  return resp.json();
}

export async function getCachedLeaderboard({ type = 'xp', period = 'allTime', city } = {}) {
  const docId = city ? `${type}_${city}_${period}` : `${type}_${period}`;
  const resp = await fetch(`${BASE_URL}/leaderboard-snapshot/${docId}`);
  if (!resp.ok) throw new Error('Failed to fetch leaderboard');
  return resp.json();
}

export async function getDirections(places) {
  const resp = await fetch(`${BASE_URL}/get-directions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ places }),
  });
  if (!resp.ok) {
    throw new Error('Failed to fetch directions');
  }
  return resp.json();
}

export async function trackVisit(userId, questId, placeIndex) {
  const resp = await fetch(`${BASE_URL}/track-visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, questId, placeIndex }),
  });
  if (!resp.ok) {
    throw new Error('Failed to track visit');
  }
  return resp.json();
}


export async function createGroupQuest(userId, questId, displayName) {
  const resp = await fetch(`${BASE_URL}/create-group-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, questId, displayName })
  });
  if (!resp.ok) {
    throw new Error('Failed to create group');
  }
  return resp.json();
}

export async function joinGroup(userId, groupId, displayName) {
  const resp = await fetch(`${BASE_URL}/join-group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, groupId, displayName })
  });
  if (!resp.ok) {
    throw new Error('Failed to join group');
  }
  return resp.json();
}

export async function trackStopVisit(groupId, userId, placeIndex) {
  const resp = await fetch(`${BASE_URL}/track-stop-visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, userId, placeIndex })
  });
  if (!resp.ok) {
    throw new Error('Failed to track stop');
  }
  return resp.json();
}

export async function completeGroupQuest(groupId, userId) {
  const resp = await fetch(`${BASE_URL}/complete-group-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, userId })
  });
  if (!resp.ok) {
    throw new Error('Failed to complete group quest');
  }
  return resp.json();
}

export async function getGroupQuest(groupId) {
  const resp = await fetch(`${BASE_URL}/group-quest/${groupId}`);
  if (!resp.ok) {
    throw new Error('Failed to fetch group quest');
  }
  return resp.json();
}

export async function leaveGroup(groupId, userId) {
  const resp = await fetch(`${BASE_URL}/leave-group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, userId })
  });
  if (!resp.ok) {
    throw new Error('Failed to leave group');
  }
  return resp.json();
}

export async function getActiveQuest(userId) {
  const resp = await fetch(`${BASE_URL}/active-quest/${userId}`);
  if (!resp.ok) {
    return null;
  }
  return resp.json();
}

export async function getQuest(questId) {
  const resp = await fetch(`${BASE_URL}/get-quest/${questId}`);
  if (!resp.ok) {
    throw new Error('Failed to fetch quest');
  }
  return resp.json();
}

export async function getCommunityQuests() {
  const resp = await fetch(`${BASE_URL}/get-community-quests`);
  if (!resp.ok) {
    throw new Error('Failed to load community quests');
  }
  return resp.json();
}

export async function getUGCFeed({ mood, city } = {}) {
  const url = new URL(`${BASE_URL}/ugc-feed`);
  if (mood) url.searchParams.set('mood', mood);
  if (city) url.searchParams.set('city', city);
  const resp = await fetch(url.toString());
  if (!resp.ok) {
    throw new Error('Failed to load UGC feed');
  }
  return resp.json();
}

export async function reportQuest(userId, questId, reason, city, mood) {
  const resp = await fetch(`${BASE_URL}/report-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, questId, reason, city, mood })
  });
  if (!resp.ok) {
    throw new Error('Failed to report quest');
  }
  return resp.json();
}

export async function getQuestReports() {
  const resp = await fetch(`${BASE_URL}/get-quest-reports`);
  if (!resp.ok) {
    throw new Error('Failed to load reports');
  }
  return resp.json();
}

export async function toggleQuestVisibility(questId, userId, visible) {
  const resp = await fetch(`${BASE_URL}/toggle-quest-visibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questId, userId, visible })
  });
  if (!resp.ok) {
    throw new Error('Failed to update visibility');
  }
  return resp.json();
}

export async function createCheckoutSession(userId, email) {
  const resp = await fetch(`${BASE_URL}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, baseUrl: window.location.origin })
  });
  if (!resp.ok) {
    throw new Error('Failed to create checkout session');
  }
  return resp.json();
}

export async function updateActiveQuest(userId, data) {
  const resp = await fetch(`${BASE_URL}/update-active-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, data })
  });
  if (!resp.ok) {
    throw new Error('Failed to update active quest');
  }
  return resp.json();
}

export async function createCustomQuest(payload) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Auth required');
  }
  const token = await user.getIdToken();
  const resp = await fetch(`${BASE_URL}/create-custom-quest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    throw new Error('Failed to create custom quest');
  }
  return resp.json();
}

export async function getCustomQuest(id) {
  const resp = await fetch(`${BASE_URL}/custom-quests/${id}`);
  if (!resp.ok) {
    throw new Error('Failed to fetch custom quest');
  }
  return resp.json();
}

export async function listCustomQuests(userId, publicOnly = false) {
  const url = new URL(`${BASE_URL}/custom-quests`);
  url.searchParams.set('creatorId', userId);
  url.searchParams.set('publicOnly', publicOnly);
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error('Failed to list custom quests');
  return resp.json();
}

export async function publishCustomQuest(userId, questId) {
  const resp = await fetch(`${BASE_URL}/publish-custom-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, quest_id: questId })
  });
  if (!resp.ok) {
    throw new Error('Failed to publish quest');
  }
  return resp.json();
}

export async function unpublishCustomQuest(userId, questId) {
  const resp = await fetch(`${BASE_URL}/unpublish-custom-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, quest_id: questId })
  });
  if (!resp.ok) {
    throw new Error('Failed to unpublish quest');
  }
  return resp.json();
}

export async function updateCustomQuest(payload) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Auth required');
  const token = await user.getIdToken();
  const resp = await fetch(`${BASE_URL}/update-custom-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('Failed to update quest');
  return resp.json();
}

export async function likeQuest(userId, questId) {
  const resp = await fetch(`${BASE_URL}/like-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, quest_id: questId })
  });
  if (!resp.ok) {
    throw new Error('Failed to like quest');
  }
  return resp.json();
}

export async function viewQuest(userId, questId) {
  const resp = await fetch(`${BASE_URL}/view-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, quest_id: questId })
  });
  if (!resp.ok) {
    throw new Error('Failed to view quest');
  }
  return resp.json();
}

export async function replayQuest(questId, userId) {
  const resp = await fetch(`${BASE_URL}/replay-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quest_id: questId, user_id: userId })
  });
  if (!resp.ok) {
    throw new Error('Failed to replay quest');
  }
  return resp.json();
}

export async function remixQuest(location, mood, tags, userId) {
  const resp = await fetch(`${BASE_URL}/remix-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location, mood, tagList: tags, user_id: userId })
  });
  if (!resp.ok) {
    throw new Error('Failed to remix quest');
  }
  return resp.json();
}

export async function searchQuests(query, userId) {
  const url = new URL(`${BASE_URL}/search-quests`);
  url.searchParams.set('query', query);
  if (userId) url.searchParams.set('user_id', userId);
  const resp = await fetch(url.toString());
  if (!resp.ok) {
    throw new Error('Failed to search');
  }
  return resp.json();
}

export async function createCommunityGroup(data) {
  const resp = await fetch(`${BASE_URL}/create-community-group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!resp.ok) {
    throw new Error('Failed to create group');
  }
  return resp.json();
}

export async function joinCommunityGroup(group_id, user_id) {
  const resp = await fetch(`${BASE_URL}/join-community-group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id, user_id })
  });
  if (!resp.ok) {
    throw new Error('Failed to join group');
  }
  return resp.json();
}

export async function linkQuestToGroup(group_id, quest_id, upcoming = false) {
  const resp = await fetch(`${BASE_URL}/link-quest-to-group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id, quest_id, upcoming })
  });
  if (!resp.ok) {
    throw new Error('Failed to link quest');
  }
  return resp.json();
}

export async function auditQuestCache() {
  const resp = await fetch(`${BASE_URL}/audit-quest-cache`);
  if (!resp.ok) throw new Error('Failed to audit');
  return resp.json();
}

export async function rebuildQuestCache(payload) {
  const resp = await fetch(`${BASE_URL}/rebuild-quest-cache`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('Failed to rebuild cache');
  return resp.json();
}


export async function createCommunity(data) {
  const resp = await fetch(`${BASE_URL}/create-community`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!resp.ok) throw new Error('Failed to create community');
  return resp.json();
}

export async function joinCommunity(userId, communityId) {
  const resp = await fetch(`${BASE_URL}/join-community`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, communityId })
  });
  if (!resp.ok) throw new Error('Failed to join');
  return resp.json();
}

export async function publishToCommunity(communityId, questId) {
  const resp = await fetch(`${BASE_URL}/publish-to-community`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ communityId, questId })
  });
  if (!resp.ok) throw new Error('Failed to publish');
  return resp.json();
}

export async function getCommunity(id) {
  const resp = await fetch(`${BASE_URL}/community/${id}`);
  if (!resp.ok) throw new Error('Failed to load community');
  return resp.json();
}

export async function getTrendingCommunities() {
  const resp = await fetch(`${BASE_URL}/community-trending`);
  if (!resp.ok) throw new Error('Failed to load communities');
  return resp.json();
}

export async function getAdminDashboard(userId) {
  const resp = await fetch(`${BASE_URL}/admin/dashboard?userId=${userId}`);
  if (!resp.ok) throw new Error('Failed to load dashboard');
  return resp.json();
}

export async function resolveReport(userId, reportId) {
  const resp = await fetch(`${BASE_URL}/admin/resolve-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, reportId })
  });
  if (!resp.ok) throw new Error('Failed to resolve');
  return resp.json();
}

export async function deleteQuestAdmin(userId, questId, type) {
  const resp = await fetch(`${BASE_URL}/admin/delete-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, questId, type })
  });
  if (!resp.ok) throw new Error('Failed to delete');
  return resp.json();
}

export async function banUser(userId, targetId) {
  const resp = await fetch(`${BASE_URL}/admin/ban-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, targetId })
  });
  if (!resp.ok) throw new Error('Failed to ban user');
  return resp.json();
}

export async function submitUGC(payload) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Auth required');
  const token = await user.getIdToken();
  const resp = await fetch(`${BASE_URL}/ugc-submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('Failed to submit');
  return resp.json();
}
export async function submitFeaturedQuest(payload) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Auth required');
  const token = await user.getIdToken();
  const resp = await fetch(`${BASE_URL}/submit-featured-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('Failed to submit quest');
  return resp.json();
}

export async function getFeaturedQuests(approved = true) {
  const url = new URL(`${BASE_URL}/featured-quests`);
  if (approved !== null) url.searchParams.set('approved', approved);
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error('Failed to load featured quests');
  return resp.json();
}

export async function listPendingFeatured(userId) {
  const url = new URL(`${BASE_URL}/admin/featured-pending`);
  url.searchParams.set('userId', userId);
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error('Failed to load pending quests');
  return resp.json();
}

export async function reviewFeaturedQuest(userId, questId, approved = true) {
  const resp = await fetch(`${BASE_URL}/admin/review-featured-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, questId, approved })
  });
  if (!resp.ok) throw new Error('Failed to update quest');
  return resp.json();
}

// ===== Group Chat =====

export async function sendMessage(groupId, senderId, senderName, text) {
  await addDoc(collection(db, 'group_chats', groupId, 'messages'), {
    senderId,
    senderName,
    text,
    timestamp: serverTimestamp(),
  });
}

export function fetchChatStream(groupId, callback) {
  const q = query(
    collection(db, 'group_chats', groupId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
}



export async function createPromoCode(userId, data) {
  const resp = await fetch(`${BASE_URL}/create-promo-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...data })
  });
  if (!resp.ok) throw new Error('Failed to create code');
  return resp.json();
}

export async function redeemPromoCode(uid, code) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Auth required');
  const token = await user.getIdToken();
  const resp = await fetch(`${BASE_URL}/redeem-promo-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uid, code })
  });
  if (!resp.ok) throw new Error('Failed to redeem code');
  return resp.json();
}

export async function fetchAnalytics(userId, days = 30) {
  const url = new URL(`${BASE_URL}/admin/analytics`);
  url.searchParams.set('userId', userId);
  if (days) url.searchParams.set('days', days);
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error('Failed to load analytics');
  return resp.json();
}

export async function adminCreateCustomQuest(userId, quest) {
  const resp = await fetch(`${BASE_URL}/admin/create-custom-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, quest })
  });
  if (!resp.ok) throw new Error('Failed to create quest');
  return resp.json();
}

export async function adminEditCustomQuest(userId, questId, data) {
  const resp = await fetch(`${BASE_URL}/admin/edit-custom-quest`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, questId, data })
  });
  if (!resp.ok) throw new Error('Failed to update quest');
  return resp.json();
}

export async function adminDeleteCustomQuest(userId, questId) {
  const url = new URL(`${BASE_URL}/admin/delete-custom-quest`);
  url.searchParams.set('userId', userId);
  url.searchParams.set('questId', questId);
  const resp = await fetch(url.toString(), { method: 'DELETE' });
  if (!resp.ok) throw new Error('Failed to delete quest');
  return resp.json();
}
