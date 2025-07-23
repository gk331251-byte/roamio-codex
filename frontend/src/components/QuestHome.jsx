import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateQuest } from "../lib/api.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import PlaceItem from "./PlaceItem";
import RouteMap from "./RouteMap";

const moodOptions = [
  "adventurous",
  "chill",
  "romantic",
  "mystery",
  "cozy",
  "historic",
  "spiritual",
  "creative",
  "outdoorsy",
  "quirky"
];

const QuestHome = () => {
  const [city, setCity] = useState("");
  const [mood, setMood] = useState([]);
  const [timeLimit, setTimeLimit] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questResult, setQuestResult] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error", err);
      setError("Failed to sign in.");
    }
  };

  const handleGenerate = async () => {
    setError("");
    setQuestResult(null);

    if (!user) {
      setError("You must be signed in to generate a quest.");
      return;
    }

    if (!city || !Array.isArray(mood) || mood.length === 0 || isNaN(timeLimit)) {
      setError("Please fill out all fields correctly.");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const result = await generateQuest(city, mood, Number(timeLimit), token);
      setQuestResult(result);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate quest.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMood = (selectedMood) => {
    if (mood.includes(selectedMood)) {
      setMood(mood.filter((m) => m !== selectedMood));
    } else if (mood.length < 5) {
      setMood([...mood, selectedMood]);
    } else {
      setError("You can select up to 5 moods only.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fcf8] px-6 py-8 text-[#0e1b0e] font-sans">
      <h1 className="text-[32px] font-bold mb-6 text-center">Create a New Quest</h1>

      {!user ? (
        <div className="text-center space-y-4">
          <p className="text-md">Please sign in to start your quest journey.</p>
          <button
            onClick={handleLogin}
            className="bg-[#019863] text-white px-6 py-2 rounded-lg hover:bg-[#017e53]"
          >
            Sign In with Google
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Enter city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2 border border-[#d0e7d0] rounded-lg focus:outline-none"
            />

            <div className="flex flex-wrap gap-2">
              {moodOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleMood(option)}
                  className={`px-3 py-1 rounded-full border text-sm transition ${
                    mood.includes(option)
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-[#0e1b0e] border-[#d0e7d0]"
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>

            <input
              type="number"
              value={String(timeLimit ?? "")}
              onChange={(e) => setTimeLimit(Number(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-[#d0e7d0] rounded-lg focus:outline-none"
            />

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-[#019863] text-white py-2 rounded-lg font-bold hover:bg-[#017e53] transition"
            >
              {loading ? "Generating..." : "Generate Quest"}
            </button>

            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>

          {questResult?.quest?.places && (
            <div className="mt-8 p-4 border border-[#d0e7d0] rounded-lg bg-white shadow-md max-w-2xl mx-auto">
              <h2 className="text-xl font-bold mb-2">Your Quest</h2>
              <p className="text-sm mb-4">
                {questResult.quest?.questText || "No quest description available."}
              </p>

              <h3 className="text-lg font-semibold mb-2">Quest Stops:</h3>
              <ul className="list-disc list-inside text-sm text-left mb-4">
                {questResult.quest.places.map((place, index) => (
                  <PlaceItem key={index} place={place} />
                ))}
              </ul>

              <RouteMap
                places={questResult.quest.places}
                route={questResult.quest.route}
              />

              <button
                onClick={() => navigate('/live', { state: { quest: questResult.quest } })}
                className="mt-4 w-full bg-[#14b714] text-white py-2 rounded-lg font-bold hover:bg-[#0fa50f] transition"
              >
                Start Quest
              </button>

            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuestHome;
