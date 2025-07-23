// src/App.jsx
import { Routes, Route } from "react-router-dom";
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


function App() {
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
        <Route path="/quest-plus" element={<QuestPlusPage />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
      </Routes>
    </>
  );
}

export default App;
