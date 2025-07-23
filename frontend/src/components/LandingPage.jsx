// src/components/LandingPage.jsx
import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate('/home');
    } catch (err) {
      console.error('login failed', err);
    }
  };

  const demoQuest = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 to-green-100 text-[#0e1b0e]">
      <header className="p-4 flex justify-between items-center">
        <span className="font-bold text-xl">Roamio</span>
        <button onClick={handleLogin} className="text-sm font-medium text-blue-700 underline">
          Sign In
        </button>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Uncover Your Next Adventure</h1>
        <p className="text-lg text-[#4e974e] mb-6 max-w-xl">
          Explore your world through epic quests. Gamify your day with real places, stories, and surprises.
        </p>
        <div className="flex gap-4">
          <button
            onClick={demoQuest}
            className="px-6 py-3 bg-white rounded-full shadow text-sm font-bold"
          >
            Preview Demo Quest
          </button>
          <button
            onClick={handleLogin}
            className="px-6 py-3 bg-[#019863] text-white rounded-full shadow text-sm font-bold"
          >
            Sign In to Begin
          </button>
        </div>
        <div className="mt-12 animate-bounce text-2xl">⤵</div>
      </div>
    </div>
  );
};

export default LandingPage;
