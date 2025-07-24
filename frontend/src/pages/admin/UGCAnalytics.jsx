import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { fetchWeeklyTagConfig } from '../../lib/xpBoostHelpers';
import { fetchUGCAnalytics, exportAnalyticsCsv } from '../../lib/ugcUtils';

export default function UGCAnalytics() {
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
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
      const cfg = await fetchWeeklyTagConfig();
      const weekKey = cfg.startDate || '';
      const data = await fetchUGCAnalytics(weekKey);
      setConfig(cfg);
      setAnalytics(data || {});
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <div className="p-6">Loading...</div>;

  const handleExport = () => {
    exportAnalyticsCsv(analytics);
  };

  return (
    <div className="p-6 text-[#0e1b0e] space-y-4">
      <h1 className="text-2xl font-bold">UGC Analytics</h1>
      {config && (
        <div className="bg-white p-4 rounded shadow">
          <p className="font-semibold">Active Tag: #{config.activeTag}</p>
          <p className="text-sm">
            {config.startDate} – {config.endDate}
          </p>
        </div>
      )}
      {analytics && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <p className="text-xs text-gray-500">Total Submissions</p>
              <p className="text-xl font-bold">{analytics.totalSubmissions || 0}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <p className="text-xs text-gray-500">Unique Users</p>
              <p className="text-xl font-bold">{analytics.uniqueUsers || 0}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <p className="text-xs text-gray-500">Most Used Tag</p>
              <p className="text-xl font-bold">#{analytics.mostUsedTag || ''}</p>
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Top Contributors</h2>
            <ul className="space-y-2">
              {(analytics.topContributors || []).map((c) => (
                <li key={c.uid} className="border p-2 rounded text-sm flex justify-between">
                  <span>{c.displayName}</span>
                  <span>{c.submissionCount}</span>
                </li>
              ))}
            </ul>
          </div>
          <button onClick={handleExport} className="bg-blue-600 text-white px-3 py-2 rounded">
            Export CSV
          </button>
        </div>
      )}
    </div>
  );
}
