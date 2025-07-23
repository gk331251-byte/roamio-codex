import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { auth, db } from '../firebase';

const PostcardGallery = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        setCards([]);
        setLoading(false);
        return;
      }
      try {
        const ref = collection(db, 'user_quests', user.uid);
        const q = query(ref, where('postcardUrl', '!=', null));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCards(data);
      } catch (err) {
        console.error('Failed to load postcards', err);
        setError('Failed to load postcards');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <p className="p-4">Loading postcards...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (cards.length === 0) return <p className="p-4">No postcards yet.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {cards.map(card => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white shadow-md rounded-xl overflow-hidden border border-[#e6f4ef] hover:shadow-lg"
        >
          <div
            className="h-40 bg-cover bg-center"
            style={{ backgroundImage: `url(${card.postcardUrl || card.imageUrl || 'https://placehold.co/600x300'})` }}
          />
          <div className="p-4 space-y-1">
            <h2 className="text-lg font-bold font-serif">{card.questData?.title || card.title || 'Quest'}</h2>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
              {card.questData?.difficulty || card.difficulty || 'easy'}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default PostcardGallery;
