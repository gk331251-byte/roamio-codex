import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { createCommunity } from '../lib/api';

export default function CreateCommunity() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const navigate = useNavigate();
  const auth = getAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert('Login required');
    try {
      const data = await createCommunity({
        name,
        description,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        isPublic,
        ownerId: user.uid,
      });
      navigate(`/community/${data.communityId}`);
    } catch (err) {
      console.error('create failed', err);
      alert('Failed to create community');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4 text-[#0e1b0e]">
      <h1 className="text-2xl font-bold">Create Community</h1>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <input
          className="w-full border p-2 rounded"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          className="w-full border p-2 rounded"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Public
        </label>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Create
        </button>
      </form>
    </div>
  );
}
