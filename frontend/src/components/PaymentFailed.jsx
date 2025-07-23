import React from 'react';

const PaymentFailed = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f8fcf8] px-6 py-10 text-center">
    <div>
      <h1 className="text-3xl font-bold text-red-700 mb-4">Payment Failed</h1>
      <p className="text-[#0e1b0e]">Something went wrong. Please try again.</p>
    </div>
  </div>
);

export default PaymentFailed;
