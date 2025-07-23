const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

/**
 * Fetches a generated quest from the backend
 * @param {string} city - The city for the quest
 * @param {string[]} mood - Array of selected moods (e.g. ["adventurous", "cozy"])
 * @param {number} timeLimit - Time limit in minutes
 * @param {string} token - Firebase user token for auth
 */
export async function generateQuest(city, mood, timeLimit, token, userId) {
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
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate quest: ${errorText}`);
  }

  return await response.json();
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
  const url = new URL(`${BASE_URL}/validate-premium/${userId}`);
  if (sessionId) url.searchParams.set('session_id', sessionId);
  const resp = await fetch(url.toString());
  if (!resp.ok) {
    throw new Error('Failed to validate premium');
  }
  return resp.json();
}

export async function getUserQuests(userId) {
  const resp = await fetch(`${BASE_URL}/get-user-quests?userId=${userId}`);
  if (!resp.ok) {
    throw new Error('Failed to load quests');
  }
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
  const resp = await fetch(`${BASE_URL}/create-custom-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    throw new Error('Failed to create custom quest');
  }
  return resp.json();
}

export async function getCustomQuest(id) {
  const resp = await fetch(`${BASE_URL}/get-custom-quest/${id}`);
  if (!resp.ok) {
    throw new Error('Failed to fetch custom quest');
  }
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

export async function replayQuest(questId) {
  const resp = await fetch(`${BASE_URL}/replay-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quest_id: questId })
  });
  if (!resp.ok) {
    throw new Error('Failed to replay quest');
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

