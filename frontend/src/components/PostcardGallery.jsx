import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { motion as Motion } from 'framer-motion';
import { auth, db } from '../firebase';

const PostcardGallery = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);
  const [mood, setMood] = useState('');
  const [difficulty, setDifficulty] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        setCards([]);
        setLoading(false);
        return;
      }
      try {
        const ref = collection(db, 'user_quests', user.uid, 'quests');
        const snapshot = await getDocs(ref);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filtered = data.filter(d => d.postcardUrl);
        setCards(filtered);
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

  const displayed = cards.filter(
    c => (!mood || c.mood === mood || c.questData?.mood === mood) &&
          (!difficulty || c.difficulty === difficulty || c.questData?.difficulty === difficulty)
  );

  return (
    <div>
      <div className="mb-4 flex gap-4">
        <select value={mood} onChange={e => setMood(e.target.value)} className="border px-2 py-1 rounded">
          <option value="">All Moods</option>
          <option value="Adventure">Adventure</option>
          <option value="Romantic">Romantic</option>
          <option value="Weird">Weird</option>
          <option value="Nature">Nature</option>
          <option value="Foodie">Foodie</option>
          <option value="Cozy">Cozy</option>
        </select>
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="border px-2 py-1 rounded">
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {displayed.map(card => (
        <Motion.div
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
        </Motion.div>
      ))}
      </div>
    </div>
  );
};

export default PostcardGallery;
