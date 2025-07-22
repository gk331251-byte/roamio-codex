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
      </Routes>
    </>
  );
}

export default App;
