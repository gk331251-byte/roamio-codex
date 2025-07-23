const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

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

export async function completeQuest(userId, questId, questData) {
  const url = `${BASE_URL}/quest-complete`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, questId, questData })
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
