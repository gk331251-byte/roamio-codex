const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

/**
 * Fetches a generated quest from the backend
 * @param {string} city - The city for the quest
 * @param {string[]} mood - Array of selected moods (e.g. ["adventurous", "cozy"])
 * @param {number} timeLimit - Time limit in minutes
 * @param {string} token - Firebase user token for auth
 */
export async function generateQuest(city, mood, timeLimit, token) {
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
      moods: mood,               // ✅ Send mood as an array, not joined
      time_limit: timeLimit,     // ✅ Keep snake_case for backend match
      token
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

export async function validatePremium(userId) {
  const resp = await fetch(`${BASE_URL}/validate-premium/${userId}`);
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

