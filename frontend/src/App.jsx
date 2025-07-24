// src/App.jsx
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getActiveQuest, getQuest, leaveGroup } from "./lib/api";
import LandingPage from "./components/LandingPage";
import WelcomePage from "./pages/WelcomePage";
import OnboardingFlow from "./pages/OnboardingFlow";
import QuestHome from "./components/QuestHome";
import QuestDetails from "./components/QuestDetails";
import QuestHistory from "./components/QuestHistory";
import Profile from "./components/Profile";
import PostcardGalleryPage from "./pages/PostcardGalleryPage";
import Header from "./components/Header";
import Footer from "./components/Footer";
import QuestRoute from "./components/QuestRoute";
import QuestLivePage from "./components/QuestLivePage";
import Pricing from "./pages/Pricing";
import PaymentSuccess from "./components/PaymentSuccess";
import PaymentFailed from "./components/PaymentFailed";
import CommunityFeed from "./components/CommunityFeed";
import UGCFeed from "./pages/UGCFeed";
import CommunityPage from "./components/CommunityPage";
import CreateCommunity from "./components/CreateCommunity";
import AdminDashboard from "./components/AdminDashboard";
import CustomQuestBuilder from "./components/CustomQuestBuilder";
import PublicQuestPage from "./components/PublicQuestPage";
import TagEditor from "./components/TagEditor";
import Explore from "./components/Explore";
import GroupQuestView from "./components/GroupQuestView";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import UGCSubmitForm from "./components/UGCSubmitForm";
import CreatorDashboard from "./pages/CreatorDashboard";
import CreatorSubmitQuest from "./pages/CreatorSubmitQuest";
import Featured from "./pages/Featured";
import UGCAnalytics from "./pages/admin/UGCAnalytics";
import FeaturedReview from "./pages/admin/FeaturedReview";
import CookieConsent from "react-cookie-consent";


function App() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const onboarded = snap.exists() && snap.data().onboarding;
        if (!onboarded && location.pathname !== '/onboarding') {
          navigate('/onboarding');
          return;
        }
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
      {location.pathname !== '/' && location.pathname !== '/onboarding' && <Header />}
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/home" element={<QuestHome />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
        <Route path="/details" element={<QuestDetails />} />
        <Route path="/quest/:city/:mood/route" element={<QuestRoute />} />
        <Route path="/history" element={<QuestHistory />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/gallery" element={<PostcardGalleryPage />} />
        <Route path="/live" element={<QuestLivePage />} />
        <Route path="/group/:groupId" element={<GroupQuestView />} />
        <Route path="/community" element={<CommunityFeed />} />
        <Route path="/community/new" element={<CreateCommunity />} />
        <Route path="/community/:id" element={<CommunityPage />} />
        <Route path="/ugc-feed" element={<UGCFeed />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/quest-plus" element={<Pricing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/custom" element={<CustomQuestBuilder />} />
        <Route path="/custom/edit/:questId" element={<CustomQuestBuilder />} />
        <Route path="/q/:questId" element={<PublicQuestPage />} />
        <Route path="/tag-editor/:questId" element={<TagEditor />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/creator-dashboard" element={<CreatorDashboard />} />
        <Route path="/creator-dashboard/submit-quest" element={<CreatorSubmitQuest />} />
        <Route path="/featured" element={<Featured />} />
        <Route path="/admin/ugc-analytics" element={<UGCAnalytics />} />
        <Route path="/admin/featured-review" element={<FeaturedReview />} />
        <Route path="/ugc-submit" element={<UGCSubmitForm />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
      </Routes>
      {location.pathname !== '/' && location.pathname !== '/onboarding' && <Footer />}
      <CookieConsent
        location="bottom"
        buttonText="I Agree"
        cookieName="roamioConsent"
        style={{ background: "#2B373B" }}
        buttonStyle={{ color: "#4e974e", fontSize: "13px" }}
      >
        Roamio uses location and cookies to personalize quests. By using this app, you agree to our{' '}
        <a href="/privacy" style={{ color: '#4e974e', textDecoration: 'underline' }}>Privacy Policy</a>.
      </CookieConsent>
    </>
  );
}

export default App;
