import React from 'react';
import { BADGE_CATALOG } from '../lib/badges';

export default function BadgePopup({ badge, onClose }) {
  if (!badge) return null;
  const info = BADGE_CATALOG[badge] || {};
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded shadow-xl text-center max-w-xs">
        <p className="text-4xl mb-2">{info.icon || '🏅'}</p>
        <p className="font-bold mb-2">{info.name || badge}</p>
        <p className="text-sm mb-4">New badge unlocked!</p>
        <button onClick={onClose} className="px-4 py-1 rounded bg-green-600 text-white">Close</button>
      </div>
    </div>
  );
}
