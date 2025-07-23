// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const Header = () => {
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(u?.email === 'admin@roamio.app');
    });
  }, []);

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
        <Link to="/explore" className={linkClass("/explore")}>Explore</Link>
        <Link to="/history" className={linkClass("/history")}>History</Link>
        <Link to="/community" className={linkClass("/community")}>Community</Link>
        {user && (
          <Link to="/custom" className={linkClass("/custom")}>➕ Custom Quest</Link>
        )}
        <Link to="/quest-plus" className={linkClass("/quest-plus")}>Quest+</Link>
        {isAdmin && (
          <Link to="/admin" className={linkClass("/admin")}>Admin</Link>
        )}
        {user && (
          <Link to="/profile" className={linkClass("/profile")}>Profile</Link>
        )}
      </nav>
    </header>
  );
};

export default Header;
