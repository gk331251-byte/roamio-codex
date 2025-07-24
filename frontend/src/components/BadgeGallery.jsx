import React from 'react';
import { BADGE_CATALOG } from '../lib/badges';

export default function BadgeGallery({ unlocked = [] }) {
  const unlockedSet = new Set(unlocked);
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
      {Object.values(BADGE_CATALOG).map((b) => {
        const isUnlocked = unlockedSet.has(b.id);
        return (
          <div
            key={b.id}
            className={`p-3 rounded text-center border ${
              isUnlocked ? 'bg-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            <div className="text-3xl mb-1">{b.icon}</div>
            <div className="text-sm font-medium">{b.name}</div>
          </div>
        );
      })}
    </div>
  );
}
