import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { validatePremium } from '../lib/api';

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('Activating...');

  useEffect(() => {
    const uid = params.get('userId');
    const session = params.get('session_id');
    if (uid && session) {
      validatePremium(uid, session)
        .then(() => setStatus('Quest+ Activated!'))
        .catch(() => setStatus('Validation failed'));
    } else {
      setStatus('Quest+ Activated!');
    }
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fcf8] px-6 py-10 text-center">
      <div>
        <h1 className="text-3xl font-bold text-green-700 mb-4">Payment Successful</h1>
        <p className="text-[#0e1b0e]">{status}</p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
