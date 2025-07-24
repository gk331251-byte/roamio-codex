import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { submitFeaturedQuest } from '../lib/api';
import { toast } from '../lib/toast';

export default function CreatorSubmitQuest() {
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState('');
  const [questText, setQuestText] = useState('');
  const [locations, setLocations] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return toast('Login required');
    setLoading(true);
    try {
      await submitFeaturedQuest({
        uid: user.uid,
        title,
        mood,
        questText,
        locationList: locations.split(',').map((s) => s.trim()).filter(Boolean),
        tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
      });
      toast('Quest submitted for review');
      navigate('/creator-dashboard');
    } catch (err) {
      console.error('submit failed', err);
      toast('Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Submit Featured Quest</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input className="border rounded w-full p-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Mood</label>
          <input className="border rounded w-full p-2" value={mood} onChange={(e) => setMood(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Quest Text</label>
          <textarea className="border rounded w-full p-2" value={questText} onChange={(e) => setQuestText(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Places (comma-separated)</label>
          <input className="border rounded w-full p-2" value={locations} onChange={(e) => setLocations(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Tags (comma-separated)</label>
          <input className="border rounded w-full p-2" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded w-full" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
