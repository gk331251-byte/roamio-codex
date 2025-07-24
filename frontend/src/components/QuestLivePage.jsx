/* eslint-disable */
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LiveQuestMap from "./LiveQuestMap";
import GroupMemberList from "./GroupMemberList";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { trackVisit, getUserQuests, completeQuest, joinGroup, trackStopVisit, completeGroupQuest, leaveGroup, reportQuest, updateActiveQuest } from "../lib/api";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { decode } from "@googlemaps/polyline-codec";
import XPToast from './XPToast';
import BadgePopup from './BadgePopup';
import TooltipManager from './TooltipManager';
import { toast } from '../lib/toast';
import QuestCompleteSummary from './QuestCompleteSummary';
import PostQuestShareModal from './PostQuestShareModal';


export default function QuestLivePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const quest = location.state?.quest;
  const questId = location.state?.questId;
  const groupId = location.state?.groupId || new URLSearchParams(location.search).get('groupId');
  const initialLimit = location.state?.timeLimit ? Number(location.state.timeLimit) : 90;
  const [userLocation, setUserLocation] = useState(null);
  const [stops, setStops] = useState([]);
  const timeLimit = initialLimit;
  const [visitedIndices, setVisitedIndices] = useState([]);
  const [groupData, setGroupData] = useState(null);
  const [activityMsg, setActivityMsg] = useState("");
  const [xpMsg, setXpMsg] = useState("");
  const [userXP, setUserXP] = useState(0);
  const [badges, setBadges] = useState({});
  const [newBadge, setNewBadge] = useState("");
  const [copied, setCopied] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState({});
  const [shareOpen, setShareOpen] = useState(false);
  const [skipSharePrompt, setSkipSharePromptState] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const [etaText, setEtaText] = useState("");
  const [etaError, setEtaError] = useState("");
  const [etaRefresh, setEtaRefresh] = useState(0);
  const [polylinePoints, setPolylinePoints] = useState([]);
  const [saving, setSaving] = useState(false);
  const [completeMsg, setCompleteMsg] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        const data = snap.data();
        if (data) {
          setUserXP(data.xp || 0);
          setBadges(data.badges || {});
          setSkipSharePromptState(!!data.skipSharePrompt);
          setShowWatermark(data.showRoamioWatermark !== false);
        }
      })
      .catch((e) => console.error('user fetch error', e));
  }, []);

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

  // Base stops from quest data
  useEffect(() => {
    if (!quest) return;
    const questStops = quest.places.map((p) => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng), name: p.name }));
    setStops(questStops);
  }, [quest]);

  // Optimize order and trim stops using current location
  useEffect(() => {
    if (!quest || !userLocation || !quest.places?.length) return;
    const fetchOptimized = async () => {
      const VISIT_SEC = 10 * 60; // assumed time spent at each stop
      const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const coords = quest.places.map((p) => `${p.lat},${p.lng}`);
      if (coords.length < 2) return;

      const origin = `${userLocation.lat},${userLocation.lng}`;
      const destination = coords[coords.length - 1];
      const waypointStr = coords.slice(0, -1).join('|');
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${waypointStr}&mode=walking&key=${key}`
        );
        const data = await res.json();
        const order = data?.routes?.[0]?.waypoint_order;
        let ordered = quest.places;
        if (Array.isArray(order) && order.length === coords.length - 1) {
          ordered = order.map((i) => quest.places[i]);
          ordered.push(quest.places[quest.places.length - 1]);
        }

        const legs = data?.routes?.[0]?.legs || [];
        const limitSec = timeLimit * 60;
        let total = 0;
        let keep = legs.length;
        for (let i = 0; i < legs.length; i++) {
          total += legs[i]?.duration?.value || 0;
          total += VISIT_SEC;
          if (total > limitSec) {
            keep = i + 1;
            break;
          }
        }
        if (keep === 0) {
          keep = 1;
          alert('Time limit too short for full quest; using first stop only.');
        }
        const trimmed = ordered.slice(0, keep);
        setStops(trimmed.map((p) => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng), name: p.name })));

        try {
          const auth = getAuth();
          const user = auth.currentUser;
          if (user) {
            await updateActiveQuest(user.uid, {
              optimizedOrder: order,
              trimmedPlaces: trimmed,
              usedTimeLimit: timeLimit,
            });
          }
        } catch (err) {
          console.error('failed to store optimized order', err);
        }

        const poly = data?.routes?.[0]?.overview_polyline?.points;
        if (poly) {
          const decoded = decode(poly).map(([lat, lng]) => ({ lat, lng }));
          setPolylinePoints(decoded);
        }
      } catch (err) {
        console.error('Failed to fetch optimized route', err);
      }
    };
    fetchOptimized();
  }, [quest, userLocation, timeLimit]);

  // Join group and listen for progress
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !groupId) return;
    joinGroup(user.uid, groupId, user.displayName).catch((e) => console.error('join failed', e));
    let prev = null;
    const unsub = onSnapshot(doc(db, 'group_quests', groupId), (snap) => {
      const data = snap.data();
      if (!data) return;
      setGroupData(data);
      if (data.progress && data.progress[user.uid]) {
        setVisitedIndices(data.progress[user.uid]);
      }
      if (prev && data.progress) {
        Object.keys(data.progress).forEach((uid) => {
          if (uid === user.uid) return;
          const before = (prev.progress?.[uid] || []).length;
          const after = (data.progress[uid] || []).length;
          if (after > before) {
            const member = data.members?.find((m) => m.userId === uid);
            setActivityMsg(`${member?.displayName || uid} visited stop ${after}`);
            setTimeout(() => setActivityMsg(''), 3000);
          }
        });
      }
      prev = data;
    });
    return () => unsub();
  }, [groupId]);

  // Load personal progress when not in group
  useEffect(() => {
    if (groupId) return;
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !groupId) return;
    joinGroup(user.uid, groupId, user.displayName).catch((e) => console.error('join failed', e));
    let prev = null;
    const unsub = onSnapshot(doc(db, 'group_quests', groupId), (snap) => {
      const data = snap.data();
      if (!data) return;
      setGroupData(data);
      if (data.progress && data.progress[user.uid]) {
        setVisitedIndices(data.progress[user.uid]);
      }
      if (prev && data.progress) {
        Object.keys(data.progress).forEach((uid) => {
          if (uid === user.uid) return;
          const before = (prev.progress?.[uid] || []).length;
          const after = (data.progress[uid] || []).length;
          if (after > before) {
            const member = data.members?.find((m) => m.userId === uid);
            setActivityMsg(`${member?.displayName || uid} visited stop ${after}`);
            setTimeout(() => setActivityMsg(''), 3000);
          }
        });
      }
      prev = data;
    });
    return () => unsub();
  }, [groupId]);

  // Load personal progress when not in group
  useEffect(() => {
    if (groupId) return;
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !questId) return;
    (async () => {
      try {
        const data = await getUserQuests(user.uid);
        const found = data.quests.find((q) => q.id === questId);
        if (found && Array.isArray(found.visitedIndices)) {
          setVisitedIndices(found.visitedIndices);
        }
      } catch (err) {
        console.error('Failed to load progress', err);
      }
    })();
  }, [quest, groupId, questId]);

  const currentStopIndex = visitedIndices.length;
  const allVisited = stops.length > 0 && visitedIndices.length >= stops.length;
  const questComplete = allVisited || groupData?.completed === true;
  useEffect(() => {
    if (questComplete) {
      setShowComplete(true);
      const t = setTimeout(() => setShowComplete(false), 3000);
      return () => clearTimeout(t);
    }
  }, [questComplete]);


  useEffect(() => {
    if (!userLocation || !stops.length) return;
    const remaining = stops.slice(currentStopIndex);
    if (!remaining.length) return;

    const fetchRoute = async () => {
      setEtaError("");
      const origin = `${userLocation.lat},${userLocation.lng}`;
      const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const destination = `${remaining[remaining.length - 1].lat},${remaining[remaining.length - 1].lng}`;
      const waypoints = remaining
        .slice(0, -1)
        .map((p) => `${p.lat},${p.lng}`)
        .join('|');

      console.log('Waypoints', waypoints);
      console.log('Remaining stops', remaining);

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=walking` +
        (waypoints ? `&waypoints=${waypoints}` : '') +
        `&key=${key}`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        const legs = data?.routes?.[0]?.legs || [];
        if (legs.length === 0) throw new Error('No route');
        const sec = legs.reduce((s, l) => s + (l.duration?.value || 0), 0);
        const mins = Math.round(sec / 60);
        setEtaText(`${mins} min`);
        console.log('ETA legs', legs.map((l) => l.duration?.text));
        const poly = data?.routes?.[0]?.overview_polyline?.points;
        if (poly) {
          const decoded = decode(poly).map(([lat, lng]) => ({ lat, lng }));
          setPolylinePoints(decoded);
        } else {
          setPolylinePoints([]);
        }
      } catch (err) {
        console.error('Failed to fetch directions:', err);
        setEtaError('Failed to load ETA');
      }
    };

    fetchRoute();
  }, [userLocation, currentStopIndex, stops, etaRefresh]);

  const handleMarkVisited = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in!");

    if (!questId || questComplete) return;
    try {
      let result;
      if (groupId) {
        result = await trackStopVisit(groupId, user.uid, visitedIndices.length);
        setVisitedIndices(result.visitedStops || result.visitedIndices || []);
      } else {
        result = await trackVisit(user.uid, questId, visitedIndices.length);
        setVisitedIndices(result.visitedIndices || []);
      }
      if (typeof result.totalXP === "number") {
        const gain = result.totalXP - userXP;
        if (gain > 0) setXpMsg(`+${gain} XP`);
        setUserXP(result.totalXP);
      }
      if (result?.badges) {
        const newKey = Object.keys(result.badges).find(
          (k) => result.badges[k] && !badges[k]
        );
        if (newKey) setNewBadge(newKey);
        setBadges(result.badges);
      }
      if (result?.xp) {
        setTimeout(() => setXpMsg(""), 2000);
      }
    } catch (err) {
      console.error('Failed to track visit', err);
    }
  };

  const handleComplete = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in!");
    if (!questId) return;
    setSaving(true);
    setCompleteMsg("");
    try {
      const share = window.confirm('Share this quest publicly?');
      const res = await completeQuest(user.uid, questId, {
        title: quest.title,
        city: quest.city,
        mood: quest.mood,
        difficulty: quest.difficulty,
        questText: quest.questText,
        locationList: quest.places,
        imagePrompt: quest.imagePrompt,
        visitedIndices,
        isDemo: questId.startsWith('demo_'),
        public: share,
        displayName: user.displayName,
      });
      if (groupId) {
        await completeGroupQuest(groupId, user.uid);
      }
      if (res?.xpEarned) setXpMsg(`+${res.xpEarned} XP`);
      setSummaryData(res);
      setSummaryOpen(true);
      setCompleteMsg("Quest Saved to Your Profile!");
      window.dispatchEvent(new Event("quest-saved"));
    } catch (err) {
      console.error("Failed to complete quest", err);
      setCompleteMsg("Failed to save quest");
    } finally {
      setSaving(false);
    }

  };
  const handleReport = async () => {
    const reason = window.prompt('Reason for report?');
    if (!reason) return;
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert('You must be logged in!');
    try {
      await reportQuest(user.uid, questId, reason, quest.city, quest.mood);
      alert('Report submitted');
    } catch (err) {
      console.error('failed to report quest', err);
    }
  };

  const handleLeave = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !groupId) return;
    try {
      await leaveGroup(user.uid, groupId);
      alert("You’ve left the group.");
      navigate("/home");
    } catch (err) {
      console.error("Failed to leave group", err);
      alert("Error leaving group.");
    }
  };
    

  if (!quest) {
    return <div className="p-6 text-center text-red-600">Quest data missing.</div>;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f8fcf8] overflow-x-hidden font-jakarta">
      {showComplete && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-3xl font-bold animate-bounce">
          Quest Complete!
        </div>
      )}
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

        <div
          id="xpBadge"
          className="fixed top-4 right-4 bg-purple-600 text-white px-2 py-1 rounded text-sm"
        >
          {userXP} XP
        </div>
        <TooltipManager />

        <main className="px-10 py-5 flex flex-col max-w-4xl mx-auto w-full">
          <div className="flex flex-wrap justify-between gap-3 p-4">
          <div className="flex flex-col gap-3 min-w-72">
            <p className="text-2xl font-bold text-[#0e1b0e]">
              {quest?.title || "Your Quest"}
            </p>
            <p className="text-sm text-[#4e974e]">
              {quest?.questText || "Embark on your adventure"}
            </p>
            {groupId && (
              <div className="text-xs text-blue-700 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="break-all">Invite: {`${window.location.origin}/live?groupId=${groupId}`}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/live?groupId=${groupId}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="px-2 py-0.5 rounded bg-blue-600 text-white"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {groupData && (
                  <GroupMemberList members={groupData.members || []} progress={groupData.progress || {}} total={stops.length} />
                )}
              </div>
            )}
          </div>
            <div className="flex gap-2">
              {groupId && (
                <button
                  onClick={handleLeave}
                  className="h-10 px-4 rounded-full bg-red-500 text-sm text-white"
                >
                  Leave Group
                </button>
              )}
              <button
                onClick={() => window.location.assign('/home')}
                className="h-10 px-4 rounded-full bg-[#e7f3e7] text-sm text-[#0e1b0e]"
              >
                Back to Home
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="flex justify-between items-center">
              <p className="text-base font-medium text-[#0e1b0e]">Progress</p>
              <p className="text-sm text-[#0e1b0e]">
                {visitedIndices.length}/{stops.length}
              </p>
            </div>
          <div className="w-full bg-[#d0e7d0] rounded">
            <div
              className="h-2 rounded bg-[#14b714]"
              style={{ width: `${(visitedIndices.length / (stops.length || 1)) * 100}%` }}
            />
          </div>
        </div>
        {activityMsg && (
          <p className="text-xs text-center text-blue-700 mt-1">{activityMsg}</p>
        )}
        <XPToast message={xpMsg} onHide={() => setXpMsg('')} />
        <BadgePopup badge={newBadge} onClose={() => setNewBadge('')} />
        <QuestCompleteSummary
          open={summaryOpen}
          xpEarned={summaryData.xpEarned}
          newTotal={summaryData.newTotal}
          level={summaryData.level}
          badgesUnlocked={summaryData.badgesUnlocked || []}
          nextLevelXP={summaryData.nextLevelXP || 100}
          imageUrl={summaryData.imageUrl}
          onClose={() => {
            setSummaryOpen(false);
            if (!skipSharePrompt) setShareOpen(true);
          }}
        />
        <PostQuestShareModal
          open={shareOpen}
          imageUrl={summaryData.imageUrl}
          city={quest?.city || ''}
          xpEarned={summaryData.xpEarned}
          badge={summaryData.badgesUnlocked?.[0]}
          showWatermark={showWatermark}
          onClose={() => setShareOpen(false)}
        />
          <div className="px-4 py-3">
          <LiveQuestMap
            stops={stops}
            visitedIndex={currentStopIndex}
            userLocation={userLocation}
            polylinePoints={polylinePoints}
            groupProgress={groupData?.progress || {}}
            members={groupData?.members || []}
          />
         </div>
         <div className="text-center mb-3">
           <a
             id="routeToggle"
             href={`/quest/${quest?.city || ''}/${quest?.mood || ''}/route`}
             className="text-blue-600 underline text-sm"
           >
             View Full Route
           </a>
         </div>

          <p className="text-sm text-[#4e974e] text-center px-4">
            {etaError
              ? `${etaError}`
              : etaText
              ? `ETA to Next Stop: ${etaText}`
              : "Calculating ETA..."}
          </p>
          {etaError && (
            <div className="text-center mt-1">
              <button
                onClick={() => {
                  setEtaError("");
                  setEtaRefresh((c) => c + 1);
                }}
                className="text-xs underline text-blue-600"
              >
                Retry ETA
              </button>
            </div>
          )}

          <div className="flex px-4 py-3">
            <button
              id="markVisitedBtn"
              onClick={handleMarkVisited}
              disabled={questComplete}
              className={`flex-1 h-14 rounded-full text-base font-bold text-[#f8fcf8] transform transition active:scale-95 ${
                questComplete
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#14b714] hover:bg-[#0fa50f]"
              }`}
            >
              {questComplete ? "Quest Complete!" : "Mark as Visited"}
            </button>
          </div>

          {questComplete && (
            <div className="flex px-4 py-3">
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex-1 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-base font-bold text-white"
              >
                {saving ? "Saving..." : "Complete Quest"}
              </button>
            </div>
          )}
          {completeMsg && (
            <p className="text-center text-green-700 mt-2">{completeMsg}</p>
          )}
          <div className="px-4 py-2 space-y-2 text-center">
            {!groupId && (
              <button
                id="inviteCTA"
                type="button"
                onClick={() => toast('Upgrade to Quest+ to invite friends')}
                className="text-xs text-blue-600 underline"
              >
                Invite Friends with Quest+
              </button>
            )}
            <button onClick={handleReport} className="text-xs text-red-600 underline">
              Report Quest
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
