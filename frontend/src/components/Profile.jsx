import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { deleteUser } from 'firebase/auth';
import { deleteDoc, doc, collection, getDocs } from 'firebase/firestore';
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
          const data = await validatePremium();
          setPremium(!!data.isPremium);
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

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete account permanently?')) return;
    const userObj = auth.currentUser;
    if (!userObj) return;
    try {
      // delete user document
      await deleteDoc(doc(db, 'users', userObj.uid));
      const qSnap = await getDocs(collection(db, 'user_quests', userObj.uid, 'quests'));
      const batchDeletes = qSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(batchDeletes);
      await deleteUser(userObj);
      window.location.href = '/';
    } catch (err) {
      console.error('account delete failed', err);
      alert('Failed to delete account');
    }
  };

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
      {premium ? (
        <PostcardGallery />
      ) : (
        <div className="text-center space-y-2">
          <p className="text-sm">Quest+ membership required to view your full postcard history.</p>
          <a href="/pricing" className="text-blue-600 underline">Upgrade to Quest+</a>
        </div>
      )}
      <div className="mt-8">
        <button
          onClick={handleDeleteAccount}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Delete My Account
        </button>
      </div>
    </div>
  );
};

export default Profile;
