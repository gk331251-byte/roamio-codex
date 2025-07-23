import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { validatePremium, getUserQuests } from '../lib/api';
import PostcardGallery from './PostcardGallery';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [premium, setPremium] = useState(false);
  const [stats, setStats] = useState({ total: 0, mostCity: '', longest: 0 });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const data = await validatePremium(u.uid);
          setPremium(!!data.premium);
        } catch (err) {
          console.error('Failed to validate premium', err);
        }
        try {
          const q = await getUserQuests(u.uid);
          const quests = q.quests || [];
          const total = quests.length;
          const cityCount = {};
          let longest = 0;
          quests.forEach((quest) => {
            const city = quest.city || quest.questData?.city || 'Unknown';
            cityCount[city] = (cityCount[city] || 0) + 1;
            const stops = quest.questData?.places?.length || 0;
            if (stops > longest) longest = stops;
          });
          const mostCity = Object.entries(cityCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
          setStats({ total, mostCity, longest });
        } catch (err) {
          console.error('Failed to load quest stats', err);
        }
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fcf8] px-6 py-10 text-[#0e1b0e] font-sans">
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-3xl font-bold">{user?.displayName || 'Your'} Postcard Collection</h1>
        {premium && (
          <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full">Quest+ Member</span>
        )}
      </div>
      <div className="mb-8 text-sm space-y-1">
        <p>Total quests: {stats.total}</p>
        {stats.mostCity && <p>Most visited city: {stats.mostCity}</p>}
        {stats.longest > 0 && <p>Longest quest: {stats.longest} stops</p>}
      </div>
      <PostcardGallery />
    </div>
  );
};

export default Profile;
