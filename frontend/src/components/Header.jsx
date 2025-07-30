// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getUserXP } from "../lib/api";
import Button from "./design-system/Button";
import Badge from "./design-system/Badge";

const Header = () => {
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [user, setUser] = useState(null);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          const data = snap.exists() ? snap.data() : {};
          setIsAdmin(Boolean(data.isAdmin));
          setIsCreator(Boolean(data.isCreator));
          
          // Get user XP
          const xpData = await getUserXP(u.uid);
          setUserXP(xpData.xp || 0);
          setUserLevel(xpData.level || 1);
        } catch (err) {
          console.error('Failed to load user data', err);
        }
      } else {
        setIsAdmin(false);
        setIsCreator(false);
        setUserXP(0);
        setUserLevel(1);
      }
    });
  }, []);

  const isActive = (path) => pathname === path;

  const NavLink = ({ to, children, className = "" }) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive(to)
          ? "bg-sage-100 text-sage-700"
          : "text-gray-600 hover:text-sage-600 hover:bg-sage-50"
      } ${className}`}
    >
      {children}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-sage-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to="/home" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-sage-500 to-sage-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">Roamio</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <NavLink to="/home">
              <span className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                <span>Home</span>
              </span>
            </NavLink>
            
            <NavLink to="/explore">
              <span className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <span>Explore</span>
              </span>
            </NavLink>
            
            <NavLink to="/history">
              <span className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>History</span>
              </span>
            </NavLink>

            {/* More Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-sage-600 hover:bg-sage-50 transition-all duration-200"
              >
                <span className="flex items-center space-x-1">
                  <span>More</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </span>
              </button>
              
              {showMobileMenu && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <Link to="/community" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sage-50 hover:text-sage-600">Community</Link>
                  <Link to="/featured" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sage-50 hover:text-sage-600">Featured</Link>
                  <Link to="/leaderboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sage-50 hover:text-sage-600">Leaderboard</Link>
                  {user && (
                    <Link to="/custom" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sage-50 hover:text-sage-600">Custom Quest</Link>
                  )}
                  {isCreator && (
                    <Link to="/creator-dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sage-50 hover:text-sage-600">Creator Hub</Link>
                  )}
                  {isAdmin && (
                    <>
                      <hr className="my-2"/>
                      <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sage-50 hover:text-sage-600">Admin</Link>
                      <Link to="/admin/analytics" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sage-50 hover:text-sage-600">Analytics</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            
            {/* Quest+ Badge */}
            <Badge
              as={Link}
              to="/pricing"
              variant="earth"
              size="sm"
              className="hidden sm:flex cursor-pointer hover:bg-earth-clay-200 transition-colors"
              icon={<span>✨</span>}
            >
              Quest+
            </Badge>

            {/* XP Badge */}
            {user && (
              <Badge 
                variant="sage"
                size="md"
                className="hidden sm:flex"
                icon={
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                }
              >
                {userXP.toLocaleString()} • L{userLevel}
              </Badge>
            )}

            {/* Profile Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <img
                    className="w-8 h-8 rounded-full"
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=738563&color=fff`}
                    alt="Profile"
                  />
                </button>
                
                {showProfileMenu && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.displayName || 'User'}</p>
                      <p className="text-xs text-gray-500">Level {userLevel} • {userXP.toLocaleString()} XP</p>
                    </div>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sage-50 hover:text-sage-600">Profile & Settings</Link>
                    <Link to="/gallery" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sage-50 hover:text-sage-600">Postcard Gallery</Link>
                    <hr className="my-2"/>
                    <button 
                      onClick={() => getAuth().signOut()}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button 
                as={Link}
                to="/home"
                variant="primary"
                size="sm"
              >
                Sign In
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-sage-600 hover:bg-sage-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-sage-100 py-4 space-y-2">
            <Link to="/home" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-sage-600 hover:bg-sage-50">🏠 Home</Link>
            <Link to="/explore" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-sage-600 hover:bg-sage-50">🗺️ Explore</Link>
            <Link to="/history" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-sage-600 hover:bg-sage-50">📚 History</Link>
            <Link to="/community" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-sage-600 hover:bg-sage-50">👥 Community</Link>
            {user && (
              <Link to="/custom" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-sage-600 hover:bg-sage-50">➕ Custom Quest</Link>
            )}
            <hr className="my-2"/>
            <Link to="/pricing" className="block px-3 py-2 rounded-lg text-sm font-medium text-earth-clay-600 hover:bg-earth-clay-50">✨ Upgrade to Quest+</Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;