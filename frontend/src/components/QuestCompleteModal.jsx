import React from 'react';

import XPProgressBar from './XPProgressBar';

export default function QuestCompleteModal({ open, xpEarned, newTotal, level, badge, imageUrl, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-80 text-center">
        <h2 className="text-xl font-bold mb-2">Quest Complete!</h2>
        {imageUrl && <img src={imageUrl} alt="Postcard" className="w-full mb-3 rounded" />}
        <p className="text-sm mb-1">+{xpEarned} XP</p>
        <XPProgressBar xp={newTotal} next={(level + 1) * 1000} />
        <p className="text-xs mt-1">{newTotal} / {(level + 1) * 1000} XP (Level {level})</p>
        {badge && <p className="text-green-700 font-medium">New Badge: {badge}</p>}
        <button onClick={onClose} className="mt-3 px-4 py-1 rounded bg-blue-600 text-white">Close</button>
      </div>
    </div>
  );
}
