// src/App.jsx
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getActiveQuest, getQuest, leaveGroup } from "./lib/api";
import LandingPage from "./components/LandingPage";
import QuestHome from "./components/QuestHome";
import QuestDetails from "./components/QuestDetails";
import QuestHistory from "./components/QuestHistory";
import Profile from "./components/Profile";
import Header from "./components/Header";
import QuestRoute from "./components/QuestRoute";
import QuestLivePage from "./components/QuestLivePage";
import QuestPlusPage from "./components/QuestPlusPage";
import PaymentSuccess from "./components/PaymentSuccess";
import PaymentFailed from "./components/PaymentFailed";
import CommunityFeed from "./components/CommunityFeed";
import AdminDashboard from "./components/AdminDashboard";



function App() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const data = await getActiveQuest(user.uid);
        if (data && data.questId && data.status !== 'completed') {
          const quest = await getQuest(data.questId).catch(() => null);
          let groupOk = true;
          if (data.groupId) {
            const snap = await getDoc(doc(db, 'groups', data.groupId));
            groupOk = snap.exists() && !snap.data().completed;
          }
          if (quest && groupOk && location.pathname !== '/live') {
            navigate('/live', { state: { quest, questId: data.questId, groupId: data.groupId } });
          } else if (!quest || !groupOk) {
            if (data.groupId) await leaveGroup(data.groupId, user.uid);
          }
        }
      } catch (err) {
        console.error('resume failed', err);
      }
    });
    return () => unsub();
  }, [location.pathname, navigate]);

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<QuestHome />} />
        <Route path="/details" element={<QuestDetails />} />
        <Route path="/quest/:city/:mood/route" element={<QuestRoute />} />
        <Route path="/history" element={<QuestHistory />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/live" element={<QuestLivePage />} />
        <Route path="/community" element={<CommunityFeed />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/quest-plus" element={<QuestPlusPage />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
      </Routes>
    </>
  );
}

export default App;
