import React from 'react';

export default function XPProgressBar({ xp = 0, next = 100 }) {
  const pct = Math.min(100, (xp / next) * 100);
  return (
    <div className="w-full bg-gray-200 rounded h-2 mt-2">
      <div
        className="bg-purple-600 h-2 rounded"
        style={{ width: `${pct}%` }}
        title={`${xp} XP`}
      />
    </div>
  );
}
