import React, { useEffect, useState } from 'react';
import QuestCard from '../components/QuestCard';
import { getFeaturedQuests } from '../lib/api';

export default function Featured() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getFeaturedQuests(true);
        setQuests(data.quests || []);
      } catch (e) {
        console.error('failed to load', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Featured Quests</h1>
      {quests.length === 0 && <p>No featured quests yet.</p>}
      <div className="space-y-4">
        {quests.map((q) => (
          <QuestCard key={q.id} quest={q} />
        ))}
      </div>
    </div>
  );
}
