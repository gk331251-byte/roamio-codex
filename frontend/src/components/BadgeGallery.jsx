import React from 'react';
import dayjs from 'dayjs';
import { BADGE_CATALOG } from '../lib/badges';

export default function BadgeGallery({ badges = [] }) {
  const unlockedIds = new Set(
    badges.map((b) => (typeof b === 'string' ? b : b.id))
  );
  const metaMap = {};
  badges.forEach((b) => {
    if (typeof b === 'object' && b.id) metaMap[b.id] = b;
  });
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
      {Object.values(BADGE_CATALOG).map((b) => {
        const isUnlocked = unlockedIds.has(b.id);
        const meta = metaMap[b.id];
        const title = isUnlocked && meta?.earnedAt
          ? `Earned ${dayjs(meta.earnedAt).format('MMM D, YYYY')}`
          : b.description;
        return (
          <div
            key={b.id}
            className={`p-3 rounded text-center border ${
              isUnlocked ? 'bg-white' : 'bg-gray-100 text-gray-400'
            }`}
            title={title}
          >
            <div className="text-3xl mb-1">{b.icon}</div>
            <div className="text-sm font-medium">{b.name}</div>
          </div>
        );
      })}
    </div>
  );
}
