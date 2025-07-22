// src/components/QuestForm/index.jsx

import { useState } from "react";
import GoogleMapReact from "google-map-react";
import { generateQuest } from "../../lib/api";
import QuestForm from "./QuestForm"; // assuming you have this split off

export default function App() {
  const [questResult, setQuestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const handleGenerateQuest = async ({ city, mood, timeLimit, useGPS }) => {
    if (!mood || (!city && !useGPS)) {
      setErrorMessage("Please enter a city or use GPS, and select a mood.");
      return;
    }

    setErrorMessage("");
    setLoading(true);
    setQuestResult(null);

    try {
      const data = await generateQuest({ city, mood, useGPS, timeLimit });

      if (!data.quest || !Array.isArray(data.quest.places) || data.quest.places.length === 0) {
        setErrorMessage("No places returned from backend.");
        return;
      }

      setQuestResult(data.quest);
    } catch (err) {
      console.error("Fetch error:", err);
      setErrorMessage("Error fetching quest.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white flex flex-col items-center justify-start p-4">
      <header className="w-full max-w-4xl flex justify-between items-center p-4">
        <h1 className="text-3xl font-bold">Real-World Quest Generator</h1>
      </header>

      <main className="w-full max-w-4xl flex flex-col lg:flex-row gap-4">
        <section className="w-full lg:w-1/3 bg-gray-900 rounded-xl shadow-lg p-6 space-y-4">
          {errorMessage && <div className="bg-red-500 text-white p-2 rounded">{errorMessage}</div>}
          <QuestForm onSubmit={handleGenerateQuest} />
        </section>

        {questResult && (
          <section className="w-full lg:w-2/3 space-y-4">
            <div className="bg-gray-900 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Quest Details</h2>
              <p className="mb-2">{questResult.questText}</p>
              <p className="mb-2">
                Difficulty: <span className="font-bold">{questResult.difficulty}</span>
              </p>
              <p className="mb-4">Estimated Time: {questResult.timeEstimate}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questResult.places.map((location, index) => (
                  <div key={index} className="p-3 bg-gray-700 rounded">
                    <p className="font-semibold">{location.name}</p>
                    <p className="text-sm">Type: {location.type}</p>
                  </div>
                ))}
              </div>
            </div>

            {questResult.coordinates && (
              <div className="bg-gray-900 rounded-xl shadow-lg" style={{ height: "300px", width: "100%" }}>
                <GoogleMapReact
                  bootstrapURLKeys={{ key: GOOGLE_MAPS_API_KEY }}
                  defaultCenter={questResult.coordinates}
                  defaultZoom={11}
                />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
