import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { deleteUser } from 'firebase/auth';
import { deleteDoc, doc, collection, getDocs } from 'firebase/firestore';
import {
  validatePremium,
  getUserQuests,
  listCustomQuests,
  publishCustomQuest,
  unpublishCustomQuest,
  getUserXP,
} from '../lib/api';
import XPProgressBar from './XPProgressBar';
import BadgeGallery from './BadgeGallery';
import {
  setShowRoamioWatermark,
  setPublicSharingOptIn,
  setShowUsernameOnShare,
  setShowCityOnShare,
} from '../lib/firebase';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [premium, setPremium] = useState(false);
  const [stats, setStats] = useState({ total: 0, mostCity: '', longest: 0 });
  const [customQuests, setCustomQuests] = useState([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [badges, setBadges] = useState([]);
  const [showWatermark, setShowWatermark] = useState(true);
  const [publicOptIn, setPublicOptIn] = useState(false);
  const [showName, setShowName] = useState(true);
  const [showCity, setShowCity] = useState(true);
  const nextThreshold = (level + 1) * 1000;

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
          const xpData = await getUserXP(u.uid);
          const xpVal = xpData.xp ?? xpData.totalXP ?? 0;
          setXp(xpVal);
          setLevel(xpData.level ?? Math.floor(xpVal / 1000));
          setBadges(xpData.badgesUnlocked || []);
          setShowWatermark(xpData.showRoamioWatermark !== false);
          setPublicOptIn(xpData.publicSharingOptIn === true);
          setShowName(xpData.showUsernameOnShare !== false);
          setShowCity(xpData.showCityOnShare !== false);
        } catch (err) {
          console.error('load xp error', err);
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
        try {
          const res = await listCustomQuests(u.uid, false);
          setCustomQuests(res.quests || []);
        } catch (err) {
          console.error('load custom quests', err);
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
      <p className="text-sm font-medium">Level {level} — {xp} XP</p>
      <XPProgressBar xp={xp} next={nextThreshold} />
      <div className="mb-8 text-sm space-y-1">
        <p>Total quests: {stats.total}</p>
        {stats.mostCity && <p>Most visited city: {stats.mostCity}</p>}
        {stats.longest > 0 && <p>Longest quest: {stats.longest} stops</p>}
      </div>
      <div className="mb-6">
        {premium ? (
          <a href="/gallery" className="text-blue-600 underline">View Postcard Gallery</a>
        ) : (
          <div className="text-center space-y-2">
            <p className="text-sm">Quest+ membership required to view your full postcard history.</p>
            <a href="/pricing" className="text-blue-600 underline">Upgrade to Quest+</a>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">Badges</h2>
        <BadgeGallery unlocked={badges} />
      </div>

      <div className="mb-8">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showWatermark}
            onChange={async (e) => {
              setShowWatermark(e.target.checked);
              if (user) await setShowRoamioWatermark(user.uid, e.target.checked);
            }}
          />
          Watermark shared postcards with "Made with Roamio"
        </label>
      </div>

      <div className="mb-8 space-y-2">
        <h2 className="text-xl font-bold mb-1">Sharing Preferences</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publicOptIn}
            onChange={async (e) => {
              setPublicOptIn(e.target.checked);
              if (user) await setPublicSharingOptIn(user.uid, e.target.checked);
            }}
          />
          Allow others to see my shared quests
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showName}
            onChange={async (e) => {
              setShowName(e.target.checked);
              if (user) await setShowUsernameOnShare(user.uid, e.target.checked);
            }}
          />
          Display my name on public shares
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showCity}
            onChange={async (e) => {
              setShowCity(e.target.checked);
              if (user) await setShowCityOnShare(user.uid, e.target.checked);
            }}
          />
          Display my city/location on public shares
        </label>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">My Custom Quests</h2>
        {customQuests.map((cq) => (
          <div key={cq.id} className="border p-2 mb-2 flex items-center justify-between">
            <div>
              <p className="font-medium">{cq.title}</p>
              <p className="text-xs">Status: {cq.status || (cq.public ? 'published' : 'draft')}</p>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => (window.location.href = `/custom/edit/${cq.id}`)}
                className="text-blue-600 underline text-sm"
              >
                Edit
              </button>
              {premium && (
                <button
                  onClick={async () => {
                    try {
                      if (cq.status === 'published' || cq.public) {
                        await unpublishCustomQuest(user.uid, cq.id);
                        setCustomQuests((prev) => prev.map((q) => (q.id === cq.id ? { ...q, status: 'draft', public: false } : q)));
                      } else {
                        await publishCustomQuest(user.uid, cq.id);
                        setCustomQuests((prev) => prev.map((q) => (q.id === cq.id ? { ...q, status: 'published', public: true } : q)));
                      }
                    } catch (err) {
                      console.error('toggle publish', err);
                    }
                  }}
                  className="text-sm underline"
                >
                  {cq.status === 'published' || cq.public ? 'Unpublish' : 'Publish'}
                </button>
              )}
            </div>
          </div>
        ))}
        {customQuests.length === 0 && <p className="text-sm">No custom quests yet</p>}
      </div>
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
