import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full text-center py-4 text-xs text-gray-600 bg-[#f8fcf8]">
      <Link to="/terms" className="underline mr-2">Terms of Service</Link>
      |
      <Link to="/privacy" className="underline ml-2">Privacy Policy</Link>
    </footer>
  );
}
