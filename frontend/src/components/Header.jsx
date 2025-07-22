// src/components/Header.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const { pathname } = useLocation();

  const linkClass = (path) =>
    `text-sm font-medium transition px-2 py-1 rounded ${
      pathname === path ? "text-[#019863] font-bold" : "text-[#4e974e]"
    }`;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#e6f4ef] bg-[#f8fcf8]">
      <Link to="/" className="text-xl font-bold text-[#0e1b0e]">
        WanderQuest
      </Link>
      <nav className="flex gap-4">
        <Link to="/home" className={linkClass("/home")}>Home</Link>
        <Link to="/history" className={linkClass("/history")}>History</Link>
        <Link to="/profile" className={linkClass("/profile")}>Profile</Link>
      </nav>
    </header>
  );
};

export default Header;
