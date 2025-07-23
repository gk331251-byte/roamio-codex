import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuest, rebuildQuestCache } from '../lib/api';
import { getAuth } from 'firebase/auth';

const decodeDoc = (doc) => {
  if (!doc || !doc.fields) return null;
  const fromVal = (v) => {
    if (v.stringValue !== undefined) return v.stringValue;
    if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
    if (v.doubleValue !== undefined) return v.doubleValue;
    if (v.arrayValue) return (v.arrayValue.values || []).map(fromVal);
    if (v.mapValue) {
      const obj = {};
      for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
        obj[k] = fromVal(val);
      }
      return obj;
    }
    return null;
  };
  const out = {};
  for (const [k, val] of Object.entries(doc.fields)) {
    out[k] = fromVal(val);
  }
  return out;
};

export default function TagEditor() {
  const { questId } = useParams();
  const [tags, setTags] = useState('');
  const [quest, setQuest] = useState(null);
  const [message, setMessage] = useState('');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const u = auth.currentUser;
    setAuthorized(u?.email === 'admin@roamio.app');
    if (!u || u.email !== 'admin@roamio.app') return;
    getQuest(questId)
      .then((doc) => {
        const q = decodeDoc(doc);
        setQuest(q);
        setTags((q.tags || []).join(', '));
      })
      .catch(() => setMessage('Failed to load quest'));
  }, [questId]);

  const handleRebuild = async () => {
    if (!quest) return;
    try {
      await rebuildQuestCache({
        city: quest.city,
        mood: quest.mood,
        tagOverride: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setMessage('Quest rebuilt!');
    } catch (err) {
      console.error('rebuild failed', err);
      setMessage('Failed to rebuild');
    }
  };

  if (!authorized) return <div className="p-6">Not authorized</div>;
  if (!quest) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4 text-[#0e1b0e]">
      <h1 className="text-xl font-bold">Tag Editor</h1>
      <div className="text-sm">City: {quest.city}</div>
      <div className="text-sm">Mood: {quest.mood}</div>
      <input
        className="border p-2 rounded w-full"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="comma separated tags"
      />
      <button
        onClick={handleRebuild}
        className="px-4 py-2 rounded bg-green-600 text-white"
      >
        Rebuild with Tags
      </button>
      {message && <div className="text-sm text-gray-600">{message}</div>}
    </div>
  );
}

