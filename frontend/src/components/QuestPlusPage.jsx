import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { createCheckoutSession } from '../lib/api';

const QuestPlusPage = () => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert('You must be logged in');
    setLoading(true);
    try {
      const data = await createCheckoutSession(user.uid, user.email);
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout failed', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fcf8] px-6 py-10 text-center space-y-4">
      <h1 className="text-3xl font-bold text-[#0e1b0e]">Quest+ Membership</h1>
      <p className="text-[#0e1b0e]">Unlock custom quests and other premium features.</p>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="px-5 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Redirecting...' : 'Upgrade Now'}
      </button>
    </div>
  );
};

export default QuestPlusPage;
