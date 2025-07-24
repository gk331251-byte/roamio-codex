import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  adminCreateCustomQuest,
  adminEditCustomQuest,
  adminDeleteCustomQuest,
} from '../lib/api';
import { toast } from '../lib/toast';
const difficultyLevels = ['Easy', 'Medium', 'Hard'];

export default function AdminQuestEditor() {
  const [loading, setLoading] = useState(true);
  const [quests, setQuests] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [questText, setQuestText] = useState('');
  const [mood, setMood] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [locations, setLocations] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [communityRef, setCommunityRef] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return navigate('/');
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists() || !snap.data().isAdmin) {
        navigate('/');
        return;
      }
      const [qSnap, cSnap] = await Promise.all([
        getDocs(collection(db, 'custom_quests')),
        getDocs(collection(db, 'communities')),
      ]);
      setQuests(qSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCommunities(cSnap.docs.map((d) => ({ id: d.id, name: d.data().name })));
      setLoading(false);
    })();
  }, [navigate]);

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setQuestText('');
    setMood('');
    setDifficulty('Easy');
    setLocations('');
    setIsPublic(false);
    setCommunityRef('');
  };

  const parseLocations = (text) => {
    return text
      .split('\n')
      .map((line) => {
        const [name, lat, lng, type] = line.split(',').map((v) => v.trim());
        if (!name || !lat || !lng) return null;
        return { name, lat: Number(lat), lng: Number(lng), type: type || 'poi' };
      })
      .filter(Boolean);
  };

  const handleSubmit = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return toast('Login required');
    const data = {
      title,
      questText,
      mood: mood.split(',').map((m) => m.trim()).filter(Boolean),
      difficulty,
      locationList: parseLocations(locations),
      isPublic,
      communityRef: communityRef || null,
    };
    try {
      if (editing) {
        await adminEditCustomQuest(user.uid, editing.id, data);
        toast('Quest updated');
      } else {
        const res = await adminCreateCustomQuest(user.uid, data);
        toast('Quest created');
        setQuests((q) => [...q, { id: res.questId, ...data }]);
      }
      resetForm();
    } catch (err) {
      console.error('save failed', err);
      toast('Save failed');
    }
  };

  const handleEdit = (q) => {
    setEditing(q);
    setTitle(q.title || '');
    setQuestText(q.questText || '');
    setMood(Array.isArray(q.mood) ? q.mood.join(',') : q.mood || '');
    setDifficulty(q.difficulty || 'Easy');
    setLocations(
      (q.locationList || [])
        .map((p) => `${p.name},${p.lat},${p.lng},${p.type || 'poi'}`)
        .join('\n')
    );
    setIsPublic(q.isPublic || false);
    setCommunityRef(q.communityRef || '');
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm('Delete this quest?')) return;
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return toast('Login required');
    try {
      await adminDeleteCustomQuest(user.uid, editing.id);
      setQuests((q) => q.filter((x) => x.id !== editing.id));
      toast('Quest deleted');
      resetForm();
    } catch (err) {
      console.error('delete failed', err);
      toast('Delete failed');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6 text-[#0e1b0e]">
      <h1 className="text-2xl font-bold">Admin Quest Editor</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <input
            className="border p-2 w-full"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="border p-2 w-full h-32"
            placeholder="Quest text"
            value={questText}
            onChange={(e) => setQuestText(e.target.value)}
          />
          <input
            className="border p-2 w-full"
            placeholder="Mood (comma separated)"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
          />
          <select
            className="border p-2 w-full"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {difficultyLevels.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <textarea
            className="border p-2 w-full h-32"
            placeholder="name,lat,lng,type per line"
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
          />
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Public
          </label>
          <select
            className="border p-2 w-full"
            value={communityRef}
            onChange={(e) => setCommunityRef(e.target.value)}
          >
            <option value="">No Community</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>{c.name || c.id}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-3 py-1 rounded">
              {editing ? 'Update Quest' : 'Create Quest'}
            </button>
            {editing && (
              <button onClick={handleDelete} className="bg-red-600 text-white px-3 py-1 rounded">
                Delete
              </button>
            )}
            {editing && (
              <button onClick={resetForm} className="border px-3 py-1 rounded">
                Cancel
              </button>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">Existing Quests</h2>
          <ul className="space-y-1 text-sm max-h-96 overflow-y-auto border p-2 rounded">
            {quests.map((q) => (
              <li key={q.id} className="flex justify-between border-b last:border-b-0 py-1">
                <span>{q.title}</span>
                <button onClick={() => handleEdit(q)} className="text-blue-600 underline text-xs">Edit</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

