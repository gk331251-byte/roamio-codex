import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateQuest, createGroupQuest, getActiveQuest, getQuest, leaveGroup, validatePremium } from "../lib/api.js";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const _toQuestObj = (doc) => {
  if (!doc || !doc.fields) return doc;
  return Object.keys(doc.fields).reduce((acc, k) => {
    const v = doc.fields[k];
    if (v.stringValue !== undefined) acc[k] = v.stringValue;
    else if (v.integerValue !== undefined) acc[k] = parseInt(v.integerValue, 10);
    else if (v.doubleValue !== undefined) acc[k] = v.doubleValue;
    else if (v.arrayValue) acc[k] = (v.arrayValue.values || []).map(_toQuestObj);
    else if (v.mapValue) acc[k] = _toQuestObj({ fields: v.mapValue.fields || {} });
    return acc;
  }, {});
};
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
  const [premium, setPremium] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const res = await validatePremium(firebaseUser.uid);
          setPremium(!!res.premium);
        } catch (err) {
          console.error('premium check failed', err);
        }
      } else {
        setPremium(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await getActiveQuest(user.uid);
        if (data && data.questId && data.status !== 'completed') {
          const questDoc = await getQuest(data.questId).catch(() => null);
          let groupOk = true;
          if (data.groupId) {
            const snap = await getDoc(doc(db, 'groups', data.groupId));
            groupOk = snap.exists() && !snap.data().completed;
          }
          if (questDoc && groupOk) {
            const questObj = _toQuestObj(questDoc);
            if (Array.isArray(data.trimmedPlaces)) {
              questObj.places = data.trimmedPlaces;
            }
            setResumeData({
              quest: questObj,
              groupId: data.groupId,
              questId: data.questId,
              status: data.status,
              usedTimeLimit: data.usedTimeLimit,
            });
          } else {
            if (data.groupId) await leaveGroup(data.groupId, user.uid);
            setResumeData(null);
          }
        } else {
          setResumeData(null);
        }
      } catch (err) {
        console.error('Failed to load active quest', err);
      }
    })();
  }, [user]);

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
      const result = await generateQuest(city, mood, Number(timeLimit), token, user.uid);
      if (result.error) {
        console.error('❌ API error:', result);
        setError(result.error || 'Something went wrong generating your quest.');
        return;
      }
      setQuestResult(result);
    } catch (err) {
      console.error('❌ API error:', err);
      setError('Something went wrong generating your quest.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuest = async () => {
    if (!premium) {
      navigate('/quest-plus');
      return;
    }
    if (!questResult) return;
    const questId = `${city}_${mood.join('-')}`;
    try {
      const { groupId } = await createGroupQuest(
        user.uid,
        questId,
        user.displayName
      );
      navigate('/live', {
        state: { quest: questResult.quest, questId, groupId, timeLimit },
      });
    } catch (err) {
      console.error('Failed to create group', err);
      setError('Failed to start group quest');
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
      {resumeData && (
        <div className="mb-6 text-center">
          <button
            onClick={() =>
              navigate('/live', { state: { quest: resumeData.quest, questId: resumeData.questId, groupId: resumeData.groupId, timeLimit: resumeData.usedTimeLimit } })
            }
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Resume Quest
          </button>
        </div>
      )}

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
                onClick={handleStartQuest}
                disabled={!!resumeData}
                className={`mt-4 w-full py-2 rounded-lg font-bold transition text-white ${
                  resumeData ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#14b714] hover:bg-[#0fa50f]'
                }`}
              >
                Start Quest
              </button>
              {!premium && (
                <p className="text-center text-xs mt-1">
                  Quest+ required to start quests.{' '}
                  <a href="/quest-plus" className="text-blue-600 underline">Upgrade</a>
                </p>
              )}
              {resumeData && (
                <p className="text-center text-sm text-red-600 mt-1">
                  You have a quest in progress.
                </p>
              )}

            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuestHome;
