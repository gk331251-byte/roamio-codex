import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  getAuth,
} from 'firebase/auth';
import { auth, provider } from '../firebase';

export default function LoginModal() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate('/home');
    } catch (err) {
      console.error('Google login failed', err);
      setError('Login failed');
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          navigate('/home');
          return;
        } catch (err2) {
          console.error('signup failed', err2);
          setError('Invalid email or password');
        }
      } else {
        console.error('email login failed', err);
        setError('Invalid email or password');
      }
    }
  };

  const handleGuest = async () => {
    try {
      await signInAnonymously(getAuth());
      navigate('/home');
    } catch (err) {
      console.error('guest login failed', err);
      setError('Could not start guest session');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-80 space-y-4 text-center">
        <h2 className="text-xl font-bold">Welcome to Roamio</h2>
        <div className="space-y-3">
          <button
            onClick={handleGoogle}
            className="w-full bg-red-500 text-white py-2 rounded-full"
          >
            Sign in with Google
          </button>
          <div className="text-xs text-gray-500">Fast &amp; secure</div>
          <form onSubmit={handleEmail} className="space-y-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full border rounded px-3 py-2"
            />
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full border rounded px-3 py-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600"
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
            <button className="w-full bg-[#019863] text-white py-2 rounded-full">
              Continue with Email
            </button>
          </form>
          <div className="text-xs text-gray-500">Use any email</div>
          <button
            onClick={handleGuest}
            className="w-full bg-gray-200 text-gray-800 py-2 rounded-full"
          >
            Continue as Guest
          </button>
          <div className="text-xs text-gray-500">Try Roamio before committing</div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
      </div>
    </div>
  );
}
