import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RouteMap from '../components/RouteMap';
import { getDirections } from '../lib/api';

export default function QuestDetailsPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const quest = state?.quest;
  const questId = state?.questId;
  const [route, setRoute] = useState(state?.route || null);
  useEffect(() => {
    if (!route && quest?.places?.length > 1) {
      getDirections(quest.places)
        .then((r) => setRoute(r.directions?.[0] || null))
        .catch((e) => console.error('directions failed', e));
    }
  }, [quest, route]);

  if (!quest) {
    return <div className="p-6">No quest data.</div>;
  }

  return (
    <div className="min-h-screen px-6 py-8 text-[#0e1b0e] font-sans">
      <h1 className="text-2xl font-bold mb-4 text-center">{quest.title || 'Your Quest'}</h1>
      <p className="whitespace-pre-line mb-4 text-center">{quest.questText}</p>
      <ul className="list-disc list-inside max-w-md mx-auto text-left mb-4">
        {quest.places?.map((p, i) => (
          <li key={i}>{p.name}</li>
        ))}
      </ul>
      <RouteMap places={quest.places} route={route} />
      <div className="text-center mt-6">
        <button
          onClick={() => navigate('/live', { state: { quest, questId } })}
          className="bg-[#019863] text-white py-2 px-6 rounded-full font-bold"
        >
          Start Quest
        </button>
      </div>
    </div>
  );
}

