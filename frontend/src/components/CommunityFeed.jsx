import React, { useEffect, useState } from 'react';
import { getCommunityQuests, reportQuest } from '../lib/api';
import { getAuth } from 'firebase/auth';

export default function CommunityFeed() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getCommunityQuests();
        setQuests(data.quests || []);
      } catch (err) {
        console.error('Failed to load feed', err);
        setError('Failed to load feed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleReport = async (quest) => {
    const reason = window.prompt('Reason for report?');
    if (!reason) return;
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert('You must be logged in');
    try {
      await reportQuest(user.uid, quest.questId, reason, quest.city, quest.mood);
      alert('Report submitted');
    } catch (err) {
      console.error('Failed to report quest', err);
      alert('Failed to report quest');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (quests.length === 0) return <div className="p-6">Join the fun – no recent community quests yet.</div>;

  return (
    <div className="min-h-screen bg-[#f8fcf8] px-6 py-8 text-[#0e1b0e] font-sans">
      <h1 className="text-2xl font-bold mb-6">Community Feed</h1>
      <div className="space-y-4">
        {quests.map((q) => (
          <div key={q.id} className="flex gap-4 bg-white p-4 rounded-lg shadow">
            <img src={q.imageUrl || 'https://placehold.co/200'} alt="" className="w-32 h-20 object-cover rounded" />
            <div className="flex-1 text-sm">
              <h2 className="font-semibold">{q.title || 'Quest'}</h2>
              <p className="text-gray-600">{q.city} - {q.mood}</p>
              <p className="text-gray-500 text-xs">{new Date(q.completedAt).toLocaleString()}</p>
              {q.displayName && <p className="text-xs">By {q.displayName}</p>}
              <button onClick={() => handleReport(q)} className="text-red-500 underline text-xs mt-1">Report</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

