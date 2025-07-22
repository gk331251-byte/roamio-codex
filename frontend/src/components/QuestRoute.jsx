// src/components/QuestRoute.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_KEY_HERE";

const QuestRoute = () => {
  const { city, mood } = useParams();
  const [quest, setQuest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuest = async () => {
      try {
        const ref = doc(db, "quests", `${city}_${mood}`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setQuest(snap.data());
        }
      } catch (err) {
        console.error("Failed to fetch quest:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuest();
  }, [city, mood]);

  if (loading) {
    return (
      <div className="p-6 animate-pulse text-[#0c1c17]">
        Loading quest route...
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="p-6 text-red-600">Quest not found for {city}, {mood}.</div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fcfa] font-sans px-4 py-6">
      <header className="flex justify-between items-center border-b border-[#e6f4ef] px-6 py-3">
        <h2 className="text-lg font-bold text-[#0c1c17]">Questify</h2>
        <nav className="flex gap-6 text-sm font-medium text-[#0c1c17]">
          <a href="/home">Home</a>
          <a href="/profile">Profile</a>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto mt-6">
        <h1 className="text-3xl font-bold text-[#0c1c17] mb-4">{quest.title || "Your Adventure Awaits"}</h1>

        <div
          className="aspect-video rounded-xl bg-cover bg-center mb-4"
          style={{
            backgroundImage: `url(https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(
              city
            )}&zoom=13&size=600x300&maptype=roadmap&key=${GOOGLE_MAPS_API_KEY})`,
          }}
        ></div>

        <p className="text-[#0c1c17] text-base mb-4">
          {quest.questText || "A special journey has been crafted just for you."}
        </p>

        <h2 className="text-xl font-bold text-[#0c1c17] mb-3">Places</h2>
        <div className="space-y-3">
          {quest.places?.map((place, index) => (
            <div
              key={index}
              className="flex items-center gap-4 bg-[#f8fcfa] px-4 py-2 rounded-lg border border-[#e6f4ef]"
            >
              <div className="w-12 h-12 bg-[#e6f4ef] rounded-lg flex items-center justify-center">
                <span className="text-xl">📍</span>
              </div>
              <div>
                <p className="font-medium">{place.name}</p>
                <p className="text-sm text-[#46a080]">{place.type || "Point of Interest"}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button className="flex-1 bg-[#019863] text-white py-2 rounded-full font-bold">
            Start Quest
          </button>
          <button className="flex-1 bg-[#e6f4ef] text-[#0c1c17] py-2 rounded-full font-bold">
            Share Quest
          </button>
        </div>

        <div className="mt-3">
          <button className="w-full bg-[#e6f4ef] text-[#0c1c17] py-2 rounded-full font-bold">
            Save for Later
          </button>
        </div>
      </main>
    </div>
  );
};

export default QuestRoute;
