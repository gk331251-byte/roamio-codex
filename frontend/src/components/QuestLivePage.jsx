import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import LiveQuestMap from "./LiveQuestMap";
import { db } from "../firebase";
import { doc, updateDoc, arrayUnion, setDoc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function QuestLivePage() {
  const location = useLocation();
  const quest = location.state?.quest;

  const [userLocation, setUserLocation] = useState(null);
  const [stops, setStops] = useState([]);
  const [visitedStops, setVisitedStops] = useState([]);
  const [etaText, setEtaText] = useState("");

  // Watch user GPS
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Update stops list when we have user location or quest
  useEffect(() => {
    if (!quest || !userLocation) return;
    const questStops = quest.places.map((p) => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }));
    setStops([{ lat: userLocation.lat, lng: userLocation.lng }, ...questStops]);
  }, [quest, userLocation]);

  // Listen for progress in Firestore
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !quest) return;
    const ref = doc(db, "user_quests", user.uid, "active", "current");
    setDoc(ref, { visitedStops: [] }, { merge: true });
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setVisitedStops(snap.data().visitedStops || []);
      }
    });
    return () => unsub();
  }, [quest]);

  const currentStopIndex = visitedStops.length + 1;

  useEffect(() => {
    if (!userLocation || !stops[currentStopIndex]) return;

    const fetchETA = async () => {
      const origin = `${userLocation.lat},${userLocation.lng}`;
      const destination = `${stops[currentStopIndex].lat},${stops[currentStopIndex].lng}`;
      const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=walking&key=${key}`
        );
        const data = await res.json();
        const eta = data?.routes?.[0]?.legs?.[0]?.duration?.text;
        if (eta) setEtaText(eta);
      } catch (err) {
        console.error("Failed to fetch ETA:", err);
      }
    };

    fetchETA();
  }, [userLocation, currentStopIndex, stops]);

  const handleMarkVisited = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in!");

    const userQuestRef = doc(db, "user_quests", user.uid, "active", "current");
    await updateDoc(userQuestRef, {
      visitedStops: arrayUnion(visitedStops.length),
    });
  };

  if (!quest) {
    return <div className="p-6 text-center text-red-600">Quest data missing.</div>;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f8fcf8] overflow-x-hidden font-jakarta">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-[#e7f3e7] px-10 py-3">
          <div className="flex items-center gap-4 text-[#0e1b0e]">
            <div className="size-4">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_6_535)">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                    fill="currentColor"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_6_535">
                    <rect width="48" height="48" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-[#0e1b0e]">Roamio</h2>
          </div>
          <div className="flex flex-1 justify-end gap-8">
            <button className="flex items-center justify-center rounded-full bg-[#e7f3e7] px-2.5 h-10 text-sm font-bold text-[#0e1b0e]">
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                <path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z" />
              </svg>
            </button>
            <div
              className="size-10 rounded-full bg-cover bg-center"
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBvlYT0UmifC0sdn48j3i2L0npMp9fFIZ0MIs_3x2VkZsLMhmebrlOE9vQvYXEZFGO4JTWeMr3-f5J3zEcdB5VYUw4Ucwa1icl6MMeijW8gFqVXblbYLdVx5DcvNU7bwVmdqPH9cVGCPkwiPQzQU3wL7ADDs6ikwM801w40wp3L9WdeLRfssN1KMYmIGzmM1sMwABYkWteUaXBlOGIUaRsicE4IyNov_EjwN_vXaguicFEof0kT6NFBLqCc6DNxw3u9r6M0GWCVAwg')" }}
            />
          </div>
        </header>

        <main className="px-10 py-5 flex flex-col max-w-4xl mx-auto w-full">
          <div className="flex flex-wrap justify-between gap-3 p-4">
            <div className="flex flex-col gap-3 min-w-72">
              <p className="text-2xl font-bold text-[#0e1b0e]">
                {quest?.title || "Your Quest"}
              </p>
              <p className="text-sm text-[#4e974e]">
                {quest?.questText || "Embark on your adventure"}
              </p>
            </div>
            <button
              onClick={() => window.location.assign('/home')}
              className="h-8 px-4 rounded-full bg-[#e7f3e7] text-sm text-[#0e1b0e]"
            >
              Back to Home
            </button>
          </div>

          <div className="p-4">
            <div className="flex justify-between items-center">
              <p className="text-base font-medium text-[#0e1b0e]">Progress</p>
              <p className="text-sm text-[#0e1b0e]">
                {visitedStops.length}/{quest?.places?.length}
              </p>
            </div>
            <div className="w-full bg-[#d0e7d0] rounded">
              <div
                className="h-2 rounded bg-[#14b714]"
                style={{ width: `${(visitedStops.length / (quest?.places?.length || 1)) * 100}%` }}
              />
            </div>
          </div>

          <div className="px-4 py-3">
            <LiveQuestMap stops={stops} visitedIndex={currentStopIndex} userLocation={userLocation} />
          </div>

          <p className="text-sm text-[#4e974e] text-center px-4">
            {etaText ? `ETA to Next Stop: ${etaText}` : "Calculating ETA..."}
          </p>

          <div className="flex px-4 py-3">
            <button onClick={handleMarkVisited} className="flex-1 h-12 rounded-full bg-[#14b714] text-base font-bold text-[#f8fcf8]">
              Mark as Visited
            </button>
          </div>

          <div className="flex px-4 py-3">
            <button className="flex-1 h-12 rounded-full bg-[#14b714] text-base font-bold text-[#f8fcf8]">Complete Quest</button>
          </div>
        </main>
      </div>
    </div>
  );
}
