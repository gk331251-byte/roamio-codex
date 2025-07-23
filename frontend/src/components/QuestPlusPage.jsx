import React, { useState } from 'react';

const QuestPlusPage = () => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = () => {
    setLoading(true);
    window.location.href = 'https://buy.stripe.com/test_4gw4jA8AcdFr0Te8ww';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fcf8] px-6 py-10 text-center space-y-4">
      <h1 className="text-3xl font-bold text-[#0e1b0e]">Quest+ Membership</h1>
      <p className="text-[#0e1b0e]">Unlock custom quests and other premium features.</p>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="px-5 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Redirecting...' : 'Upgrade Now'}
      </button>
    </div>
  );
};

export default QuestPlusPage;
