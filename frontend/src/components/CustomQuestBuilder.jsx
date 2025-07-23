import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { createCustomQuest, createGroupQuest, validatePremium, publishCustomQuest } from '../lib/api';


const moodOptions = [
  'romantic',
  'spooky',
  'cozy',
  'outdoorsy',
  'historic',
  'quirky',
];

const templates = [
  { title: 'Romantic Stroll', moods: ['romantic'], prompt: 'A dreamy walk for two.' },
  { title: 'Bar Crawl', moods: ['quirky'], prompt: 'A hopping night on the town.' },
  { title: 'Cozy Coffee Walk', moods: ['cozy'], prompt: 'Sip and stroll to the best cafes.' },
  { title: 'First Date Adventure', moods: ['romantic', 'outdoorsy'], prompt: 'Break the ice with fun mini challenges.' },
  { title: 'Funky Vintage Hunt', moods: ['quirky'], prompt: 'Search for the coolest retro finds.' },
];


export default function CustomQuestBuilder() {
  const [user, setUser] = useState(null);
  const [premium, setPremium] = useState(false);
  const [title, setTitle] = useState('');
  const [moods, setMoods] = useState([]);
  const [timeLimit, setTimeLimit] = useState(60);
  const [prompt, setPrompt] = useState('');
  const [locations, setLocations] = useState([
    { name: '', placeId: '', lat: null, lng: null, duration: 10 },
    { name: '', placeId: '', lat: null, lng: null, duration: 10 },
  ]);
  const [publishLink, setPublishLink] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const u = auth.currentUser;
    setUser(u);
    if (!u) return;
    validatePremium(u.uid)
      .then((r) => setPremium(!!r.premium))
      .catch(() => setPremium(false));
  }, []);

  useEffect(() => {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    locations.forEach((_, idx) => {
      const input = document.getElementById(`loc-${idx}`);
      if (!input || input._ac) return;
      const ac = new window.google.maps.places.Autocomplete(input);
      input._ac = ac;
      ac.addListener('place_changed', () => {
        const p = ac.getPlace();
        if (!p.geometry) return;
        const { lat, lng } = p.geometry.location.toJSON();
        const updated = [...locations];
        updated[idx] = {
          ...updated[idx],
          name: p.name,
          placeId: p.place_id,
          lat,
          lng,
        };
        setLocations(updated);
      });
    });
  }, [locations]);

  const toggleMood = (m) => {
    setMoods(moods.includes(m) ? moods.filter((x) => x !== m) : [...moods, m]);
  };

  const addLocation = () => {
    if (locations.length >= 5) return;
    setLocations([...locations, { name: '', placeId: '', lat: null, lng: null, duration: 10 }]);
  };

  const removeLocation = (i) => {
    if (locations.length <= 2) return;
    setLocations(locations.filter((_, idx) => idx !== i));
  };

  const handleStart = async () => {
    if (!user) return alert('Login required');
    if (!premium) return navigate('/quest-plus');
    if (locations.some((l) => !l.placeId)) return alert('Select valid locations');
    try {
      const res = await createCustomQuest({
        user_id: user.uid,
        title,
        mood_tags: moods,
        places: locations.map((l) => ({
          name: l.name,
          place_id: l.placeId,
          lat: l.lat,
          lng: l.lng,
          duration_minutes: l.duration,
        })),
        time_limit: timeLimit,
        custom_prompt: prompt,
        status: 'draft',
      });
      const { questId, quest } = res;
      const group = await createGroupQuest(user.uid, questId, user.displayName);
      navigate('/live', { state: { quest, questId, groupId: group.groupId, timeLimit } });
    } catch (err) {
      console.error('custom quest failed', err);
      alert('Failed to start custom quest');
    }
  };

  const handleSaveDraft = async () => {
    if (!user) return alert('Login required');
    try {
      await createCustomQuest({
        user_id: user.uid,
        title,
        mood_tags: moods,
        places: locations.map((l) => ({
          name: l.name,
          place_id: l.placeId,
          lat: l.lat,
          lng: l.lng,
          duration_minutes: l.duration,
        })),
        time_limit: timeLimit,
        custom_prompt: prompt,
        status: 'draft',
      });
      alert('Draft saved!');
    } catch (err) {
      console.error('save draft failed', err);
    }
  };

  const handlePublish = async () => {
    if (!user) return alert('Login required');
    if (!premium) return navigate('/quest-plus');
    try {
      const res = await createCustomQuest({
        user_id: user.uid,
        title,
        mood_tags: moods,
        places: locations.map((l) => ({
          name: l.name,
          place_id: l.placeId,
          lat: l.lat,
          lng: l.lng,
          duration_minutes: l.duration,
        })),
        time_limit: timeLimit,
        custom_prompt: prompt,
        status: 'draft',
      });
      await publishCustomQuest(user.uid, res.questId);
      setPublishLink(`${window.location.origin}/q/${res.questId}`);
    } catch (err) {
      console.error('publish failed', err);
      alert('Failed to publish quest');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fcf8] px-6 py-8 text-[#0e1b0e] font-sans">
      <h1 className="text-2xl font-bold mb-6 text-center">Build a Custom Quest</h1>

      <div className="space-y-4 max-w-xl mx-auto">
        <select
          className="w-full border p-2 rounded"
          onChange={(e) => {
            const t = templates[e.target.value];
            if (t) {
              setTitle(t.title);
              setMoods(t.moods);
              setPrompt(t.prompt);
            }
          }}
        >
          <option value="">Load Template...</option>
          {templates.map((t, idx) => (
            <option key={idx} value={idx}>{t.title}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Quest Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <div className="flex flex-wrap gap-2">
          {moodOptions.map((m) => (
            <button
              key={m}
              onClick={() => toggleMood(m)}
              className={`px-3 py-1 rounded-full text-sm border ${
                moods.includes(m) ? 'bg-green-600 text-white' : 'bg-white text-gray-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <label className="block">Time Limit: {timeLimit} mins</label>
        <input
          type="range"
          min="30"
          max="240"
          step="30"
          value={timeLimit}
          onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
          className="w-full"
        />

        {locations.map((loc, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              id={`loc-${idx}`}
              type="text"
              placeholder={`Location ${idx + 1}`}
              className="flex-1 border p-2 rounded"
            />
            <select
              value={loc.duration}
              onChange={(e) => {
                const updated = [...locations];
                updated[idx].duration = parseInt(e.target.value, 10);
                setLocations(updated);
              }}
              className="border p-2 rounded"
            >
              {[10, 20, 30, 45].map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
            {locations.length > 2 && (
              <button onClick={() => removeLocation(idx)} className="text-red-600 text-sm">X</button>
            )}
          </div>
        ))}
        {locations.length < 5 && (
          <button onClick={addLocation} className="text-sm underline">
            + Add Stop
          </button>
        )}

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Optional custom prompt or story..."
          className="w-full border p-2 rounded h-24"
        />

        <button
          onClick={handleStart}
          disabled={!premium}
          className={`w-full py-2 rounded-lg text-white ${
            premium ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Start Quest
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleSaveDraft}
            className="flex-1 py-2 rounded-lg border"
          >
            Save as Draft
          </button>
          <button
            onClick={handlePublish}
            disabled={!premium}
            className={`flex-1 py-2 rounded-lg text-white ${
              premium ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Publish Quest
          </button>
        </div>
        {publishLink && (
          <div className="text-center text-sm">
            Share Link:{' '}
            <button
              onClick={() => navigator.clipboard.writeText(publishLink)}
              className="text-blue-600 underline"
            >
              {publishLink}
            </button>
          </div>
        )}
        {!premium && (
          <p className="text-center text-sm">
            Custom quests are a Quest+ feature.{' '}
            <a href="/quest-plus" className="text-blue-600 underline">
              Upgrade to Quest+
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

