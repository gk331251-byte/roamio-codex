import React from 'react';

export default function QuestCard({ quest }) {
  const { title, mood, imageUrl, tags = [] } = quest;
  return (
    <div className="flex gap-4 bg-white p-4 rounded shadow text-sm">
      <img src={imageUrl || 'https://placehold.co/200'} alt="" className="w-32 h-20 object-cover rounded" />
      <div className="flex-1">
        <h3 className="font-semibold">{title || 'Quest'}</h3>
        <p className="text-gray-600">{mood}</p>
        {tags.length > 0 && (
          <p className="text-xs text-gray-500">{tags.map((t) => `#${t}`).join(' ')}</p>
        )}
        <p className="text-xs mt-1">Creator Quest</p>
      </div>
    </div>
  );
}
