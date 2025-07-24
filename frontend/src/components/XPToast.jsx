import React, { useEffect } from 'react';

export default function XPToast({ message = '', onHide }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onHide && onHide(), 2000);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;
  return (
    <div className="fixed top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded shadow-lg animate-bounce">
      {message}
    </div>
  );
}
