import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";

const Login = () => {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Logged in user:", result.user);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="space-y-2 text-center">
      <button
        onClick={handleLogin}
        className="bg-green-600 text-white px-4 py-2 rounded-lg"
      >
        Sign In with Google
      </button>
      <p className="text-xs text-gray-500 mt-2">
        By signing in, you agree to our{' '}
        <a href="/terms" className="underline">Terms</a> and{' '}
        <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </div>
  );
};

export default Login;
