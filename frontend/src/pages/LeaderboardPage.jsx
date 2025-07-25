import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { getCachedLeaderboard } from '../lib/api';


export default function LeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [field, setField] = useState('xp');
  const [timeRange, setTimeRange] = useState('all');
  const [region, setRegion] = useState('global');
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState('');
  const userCity = '';

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const city = region === 'local' ? userCity || undefined : undefined;
        const period = timeRange === 'all' ? 'allTime' : 'weekly';
        const data = await getCachedLeaderboard({ type: field, period, city });
        setEntries(data.entries || []);
        setUpdated(data.lastUpdated || '');
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
          {updated && (
            <p className="text-xs text-gray-500">Updated {dayjs(updated).fromNow()}</p>
          )}
          {entries.map((e, i) => (
            <div key={e.uid || e.id} className="flex justify-between border p-2 rounded">
              <div>
                #{i + 1} – {e.displayName || 'Anon'}
                {e.city && ` (${e.city})`}
              </div>
              <div>
                {field === 'xp'
                  ? `${e.xp} XP`
                  : field === 'streakCount'
                  ? `${e.streakCount} days`
                  : `${e.groupCompletions || 0}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
