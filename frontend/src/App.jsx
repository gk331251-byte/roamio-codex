// src/App.jsx
import React from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { onAuthStateChanged, getAuth, signInAnonymously } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getActiveQuest, getQuest, leaveGroup } from "./lib/api";
import LandingPage from "./components/LandingPage";
import WelcomePage from "./pages/WelcomePage";
import OnboardingFlow from "./pages/OnboardingFlow";
import QuestHome from "./components/QuestHome";
import QuestDetails from "./pages/QuestDetailsPage";
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
import AdminDashboard from "./pages/AdminDashboard";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import AdminQuestEditor from "./pages/AdminQuestEditor";
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
import LeaderboardPage from "./pages/LeaderboardPage";
import UGCAnalytics from "./pages/admin/UGCAnalytics";
import FeaturedReview from "./pages/admin/FeaturedReview";
import CookieConsent from "react-cookie-consent";

// Error boundary test component (development only)
import ErrorBoundaryTest from "./components/ErrorBoundary/ErrorBoundaryTest";

// Error handling imports
import { ErrorProvider } from "./contexts/ErrorContext";
import { ErrorBoundary, RouteErrorBoundary } from "./components/ErrorBoundary";
import QuestGenerationErrorBoundary from "./components/ErrorBoundary/QuestGenerationErrorBoundary";
import ErrorToast from "./components/ErrorToast/ErrorToast";
import { logError } from "./lib/errorLogger";
import { useGoogleMaps } from "./hooks/useGoogleMaps";
// Temporary global alert/confirm replacement during migration
import "./utils/toastMigration";
// Development-only debug monitoring
if (process.env.NODE_ENV === 'development') {
  import('./utils/debugMonitor');
}


function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize Google Maps API early
  const { isLoading: mapsLoading, error: mapsError } = useGoogleMaps({
    libraries: ['places', 'geometry'],
    autoLoad: true
  });
  
  useEffect(() => {
    const auth = getAuth();
    let isProcessing = false; // Prevent concurrent auth processing
    
    const unsub = onAuthStateChanged(auth, async (user) => {
      // CRITICAL FIX: Prevent concurrent auth state processing
      if (isProcessing) {
        console.debug('Auth state change already processing, skipping');
        return;
      }
      
      isProcessing = true;
      
      try {
      console.debug('auth state', user ? user.uid : 'none');
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error('guest sign-in failed', err);
          logError(err, { 
            type: 'authError', 
            action: 'signInAnonymously',
            component: 'App'
          });
        }
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const onboarded = snap.exists() && snap.data()?.onboarding;
        
        // CRITICAL FIX: Don't redirect to onboarding during quest generation or when on quest pages
        const isOnQuestFlow = ['/home', '/live', '/quest-details'].some(path => 
          location.pathname.startsWith(path)
        );
        
        if (!onboarded && location.pathname !== '/onboarding' && !isOnQuestFlow) {
          console.debug('Redirecting to onboarding from:', location.pathname);
          navigate('/onboarding');
          return;
        }
        
        // If user is not onboarded but on quest flow, log warning but don't redirect
        if (!onboarded && isOnQuestFlow) {
          console.warn('User not fully onboarded but on quest flow - allowing to continue');
          logError(new Error('User on quest flow without onboarding'), {
            type: 'onboardingSkipped',
            pathname: location.pathname,
            userId: user.uid
          });
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
        } else if (location.pathname === '/') {
          // If user is onboarded and on landing page, redirect to main quest interface
          navigate('/home');
        }
      } catch (err) {
        console.error('resume failed', err);
        logError(err, {
          type: 'navigationError',
          action: 'appInitialization',
          component: 'App'
        });
      } finally {
        isProcessing = false;
      }
      } catch (authError) {
        console.error('Auth processing error:', authError);
        logError(authError, {
          type: 'authProcessingError',
          component: 'App'
        });
        isProcessing = false;
      }
    });
    return () => unsub();
  }, [location.pathname, navigate]);

  return (
    <>
      {location.pathname !== '/' && location.pathname !== '/onboarding' && (
        <RouteErrorBoundary routeName="Header">
          <Header />
        </RouteErrorBoundary>
      )}
      
      <Routes>
        <Route path="/" element={
          <RouteErrorBoundary routeName="Welcome">
            <WelcomePage />
          </RouteErrorBoundary>
        } />
        <Route path="/landing" element={
          <RouteErrorBoundary routeName="Landing">
            <LandingPage />
          </RouteErrorBoundary>
        } />
        <Route path="/home" element={
          <RouteErrorBoundary routeName="QuestHome">
            <QuestGenerationErrorBoundary>
              <QuestHome />
            </QuestGenerationErrorBoundary>
          </RouteErrorBoundary>
        } />
        <Route path="/onboarding" element={
          <RouteErrorBoundary routeName="Onboarding">
            <OnboardingFlow />
          </RouteErrorBoundary>
        } />
        <Route path="/quest-details" element={
          <RouteErrorBoundary routeName="QuestDetails">
            <QuestDetails />
          </RouteErrorBoundary>
        } />
        <Route path="/quest/:city/:mood/route" element={
          <RouteErrorBoundary routeName="QuestRoute">
            <QuestRoute />
          </RouteErrorBoundary>
        } />
        <Route path="/history" element={
          <RouteErrorBoundary routeName="QuestHistory">
            <QuestHistory />
          </RouteErrorBoundary>
        } />
        <Route path="/profile" element={
          <RouteErrorBoundary routeName="Profile">
            <Profile />
          </RouteErrorBoundary>
        } />
        <Route path="/gallery" element={
          <RouteErrorBoundary routeName="Gallery">
            <PostcardGalleryPage />
          </RouteErrorBoundary>
        } />
        <Route path="/live" element={
          <RouteErrorBoundary routeName="QuestLive">
            <QuestLivePage />
          </RouteErrorBoundary>
        } />
        <Route path="/group/:groupId" element={
          <RouteErrorBoundary routeName="GroupQuest">
            <GroupQuestView />
          </RouteErrorBoundary>
        } />
        <Route path="/community" element={
          <RouteErrorBoundary routeName="Community">
            <CommunityFeed />
          </RouteErrorBoundary>
        } />
        <Route path="/community/new" element={
          <RouteErrorBoundary routeName="CreateCommunity">
            <CreateCommunity />
          </RouteErrorBoundary>
        } />
        <Route path="/community/:id" element={
          <RouteErrorBoundary routeName="CommunityPage">
            <CommunityPage />
          </RouteErrorBoundary>
        } />
        <Route path="/ugc-feed" element={
          <RouteErrorBoundary routeName="UGCFeed">
            <UGCFeed />
          </RouteErrorBoundary>
        } />
        <Route path="/explore" element={
          <RouteErrorBoundary routeName="Explore">
            <Explore />
          </RouteErrorBoundary>
        } />
        <Route path="/admin" element={
          <RouteErrorBoundary routeName="Admin">
            <AdminDashboard />
          </RouteErrorBoundary>
        } />
        <Route path="/admin/analytics" element={
          <RouteErrorBoundary routeName="Analytics">
            <AnalyticsDashboard />
          </RouteErrorBoundary>
        } />
        <Route path="/admin/quest-editor" element={
          <RouteErrorBoundary routeName="QuestEditor">
            <AdminQuestEditor />
          </RouteErrorBoundary>
        } />
        <Route path="/quest-plus" element={
          <RouteErrorBoundary routeName="Pricing">
            <Pricing />
          </RouteErrorBoundary>
        } />
        <Route path="/pricing" element={
          <RouteErrorBoundary routeName="Pricing">
            <Pricing />
          </RouteErrorBoundary>
        } />
        <Route path="/custom" element={
          <RouteErrorBoundary routeName="CustomQuest">
            <CustomQuestBuilder />
          </RouteErrorBoundary>
        } />
        <Route path="/custom/edit/:questId" element={
          <RouteErrorBoundary routeName="CustomQuestEdit">
            <CustomQuestBuilder />
          </RouteErrorBoundary>
        } />
        <Route path="/q/:questId" element={
          <RouteErrorBoundary routeName="PublicQuest">
            <PublicQuestPage />
          </RouteErrorBoundary>
        } />
        <Route path="/tag-editor/:questId" element={
          <RouteErrorBoundary routeName="TagEditor">
            <TagEditor />
          </RouteErrorBoundary>
        } />
        <Route path="/terms" element={
          <RouteErrorBoundary routeName="Terms">
            <Terms />
          </RouteErrorBoundary>
        } />
        <Route path="/privacy" element={
          <RouteErrorBoundary routeName="Privacy">
            <Privacy />
          </RouteErrorBoundary>
        } />
        <Route path="/creator-dashboard" element={
          <RouteErrorBoundary routeName="CreatorDashboard">
            <CreatorDashboard />
          </RouteErrorBoundary>
        } />
        <Route path="/creator-dashboard/submit-quest" element={
          <RouteErrorBoundary routeName="CreatorSubmit">
            <CreatorSubmitQuest />
          </RouteErrorBoundary>
        } />
        <Route path="/featured" element={
          <RouteErrorBoundary routeName="Featured">
            <Featured />
          </RouteErrorBoundary>
        } />
        <Route path="/leaderboard" element={
          <RouteErrorBoundary routeName="Leaderboard">
            <LeaderboardPage />
          </RouteErrorBoundary>
        } />
        <Route path="/admin/ugc-analytics" element={
          <RouteErrorBoundary routeName="UGCAnalytics">
            <UGCAnalytics />
          </RouteErrorBoundary>
        } />
        <Route path="/admin/featured-review" element={
          <RouteErrorBoundary routeName="FeaturedReview">
            <FeaturedReview />
          </RouteErrorBoundary>
        } />
        <Route path="/ugc-submit" element={
          <RouteErrorBoundary routeName="UGCSubmit">
            <UGCSubmitForm />
          </RouteErrorBoundary>
        } />
        <Route path="/payment-success" element={
          <RouteErrorBoundary routeName="PaymentSuccess">
            <PaymentSuccess />
          </RouteErrorBoundary>
        } />
        <Route path="/payment-failed" element={
          <RouteErrorBoundary routeName="PaymentFailed">
            <PaymentFailed />
          </RouteErrorBoundary>
        } />
        
        {/* Development-only error boundary test route */}
        {process.env.NODE_ENV === 'development' && (
          <Route path="/error-test" element={
            <RouteErrorBoundary routeName="ErrorTest">
              <ErrorBoundaryTest />
            </RouteErrorBoundary>
          } />
        )}
      </Routes>
      
      {location.pathname !== '/' && location.pathname !== '/onboarding' && (
        <RouteErrorBoundary routeName="Footer">
          <Footer />
        </RouteErrorBoundary>
      )}
      
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
      
      {/* Global error toast notifications */}
      <ErrorToast />
    </>
  );
}

// Main App component with error providers and boundaries
function App() {
  const AppWithProviders = (
    <ErrorProvider>
      <ErrorBoundary name="App" level="app">
        <AppContent />
      </ErrorBoundary>
    </ErrorProvider>
  );

  // Wrap in StrictMode during development to catch side effects
  if (process.env.NODE_ENV === 'development') {
    return <React.StrictMode>{AppWithProviders}</React.StrictMode>;
  }

  return AppWithProviders;
}

export default App;
