import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuestReports, toggleQuestVisibility } from '../lib/api';

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getQuestReports();
        setReports(data.reports || []);
      } catch (err) {
        console.error('Failed to load reports', err);
        setError('Failed to load reports');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleHide = async (r) => {
    if (!window.confirm('Hide this quest from community feed?')) return;
    try {
      await toggleQuestVisibility(r.questId, r.userId, false);
      alert('Quest hidden');
    } catch (err) {
      console.error('Failed to update visibility', err);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-[#f8fcf8] px-6 py-8 text-[#0e1b0e] font-sans">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="space-y-4">
        {reports.map((r) => (
          <div key={r.id} className="flex justify-between bg-white p-4 rounded-lg shadow">
            <div className="text-sm">
              <p className="font-semibold">{r.city} - {r.mood}</p>
              <p className="text-xs text-gray-600">By {r.userId}</p>
              <p className="text-xs">Reason: {r.reason}</p>
            </div>
            <div className="flex gap-2 items-center">
              <Link to={`/tag-editor/${r.questId}`} className="text-blue-600 underline text-xs">Edit Tags</Link>
              <button onClick={() => handleHide(r)} className="h-8 px-3 rounded bg-red-500 text-white text-xs">Hide Quest</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
