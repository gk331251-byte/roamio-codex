import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { validatePremium } from '../lib/api';

export default function PremiumGuard({ children }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return setAllowed(false);
      try {
        const res = await validatePremium();
        setAllowed(!!res.isPremium);
      } catch (err) {
        console.error('premium check failed', err);
        setAllowed(false);
      }
    });
    return () => unsub();
  }, []);

  if (allowed === null) {
    return <p className="text-center py-10">Checking subscription...</p>;
  }
  if (!allowed) {
    return (
      <div className="text-center space-y-2 py-10">
        <p>Quest+ membership required.</p>
        <a href="/pricing" className="text-blue-600 underline">Upgrade to Quest+</a>
      </div>
    );
  }
  return <>{children}</>;
}
