import React, { useEffect, useState, useRef } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { sendMessage, fetchChatStream, validatePremium } from '../lib/api';

export default function GroupChatBox({ groupId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [premium, setPremium] = useState(false);
  const endRef = useRef(null);
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      validatePremium().then((r) => setPremium(!!r.isPremium)).catch(() => setPremium(false));
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!groupId) return undefined;
    const unsub = fetchChatStream(groupId, (msgs) => setMessages(msgs));
    return () => unsub && unsub();
  }, [groupId]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    await sendMessage(groupId, user.uid, user.displayName || user.email || 'anon', input.trim());
    setInput('');
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 bg-white border shadow px-3 py-1 rounded"
      >
        Chat
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t h-64 flex flex-col z-50">
      <div className="flex justify-between items-center bg-gray-100 p-2 border-b">
        <span className="font-semibold">Group Chat</span>
        <button className="text-sm text-blue-600" onClick={() => setOpen(false)}>Close</button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 text-sm">
        {messages.map((m) => (
          <div key={m.id} className="mb-1">
            <span className="font-bold mr-1">{m.senderName}:</span>
            <span>{m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {premium ? (
        <form onSubmit={handleSend} className="flex border-t p-2">
          <input
            className="flex-1 border rounded px-2 mr-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 text-white px-3 rounded">
            Send
          </button>
        </form>
      ) : (
        <div className="border-t p-2 text-center text-sm">
          <a href="/pricing" className="text-blue-600 underline">
            Upgrade to Quest+ to join the chat
          </a>
        </div>
      )}
    </div>
  );
}
