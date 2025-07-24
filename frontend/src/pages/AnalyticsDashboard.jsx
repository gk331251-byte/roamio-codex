import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchAnalytics } from '../lib/api';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

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
      try {
        const res = await fetchAnalytics(user.uid, range === 0 ? undefined : range);
        setData(res);
      } catch (err) {
        console.error('analytics load failed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, range]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6">Access denied</div>;

  const growthLabels = Object.keys(data.userGrowth || {}).sort();
  const growthValues = growthLabels.map((d) => data.userGrowth[d]);

  return (
    <div className="p-6 space-y-6 text-[#0e1b0e]">
      <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
      <div>
        <label className="text-sm mr-2">Timeframe:</label>
        <select
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          className="border px-2 py-1 text-sm"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={0}>All Time</option>
        </select>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-500">Total Users</p>
          <p className="text-xl font-bold">{data.totalUsers}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-500">Quests Generated</p>
          <p className="text-xl font-bold">{data.questsGenerated}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-500">Completion Rate</p>
          <p className="text-xl font-bold">{(data.completionRate * 100).toFixed(1)}%</p>
        </div>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <Bar
          data={{ labels: growthLabels, datasets: [{ label: 'New Users', data: growthValues, backgroundColor: '#3b82f6' }] }}
          className="w-full"
        />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2 text-sm">Promo Code Usage</h2>
          <ul className="text-sm space-y-1">
            {Object.entries(data.promoUsage || {}).map(([code, count]) => (
              <li key={code}>{code}: {count}</li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-4 rounded shadow text-sm space-y-1">
          <p>Group Quests: {data.groupQuests}</p>
          <p>Avg Group Size: {data.avgGroupSize.toFixed(1)}</p>
          {data.topPromo && data.topPromo[0] && (
            <p>Top Promo: {data.topPromo[0]} ({data.topPromo[1]})</p>
          )}
        </div>
      </div>
    </div>
  );
}
