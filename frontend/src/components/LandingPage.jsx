// src/components/LandingPage.jsx
import React from "react";

const LandingPage = ({ onStart }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fcfa] font-lexend overflow-x-hidden border-4 border-red-500">
      <div className="w-full max-w-[960px] px-4 sm:px-6 md:px-10 border-4 border-red-400">
        <div
          className="min-h-[480px] flex flex-col gap-6 md:gap-8 bg-cover bg-center bg-no-repeat rounded-xl items-center justify-center p-6 md:p-10 border-4 border-red-300"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.4)), url('https://lh3.googleusercontent.com/aida-public/AB6AXuBapA3FBg2w0FuvOO3ctZdu7WmzhhL_Wqu-eNicwiZuP89FCehxE0KMT6vSTp5WOpdGGHdf6zYopsdoLFMPqmNq4tpZ0PTCl6NtIZLfAoZX8sJPSbPUstTIPfqbdCwTxfMKyywdLMc5Ew10ksBohPf56UTOwYe_N9GQE-JpaMjgNu2YFBNlmbol-XU15E0DDUGhxryNexUG_Osz1QDBe-y03Ot1WBWv2b8Jea3wGQ2M9JmpzMSqPSd7vSGSxg7tub9rXGg92EsMFNw')",
          }}
        >
          <div className="flex flex-col gap-2 text-center border-4 border-red-200 p-2">
            <h1 className="text-white text-4xl sm:text-5xl font-black leading-tight tracking-tight border border-white p-1">
              Quest Generator: Unearth Your World
            </h1>
            <h2 className="text-white text-sm sm:text-base font-normal leading-normal max-w-md mx-auto border border-white p-1">
              Transform your daily routine into an epic journey. Discover hidden gems and embark on real-world quests.
            </h2>
          </div>

          <div className="flex-wrap gap-3 flex justify-center mt-4 border-4 border-red-100 p-2">
            <button
              onClick={onStart}
              className="flex min-w-[84px] max-w-[480px] items-center justify-center rounded-full h-10 px-4 sm:h-12 sm:px-5 bg-[#019863] text-[#f8fcfa] text-sm sm:text-base font-bold tracking-wide border border-white"
            >
              <span className="truncate">Begin Your Quest</span>
            </button>
            <button className="flex min-w-[84px] max-w-[480px] items-center justify-center rounded-full h-10 px-4 sm:h-12 sm:px-5 bg-[#e6f4ef] text-[#0c1c17] text-sm sm:text-base font-bold tracking-wide border border-white">
              <span className="truncate">Sign In with Explorer Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
