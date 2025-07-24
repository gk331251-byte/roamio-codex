import React from 'react';

export default function PostcardCard({ post }) {
  const {
    imageUrl,
    displayName,
    city,
    badgesUnlocked = [],
    xpEarned,
    mood,
    questTitle,
    timestamp,
  } = post;
  return (
    <div className="bg-white rounded shadow overflow-hidden text-sm">
      <img src={imageUrl || 'https://placehold.co/400'} alt="postcard" className="w-full h-40 object-cover" />
      <div className="p-3 space-y-1">
        <h3 className="font-semibold">{questTitle || 'Quest'}</h3>
        <p className="text-gray-600">
          {displayName && <span>By {displayName} </span>}
          {city && <span className="text-xs">in {city}</span>}
        </p>
        <p className="text-xs text-gray-500">{mood}</p>
        <p className="text-xs text-gray-500">{new Date(timestamp).toLocaleString()}</p>
        <p className="text-xs">XP: {xpEarned}</p>
        {badgesUnlocked.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {badgesUnlocked.map((b) => (
              <span key={b} className="text-xs bg-yellow-100 px-1 rounded">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
