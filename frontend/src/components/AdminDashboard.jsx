import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  getAdminDashboard,
  resolveReport,
  deleteQuestAdmin,
  banUser
} from '../lib/api';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return navigate('/');
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists() || !snap.data().isAdmin) {
        navigate('/');
        return;
      }
      try {
        const data = await getAdminDashboard(user.uid);
        setStats(data.stats);
        setReports(data.reports || []);
      } catch (err) {
        console.error('dashboard load failed', err);
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [auth, navigate]);

  const handleResolve = async (id) => {
    try {
      await resolveReport(auth.currentUser.uid, id);
      setReports((r) => r.map((x) => (x.id === id ? { ...x, resolved: true } : x)));
    } catch (err) {
      console.error('resolve failed', err);
    }
  };

  const handleDelete = async (q) => {
    if (!window.confirm('Delete this quest?')) return;
    try {
      await deleteQuestAdmin(auth.currentUser.uid, q.questId, q.type);
    } catch (err) {
      console.error('delete failed', err);
    }
  };

  const handleBan = async (uid) => {
    if (!window.confirm('Ban this user?')) return;
    try {
      await banUser(auth.currentUser.uid, uid);
    } catch (err) {
      console.error('ban failed', err);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!stats) return null;

  const barData = {
    labels: Object.keys(stats.dailyCompletions || {}),
    datasets: [
      {
        label: 'Completions',
        data: Object.values(stats.dailyCompletions || {}),
        backgroundColor: '#3b82f6',
      },
    ],
  };

  return (
    <div className="p-6 text-[#0e1b0e] space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-500">Quests Today</p>
          <p className="text-xl font-bold">{stats.questsToday}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-500">Total Users</p>
          <p className="text-xl font-bold">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-500">Total Reports</p>
          <p className="text-xl font-bold">{stats.totalReports}</p>
        </div>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <Bar data={barData} className="w-full" />
      </div>

      {/* Reports */}
      <div>
        <h2 className="font-semibold mb-2">Report Moderation</h2>
        <label className="text-sm mr-2">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show All
        </label>
        <div className="space-y-2 mt-2">
          {reports
            .filter((r) => showAll || !r.resolved)
            .map((r) => (
              <div key={r.id} className="border p-2 rounded flex justify-between">
                <div className="text-sm">
                  <p className="font-medium">{r.questId}</p>
                  <p className="text-xs">Reason: {r.reason}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <button className="text-xs bg-green-600 text-white px-2 py-1 rounded" onClick={() => handleResolve(r.id)}>
                    Resolve
                  </button>
                  <button className="text-xs bg-red-600 text-white px-2 py-1 rounded" onClick={() => handleDelete(r)}>
                    Delete Quest
                  </button>
                  <button className="text-xs bg-gray-600 text-white px-2 py-1 rounded" onClick={() => handleBan(r.reportedBy)}>
                    Ban User
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Trends */}
      <div>
        <h2 className="font-semibold mb-2">Trends Overview</h2>
        <ul className="list-disc ml-6 text-sm space-y-1">
          {stats.topMoods.map((m) => (
            <li key={m[0]}>
              {m[0]} – {m[1]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

