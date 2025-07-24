import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { createCheckoutSession } from '../lib/api';

const features = [
  'Unlimited quest generation',
  'Custom quest builder',
  'Group quest hosting',
  'Full postcard history',
];

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  const handleCheckout = async () => {
    const user = auth.currentUser;
    if (!user) return alert('Login required');
    setLoading(true);
    try {
      const res = await createCheckoutSession(user.uid, user.email);
      window.location.href = res.url;
    } catch (err) {
      console.error('checkout failed', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fcf8] px-6 py-10 text-center space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#0e1b0e] mb-2">Quest+ Membership</h1>
        <p className="text-[#0e1b0e] mb-4">Unlock Roamio premium features for just $5/month.</p>
        <ul className="text-left mb-4 list-disc list-inside space-y-1">
          {features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="px-5 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Redirecting...' : 'Upgrade Now'}
        </button>
      </div>
    </div>
  );
}
