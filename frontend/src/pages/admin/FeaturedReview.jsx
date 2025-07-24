import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import QuestCard from '../../components/QuestCard';
import { listPendingFeatured, reviewFeaturedQuest } from '../../lib/api';

export default function FeaturedReview() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists() || !snap.data().isAdmin) return;
      const data = await listPendingFeatured(user.uid);
      setQuests(data.quests || []);
      setLoading(false);
    })();
  }, []);

  const handleAction = async (questId, approved) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    await reviewFeaturedQuest(user.uid, questId, approved);
    setQuests((q) => q.filter((item) => item.id !== questId));
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Review Featured Quests</h1>
      {quests.map((q) => (
        <div key={q.id} className="border p-4 rounded space-y-2">
          <QuestCard quest={q} />
          <div className="flex gap-2">
            <button onClick={() => handleAction(q.id, true)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Approve</button>
            <button onClick={() => handleAction(q.id, false)} className="bg-red-600 text-white px-3 py-1 rounded text-sm">Reject</button>
          </div>
        </div>
      ))}
      {quests.length === 0 && <p>No pending quests.</p>}
    </div>
  );
}
