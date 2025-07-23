import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCustomQuest,
  createCustomQuest,
  createGroupQuest,
  likeQuest,
  viewQuest,
  replayQuest,
} from '../lib/api';
import { getAuth } from 'firebase/auth';

const toQuestObj = (doc) => {
  if (!doc || !doc.fields) return null;
  const _from = (v) => {
    if (v.stringValue !== undefined) return v.stringValue;
    if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
    if (v.doubleValue !== undefined) return v.doubleValue;
    if (v.arrayValue) return (v.arrayValue.values || []).map(_from);
    if (v.mapValue) {
      const obj = {};
      for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
        obj[k] = _from(val);
      }
      return obj;
    }
    return null;
  };
  const out = {};
  for (const [k, val] of Object.entries(doc.fields)) {
    out[k] = _from(val);
  }
  return out;
};

export default function PublicQuestPage() {
  const { questId } = useParams();
  const [quest, setQuest] = useState(null);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    getCustomQuest(questId)
      .then((doc) => setQuest(toQuestObj(doc)))
      .catch((err) => console.error('fetch quest failed', err));
    if (user) {
      viewQuest(user.uid, questId).catch(() => {});
    }
  }, [questId]);

  const handleStart = async () => {
    if (!user) return navigate('/');
    try {
      const payload = {
        user_id: user.uid,
        title: quest.title,
        mood_tags: quest.moodTags,
        places: quest.places.map((p) => ({
          name: p.name,
          place_id: p.place_id,
          lat: p.lat,
          lng: p.lng,
          duration_minutes: p.duration_minutes,
        })),
        time_limit: quest.timeLimit,
        custom_prompt: quest.customPrompt,
      };
      const res = await createCustomQuest(payload);
      const group = await createGroupQuest(user.uid, res.questId, user.displayName);
      await replayQuest(questId).catch(() => {});
      navigate('/live', { state: { quest, questId: res.questId, groupId: group.groupId } });
    } catch (err) {
      console.error('start failed', err);
    }
  };

  const handleCopy = async () => {
    if (!user) return navigate('/');
    try {
      await createCustomQuest({
        user_id: user.uid,
        title: quest.title,
        mood_tags: quest.moodTags,
        places: quest.places,
        time_limit: quest.timeLimit,
        custom_prompt: quest.customPrompt,
        status: 'draft',
      });
      await replayQuest(questId).catch(() => {});
      setCopied(true);
    } catch (err) {
      console.error('copy failed', err);
    }
  };

  if (!quest) return <div className="p-6">Loading...</div>;

  const totalTime = quest.places.reduce((t, p) => t + (p.duration_minutes || 0), 0);
  const shareLink = `${window.location.origin}/q/${questId}`;

  const handleLike = async () => {
    if (!user || liked) return;
    try {
      await likeQuest(user.uid, questId);
      setLiked(true);
    } catch (err) {
      console.error('like failed', err);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4 text-[#0e1b0e]">
      <h1 className="text-2xl font-bold">{quest.title}</h1>
      <div className="text-sm">Mood: {quest.moodTags?.join(', ')}</div>
      <div className="text-sm">Estimated Time: {totalTime} mins</div>
      <div className="text-sm flex gap-4">
        <span>❤️ {quest.likesCount || 0}</span>
        <span>👁️ {quest.viewsCount || 0}</span>
        <span>🔄 {quest.replaysCount || 0}</span>
      </div>
      <ol className="list-decimal pl-5 space-y-1">
        {quest.places.map((p, idx) => (
          <li key={idx}>{p.name} ({p.duration_minutes} min)</li>
        ))}
      </ol>
      <button
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
        onClick={handleStart}
      >
        Start this Quest!
      </button>
      {user && user.uid !== quest.createdBy && (
        <button
          className="ml-2 px-3 py-2 border rounded"
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy Quest'}
        </button>
      )}
      {user && (
        <button
          className="ml-2 px-3 py-2 border rounded"
          onClick={handleLike}
        >
          {liked ? 'Liked!' : 'Like this Quest'}
        </button>
      )}
      <div className="mt-4">
        <button
          className="text-blue-600 underline"
          onClick={() => {
            navigator.clipboard.writeText(shareLink);
            setCopied(true);
          }}
        >
          {copied ? 'Link Copied' : 'Copy Share Link'}
        </button>
      </div>
    </div>
  );
}
