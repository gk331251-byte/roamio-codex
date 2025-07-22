// src/components/Profile.jsx
import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';

const Profile = () => {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        setUserId(uid);

        try {
          const ref = collection(db, 'user_quests', uid, 'quests');
          const snapshot = await getDocs(ref);

          console.log("📦 Snapshot size:", snapshot.size);
          console.log("🧾 Raw docs:", snapshot.docs.map(doc => doc.data()));

          if (snapshot.empty) {
            console.warn("📭 No quests found for user:", uid);
          }

          const questsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));

          setQuests(questsData);
          console.log("✅ FINAL QUESTS:", questsData);
        } catch (error) {
          console.error("🔥 Firestore error:", error.message);
        } finally {
          setLoading(false);
        }

      } else {
        console.warn("❌ Not logged in");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fcf8] px-6 py-10 text-[#0e1b0e] font-sans">
      <h1 className="text-3xl font-bold mb-6">Your Postcard Collection</h1>

      {loading ? (
        <p className="text-[#4e974e]">Loading your adventures...</p>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">
            Debug: quests.length = {quests.length}
          </p>

          {quests.length === 0 ? (
            <div className="text-center mt-12">
              <p className="text-xl font-medium">🧭 You haven’t set out on any quests yet.</p>
              <p className="text-[#4e974e] mt-2">Time to explore and create your first memory!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {quests.map((quest) => (
                <motion.div
                  key={quest.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white shadow-md rounded-xl overflow-hidden border border-[#e6f4ef] hover:shadow-lg"
                >
                  <div
                    className="h-40 bg-cover bg-center"
                    style={{ backgroundImage: `url(${quest.imageUrl || 'https://placehold.co/600x300'}
                    )` }}
                  />
                  <div className="p-4">
                    <h2 className="text-lg font-bold font-serif mb-1">{quest.title || 'Untitled Quest'}</h2>
                    <p className="text-sm text-[#4e974e]">
                      🗺️ {quest.city || 'Unknown'} — {quest.mood || 'Mysterious'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Difficulty: {quest.difficulty || 'Easy'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Profile;
