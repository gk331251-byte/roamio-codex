import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const defaultTips = [
  { key: 'visitedHint', selector: '#markVisitedBtn', text: 'Tap when you arrive at this stop.' },
  { key: 'xpHint', selector: '#xpBadge', text: 'Earn XP and unlock badges as you complete stops.' },
  { key: 'routeHint', selector: '#routeToggle', text: 'View your full quest route here.' },
  { key: 'groupHint', selector: '#inviteCTA', text: 'Want to do this with friends? Try group quests with Quest+.' },
];

export default function TooltipManager({ tips = defaultTips }) {
  const [current, setCurrent] = useState(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [shown, setShown] = useState({});

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        const flags = snap.data()?.onboarding?.tooltipsShown || {};
        setShown(flags);
        const next = tips.find((t) => !flags[t.key]);
        setCurrent(next || null);
      })
      .catch((err) => console.error('tooltip load', err));
  }, [tips]);

  useEffect(() => {
    if (!current) return;
    const el = document.querySelector(current.selector);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + rect.width / 2 });
  }, [current]);

  const updateFlags = async (flags) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { 'onboarding.tooltipsShown': flags });
    } catch (err) {
      console.error('update tooltip flags', err);
    }
  };

  const dismiss = async () => {
    if (!current) return;
    const newShown = { ...shown, [current.key]: true };
    setShown(newShown);
    await updateFlags(newShown);
    const next = tips.find((t) => !newShown[t.key]);
    setCurrent(next || null);
  };

  const skipAll = async () => {
    const all = tips.reduce((acc, t) => ({ ...acc, [t.key]: true }), {});
    setShown(all);
    await updateFlags(all);
    setCurrent(null);
  };

  if (!current) return null;

  return (
    <div className="fixed z-50" style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}>
      <div className="bg-white border rounded shadow-lg px-3 py-2 text-sm max-w-xs">
        <p>{current.text}</p>
        <div className="flex justify-end gap-3 mt-2 text-xs">
          <button onClick={dismiss} className="text-[#019863] underline">Got it</button>
          <button onClick={skipAll} className="text-gray-500 underline">Skip Tour</button>
        </div>
      </div>
    </div>
  );
}
