import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getCommunity, joinCommunity } from '../lib/api';

export default function CommunityPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [joining, setJoining] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    getCommunity(id)
      .then((d) => setData(d))
      .catch((err) => console.error('load failed', err));
  }, [id]);

  const handleJoin = async () => {
    const user = auth.currentUser;
    if (!user) return alert('Login required');
    try {
      setJoining(true);
      await joinCommunity(user.uid, id);
      setData((d) => ({
        ...d,
        community: {
          ...d.community,
          memberIds: [...(d.community.memberIds || []), user.uid],
          followerCount: (d.community.followerCount || 0) + 1,
        },
      }));
    } catch (err) {
      console.error('join failed', err);
    } finally {
      setJoining(false);
    }
  };

  if (!data) return <div className="p-6">Loading...</div>;
  const { community, quests } = data;
  const isMember = auth.currentUser && community.memberIds?.includes(auth.currentUser.uid);
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4 text-[#0e1b0e]">
      <h1 className="text-2xl font-bold">{community.name}</h1>
      <p>{community.description}</p>
      <div className="text-sm">Followers: {community.followerCount || 0}</div>
      {!isMember && (
        <button
          className="px-3 py-1 bg-green-600 text-white rounded"
          onClick={handleJoin}
          disabled={joining}
        >
          {joining ? 'Joining...' : 'Join'}
        </button>
      )}
      <div className="space-y-2">
        {quests.map((q) => (
          <div key={q.id} className="border p-2 rounded">
            <div className="font-semibold text-sm">{q.title || 'Quest'}</div>
            <div className="text-xs text-gray-600">{q.city} - {q.mood}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
