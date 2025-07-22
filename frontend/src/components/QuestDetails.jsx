import React from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import dayjs from "dayjs";
import { db } from "../firebase";
import RouteMap from "./RouteMap";


const QuestDetails = () => {
  const { city, mood } = useParams();
  const [questData, setQuestData] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);
  const [error, setError] = React.useState(null);

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

  const getImagePrompt = (city, difficulty) => {
    switch (difficulty) {
      case "Easy":
        return `Vintage postcard art of ${city}, relaxing sunny afternoon, bright pastel colors`;
      case "Hard":
        return `Moody, stylized postcard from ${city}, distant skyline and rugged terrain, 1930s palette`;
      case "Extreme":
        return `Gritty adventure postcard from ${city}, survivalist tone, wild terrain, high contrast`;
      default:
        return `Vintage postcard of ${city} adventure route, mix of urban and nature, travel journal style`;
    }
  };

  const handleComplete = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user || !questData) return;
  
      setSaving(true);
  
      const difficulty = questData.difficulty || "Medium";
      const prompt = getImagePrompt(city, difficulty);
      const questId = `${city}_${mood}`;
      const userQuestRef = doc(db, "user_quests", user.uid, "quests", questId);
  
      // Step 1: Call backend to generate postcard image
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
  
      // Step 2: Save quest to Firestore
      await setDoc(userQuestRef, {
        city,
        mood,
        title: questData.title,
        questText: questData.questText,
        locationList: questData.locationList || [],
        difficulty,
        imagePrompt: prompt,
        imageUrl,
        completed: true,
        completedAt: new Date().toISOString(),
      });
  
      setCompleted(true);
      console.log("✅ Quest completed and saved to Firestore with image.");
    } catch (err) {
      console.error("🔥 Error completing quest:", err);
      setError("Failed to complete quest.");
    } finally {
      setSaving(false);
    }
  };
  
  {questData.locationList && (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-2">Your Route</h2>
      <RouteMap places={questData.locationList} />
    </div>
  )}

  console.log("📍 questData.locationList:", questData?.locationList);

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  if (!questData) {
    return <div className="p-8">Loading quest...</div>;
  }


  return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-center">
      <motion.div
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
            <RouteMap places={questData.locationList} />
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
      </motion.div>
    </div>
  );
  
};

export default QuestDetails;
