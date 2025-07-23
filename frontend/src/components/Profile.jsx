import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { validatePremium } from '../lib/api';
import PostcardGallery from './PostcardGallery';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [premium, setPremium] = useState(false);

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
      <PostcardGallery />
    </div>
  );
};

export default Profile;
