import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchCreatorStats } from '../lib/ugcUtils';

export default function CreatorDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return navigate('/');
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists() || !snap.data().isCreator) {
        navigate('/');
        return;
      }
      const data = await fetchCreatorStats(user.uid);
      setStats(data);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!stats) return <div className="p-6">No data</div>;

  const { profile, submissions } = stats;

  return (
    <div className="p-6 text-[#0e1b0e] space-y-4">
      <h1 className="text-2xl font-bold">Creator Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-500">Total Submissions</p>
          <p className="text-xl font-bold">{profile?.totalSubmissions || submissions.length}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-500">Quest Shares</p>
          <p className="text-xl font-bold">{profile?.totalQuestShares || 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-500">Creator Level</p>
          <p className="text-xl font-bold capitalize">{profile?.creatorLevel || 'bronze'}</p>
        </div>
      </div>
      <div>
        <h2 className="font-semibold mt-4 mb-2">Your Submissions</h2>
        <ul className="space-y-2">
          {submissions.map((s) => (
            <li key={s.id} className="border p-2 rounded text-sm flex justify-between">
              <span>#{s.tag} – {s.platform}</span>
              <span>{new Date(s.timestamp).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={() => navigate('/creator-dashboard/submit-quest')}
        className="bg-blue-600 text-white px-3 py-2 rounded"
      >
        Submit Featured Quest
      </button>
    </div>
  );
}
