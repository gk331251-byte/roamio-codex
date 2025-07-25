import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../lib/api';


export default function LeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [field, setField] = useState('xp');
  const [timeRange, setTimeRange] = useState('all');
  const [region, setRegion] = useState('global');
  const [loading, setLoading] = useState(true);
  const userCity = '';

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const city = region === 'local' ? userCity || undefined : undefined;
        const data = await getLeaderboard({ field, timeframe: timeRange, city });
        setEntries(data.users || []);
      } catch (err) {
        console.error('lb load', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [field, timeRange, region, userCity]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Leaderboards</h1>
      <div className="flex gap-3">
        <select
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="xp">XP</option>
          <option value="streakCount">Streaks</option>
        </select>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="all">All-time</option>
          <option value="week">This Week</option>
        </select>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="global">Global</option>
          <option value="local">My City</option>
        </select>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={e.id} className="flex justify-between border p-2 rounded">
              <div>
                #{i + 1} – {e.nickname || e.displayName || 'Anon'}
                {e.city && ` (${e.city})`}
              </div>
              <div>
                {field === 'xp' ? `${e.xp} XP` : `${e.streakCount} days`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
