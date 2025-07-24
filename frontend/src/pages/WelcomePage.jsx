import React, { useState } from 'react';
import GoogleMapReact from 'google-map-react';
import LoginModal from '../components/LoginModal';

const demoQuests = [
  { title: "\uD83C\uDF55 Pizza Crawl", lat: 40.7201, lng: -73.9993 },
  { title: "\uD83D\uDDBC\uFE0F Hidden Art Hunt", lat: 40.7153, lng: -74.0031 },
  { title: "\uD83C\uDF3F Park Explorer", lat: 40.7128, lng: -74.006 },
];

const moods = ['Adventure', 'Romantic', 'Weird'];

export default function WelcomePage() {
  const [showModal, setShowModal] = useState(false);
  const [active, setActive] = useState([]);

  const handleInteract = () => setShowModal(true);

  const toggleMood = (m) => {
    handleInteract();
    setActive((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  return (
    <div className="relative w-screen h-screen">
      {showModal && <LoginModal />}
      <div className="absolute inset-0">
        <GoogleMapReact
          bootstrapURLKeys={{ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY }}
          defaultCenter={{ lat: 40.7153, lng: -74.0031 }}
          defaultZoom={13}
          yesIWantToUseGoogleMapApiInternals
        >
          {demoQuests.map((q, i) => (
            <div
              key={i}
              lat={q.lat}
              lng={q.lng}
              title={q.title}
              className="text-2xl cursor-pointer"
              onClick={handleInteract}
            >
              📍
            </div>
          ))}
        </GoogleMapReact>
      </div>
      <div className="absolute top-4 left-4 bg-white bg-opacity-70 rounded-full px-3 py-1 text-sm shadow">
        <span className="opacity-50">Streak: 0 days 🔒</span>
      </div>
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2">
        {moods.map((m) => (
          <button
            key={m}
            onClick={() => toggleMood(m)}
            className={`text-sm px-3 py-1 rounded-full backdrop-blur bg-white bg-opacity-70 ${active.includes(m) ? 'bg-[#019863] text-white' : ''}`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <button
          onClick={handleInteract}
          className="bg-[#019863] text-white px-6 py-3 rounded-full shadow-lg"
        >
          Feeling Lucky?
        </button>
      </div>
    </div>
  );
}
