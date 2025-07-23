import React from "react";
import { useParams } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import { completeQuest, uploadPostcard, getDirections } from "../lib/api";
import RouteMap from "./RouteMap";


const QuestDetails = () => {
  const { city, mood } = useParams();
  const [questData, setQuestData] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [route, setRoute] = React.useState(null);

  React.useEffect(() => {
    const fetchQuest = async () => {
      const questRef = doc(db, "quests", `${city}_${mood}`);
      const snapshot = await getDoc(questRef);
      if (snapshot.exists()) {
        setQuestData(snapshot.data());
      } else {
        setError("Quest not found.");
      }
    };

    fetchQuest();
  }, [city, mood]);

  React.useEffect(() => {
    const fetchDirections = async () => {
      try {
        const data = await getDirections(questData.locationList);
        setRoute(data);
      } catch (err) {
        console.error("Failed to fetch directions", err);
      }
    };
    if (questData?.locationList) {
      fetchDirections();
    }
  }, [questData?.locationList]);


  const handleComplete = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user || !questData) return;
  
      setSaving(true);
  
      const difficulty = questData.difficulty || "Medium";
      const questId = `${city}_${mood}`;
      const questDataPayload = {
        title: questData.title,
        places: questData.locationList || [],
        questText: questData.questText,
        difficulty,
      };

      // Save quest completion via backend
      await completeQuest(user.uid, questId, questDataPayload);

      // Generate postcard (skipped if backend keys invalid)
      const response = await fetch("https://your-backend.com/generate-postcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          questId,
          title: questData.title,
          city,
          mood,
          difficulty,
          locationList: questData.locationList || [],
        }),
      });

      const result = await response.json();
      const imageUrl = result.imageUrl || "/assets/postcard-placeholder.png";

      // Attach postcard URL via backend
      await uploadPostcard(user.uid, questId, imageUrl);

      setCompleted(true);
      window.dispatchEvent(new Event('quest-saved'));
      console.log("✅ Quest completed and postcard uploaded.");
    } catch (err) {
      console.error("🔥 Error completing quest:", err);
      setError("Failed to complete quest.");
    } finally {
      setSaving(false);
    }
  };
  

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  if (!questData) {
    return <div className="p-8">Loading quest...</div>;
  }


  return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-center">
      <Motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-stone-100 p-6 rounded-lg shadow-lg"
      >
        <h1 className="text-2xl font-bold mb-4">Your Quest</h1>
        <p className="text-stone-800 whitespace-pre-line mb-6">{questData.questText}</p>
  
        {questData.locationList && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Your Route</h2>
            <RouteMap places={questData.locationList} route={route} />
            {route && (
              <div className="text-sm text-left mt-2">
                <p className="font-semibold">Total time: {route.totalTime}</p>
                <ul className="list-disc list-inside">
                  {route.legs.map((leg, idx) => (
                    <li key={idx}>
                      {leg.start_address} → {leg.end_address} ({leg.duration.text})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
  
        <button
          onClick={handleComplete}
          disabled={saving || completed}
          className={`px-5 py-2 rounded-full font-semibold ${
            completed
              ? "bg-green-600 text-white cursor-default"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {completed ? "Quest Saved!" : saving ? "Saving..." : "Mark as Complete"}
        </button>
  
        {completed && (
          <div className="mt-4 text-green-600 font-medium">
            This quest is now in your profile.
          </div>
        )}
      </Motion.div>
    </div>
  );
  
};

export default QuestDetails;
