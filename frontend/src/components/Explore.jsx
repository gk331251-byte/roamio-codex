import React, { useState } from 'react';
import { searchQuests, replayQuest, remixQuest } from '../lib/api';
import { getAuth } from 'firebase/auth';

export default function Explore() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [msg, setMsg] = useState('');
  const auth = getAuth();
  const user = auth.currentUser;

  const handleSearch = async () => {
    setMsg('');
    try {
      const data = await searchQuests(query, user?.uid || '');
      setResults(data);
    } catch (err) {
      console.error('search failed', err);
      setMsg('Search failed');
    }
  };

  const handleReplay = async (qid) => {
    if (!user) return;
    try {
      await replayQuest(qid, user.uid);
      setMsg('Quest added to history');
    } catch (err) {
      console.error('replay failed', err);
    }
  };

  const handleRemix = async (q) => {
    if (!user) return;
    try {
      await remixQuest(q.city, q.mood, q.tags || [], user.uid);
      setMsg('Remixed quest saved');
    } catch (err) {
      console.error('remix failed', err);
    }
  };

  const renderList = (title, list) => (
    list && list.length > 0 && (
      <div className="space-y-2">
        <h2 className="font-bold text-lg mt-4">{title}</h2>
        {list.map((q) => (
          <div key={q.id} className="border p-2 rounded flex justify-between items-center">
            <div>
              <div className="font-medium">{q.title || q.mood || 'Quest'}</div>
              <div className="text-sm text-gray-600">{q.city} | {q.mood}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleReplay(q.id)} className="px-2 py-1 text-sm border rounded">Replay</button>
              <button onClick={() => handleRemix(q)} className="px-2 py-1 text-sm border rounded">Remix</button>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="p-6 text-[#0e1b0e]">
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border p-2 rounded"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search quests by mood, tag, or city"
        />
        <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleSearch}>
          Search
        </button>
      </div>
      {msg && <div className="text-sm text-gray-600 mb-2">{msg}</div>}
      {results && (
        <div className="space-y-4">
          {renderList('Your Past Quests', results.user)}
          {renderList('Popular Public Quests', results.public)}
          {renderList('Recently Created', results.custom)}
        </div>
      )}
    </div>
  );
}
