import React, { useEffect, useState } from 'react';
import XPProgressBar from './XPProgressBar';
import { BADGE_CATALOG } from '../lib/badges';

export default function QuestCompleteSummary({
  open,
  xpEarned = 0,
  newTotal = 0,
  level = 1,
  badgesUnlocked = [],
  nextLevelXP = 100,
  imageUrl = '',
  onClose,
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    setCount(0);
    const step = Math.max(1, Math.ceil(xpEarned / 20));
    const id = setInterval(() => {
      setCount((c) => {
        if (c + step >= xpEarned) {
          clearInterval(id);
          return xpEarned;
        }
        return c + step;
      });
    }, 30);
    return () => clearInterval(id);
  }, [open, xpEarned]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white w-full max-w-md mx-4 p-6 rounded-lg text-center">
        <h2 className="text-xl font-bold mb-3">Quest Complete!</h2>
        {imageUrl && (
          <img src={imageUrl} alt="Postcard" className="w-full rounded mb-4" />
        )}
        <div className="text-2xl font-bold text-purple-700 mb-1">
          {count} XP
        </div>
        <XPProgressBar xp={newTotal} next={nextLevelXP} />
        <p className="text-sm mt-1">Level {level}</p>
        {badgesUnlocked.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {badgesUnlocked.map((key) => (
              <div
                key={key}
                className="px-2 py-1 bg-yellow-200 text-sm rounded animate-bounce"
              >
                {BADGE_CATALOG[key]?.name || key}
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 space-y-2">
          <button
            onClick={onClose}
            className="w-full py-2 bg-blue-600 text-white rounded"
          >
            Continue
          </button>
          <a
            href="/gallery"
            className="block text-sm text-blue-600 underline"
          >
            View Postcard Gallery
          </a>
        </div>
      </div>
    </div>
  );
}
