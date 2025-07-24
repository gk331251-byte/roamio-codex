import React, { useEffect, useState } from 'react';
import PostcardCard from '../components/PostcardCard';
import { getUGCFeed } from '../lib/api';

export default function UGCFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getUGCFeed({ mood, city });
        setPosts(data.posts || []);
      } catch (err) {
        console.error('Failed to load feed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [mood, city]);

  if (loading) return <div className="p-6">Loading...</div>;
  return (
    <div className="min-h-screen bg-[#f8fcf8] p-6 text-[#0e1b0e]">
      <h1 className="text-2xl font-bold mb-4">UGC Feed</h1>
      <div className="mb-4 flex gap-4">
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">All Moods</option>
          <option>Nature</option>
          <option>History</option>
          <option>Foodie</option>
        </select>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="border rounded px-2 py-1"
        />
      </div>
      {posts.length === 0 && <p>No posts yet.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {posts.map((p) => (
          <PostcardCard key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}
