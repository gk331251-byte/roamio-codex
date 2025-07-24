import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { fetchWeeklyTagConfig } from '../lib/xpBoostHelpers';
import { submitUGC } from '../lib/api';
import { toast } from '../lib/toast';

export default function UGCSubmitForm() {
  const [tag, setTag] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [multiplier, setMultiplier] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const cfg = await fetchWeeklyTagConfig();
      if (cfg.activeTag) setTag(cfg.activeTag);
      if (cfg.xpMultiplier) setMultiplier(cfg.xpMultiplier);
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return toast('Login required');
    setLoading(true);
    try {
      await submitUGC({ uid: user.uid, tag, platform });
      toast(`Great! Your next quest will earn ${multiplier}x XP!`);
    } catch (err) {
      console.error('ugc submit failed', err);
      toast('Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fcf8] p-6 text-[#0e1b0e]">
      <h1 className="text-xl font-bold mb-4">Share Your Quest</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm mb-1">Platform</label>
          <select
            className="border rounded p-2 w-full"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option>Instagram</option>
            <option>Twitter</option>
            <option>TikTok</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Tag</label>
          <input
            className="border rounded p-2 w-full"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
        </div>
        <button
          className="w-full bg-blue-600 text-white py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
