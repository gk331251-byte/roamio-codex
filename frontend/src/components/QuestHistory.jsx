// src/components/QuestHistory.jsx
import React, { useEffect, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserQuests, replayQuest, remixQuest } from '../lib/api';

const QuestHistory = () => {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlight, setHighlight] = useState(null);
  const handleReplay = async (q) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await replayQuest(q.questId || q.id, user.uid);
    } catch (e) {
      console.error('replay failed', e);
    }
  };

  const handleRemix = async (q) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const data = q.questData || q;
      await remixQuest(data.city || '', data.mood || '', data.tags || [], user.uid);
    } catch (e) {
      console.error('remix failed', e);
    }
  };

  const loadQuests = async (uid, highlightNew = false) => {
    setLoading(true);
    setError('');
    const delays = [500, 1000, 2000];
    for (let i = 0; i < delays.length; i++) {
      try {
        const data = await getUserQuests(uid);
        setQuests(data.quests || []);
        if (highlightNew && data.quests && data.quests.length > 0) {
          setHighlight(data.quests[0].id || null);
          setTimeout(() => setHighlight(null), 2000);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setLoading(false);
        return;
      } catch (err) {
        console.error('Failed to load quests', err);
        if (i === delays.length - 1) {
          setError('Failed to load quests');
        } else {
          await new Promise((res) => setTimeout(res, delays[i]));
        }
      }
    }
    setLoading(false);

  };

  useEffect(() => {
    let currentUser = null;
    const unsub = onAuthStateChanged(auth, (u) => {
      currentUser = u;
      if (u) {
        loadQuests(u.uid);
      } else {
        setQuests([]);
        setLoading(false);
      }
    });
    const refresh = () => {
      if (currentUser) loadQuests(currentUser.uid, true);

    };
    window.addEventListener('quest-saved', refresh);
    return () => {
      unsub();
      window.removeEventListener('quest-saved', refresh);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading your adventures...
      </div>
    );
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (quests.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No quests yet — get exploring!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fcf8] text-[#0e1b0e] font-sans">
      <section className="px-6 py-8">
        <h1 className="text-[32px] font-bold leading-tight mb-1">Quest History</h1>
        <p className="text-[#4e974e] text-sm mb-6">Relive your past adventures and discover new paths.</p>

        <div className="space-y-6">
          {quests.map((quest, index) => (
            <Motion.div
              key={quest.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`flex flex-col lg:flex-row gap-4 items-stretch rounded-xl bg-white p-4 shadow-md ${
                highlight === (quest.id || null) ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              <div className="flex-[2] flex flex-col justify-between gap-2">
                <div>
                  <h2 className="font-bold text-lg">{quest.questData?.title || quest.title || 'Quest'}</h2>
                  <p className="text-sm text-[#4e974e]">
                    Mood: {quest.questData?.difficulty || quest.difficulty || 'easy'} | Stops: {quest.questData?.places?.length || 0}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReplay(quest)}
                    className="flex items-center gap-2 bg-[#e7f3e7] text-[#0e1b0e] px-3 py-1 rounded-xl w-fit text-sm font-medium"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 256 256" fill="currentColor">
                      <path d="M224 128a96 96 0 01-94.7 96H128a95.4 95.4 0 01-65.9-26.2 8 8 0 0111-11.6A80 80 0 1071.4 71.4L44.6 96H72a8 8 0 010 16H24a8 8 0 01-8-8V56a8 8 0 0116 0v29.8L60.2 60A96 96 0 01224 128z" />
                    </svg>
                    Replay
                  </button>
                  <button
                    onClick={() => handleRemix(quest)}
                    className="flex items-center gap-2 bg-[#e7f3e7] text-[#0e1b0e] px-3 py-1 rounded-xl w-fit text-sm font-medium"
                  >
                    Remix
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-cover bg-center aspect-video rounded-xl" style={{ backgroundImage: `url(${quest.postcardUrl || quest.imageUrl || 'https://placehold.co/600x300'})` }} />
            </Motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default QuestHistory;
