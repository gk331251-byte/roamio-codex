// src/components/QuestHistory.jsx
import React from 'react';
import { motion } from 'framer-motion';

const mockQuests = [
  {
    title: 'Golden Gate Park Exploration',
    city: 'San Francisco, CA',
    mood: 'Adventurous',
    time: '2 hours',
    imageUrl: 'https://via.placeholder.com/600x300?text=Golden+Gate+Quest',
    completed: true,
  },
  {
    title: 'Hidden Bookstore Tour',
    city: 'Portland, OR',
    mood: 'Chill',
    time: '1.5 hours',
    imageUrl: 'https://via.placeholder.com/600x300?text=Bookstore+Quest',
    completed: true,
  },
];

const QuestHistory = () => {
  return (
    <div className="min-h-screen bg-[#f8fcf8] text-[#0e1b0e] font-sans">
      <section className="px-6 py-8">
        <h1 className="text-[32px] font-bold leading-tight mb-1">Quest History</h1>
        <p className="text-[#4e974e] text-sm mb-6">Relive your past adventures and discover new paths.</p>

        <div className="space-y-6">
          {mockQuests.map((quest, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex flex-col lg:flex-row gap-4 items-stretch rounded-xl bg-white p-4 shadow-md"
            >
              <div className="flex-[2] flex flex-col justify-between gap-2">
                <div>
                  <h2 className="font-bold text-lg">{quest.title}</h2>
                  <p className="text-sm text-[#4e974e]">
                    City: {quest.city} | Mood: {quest.mood} | Time: {quest.time}
                  </p>
                </div>
                <button className="flex items-center gap-2 bg-[#e7f3e7] text-[#0e1b0e] px-3 py-1 rounded-xl w-fit text-sm font-medium">
                  <svg className="w-4 h-4" viewBox="0 0 256 256" fill="currentColor">
                    <path d="M224 128a96 96 0 01-94.7 96H128a95.4 95.4 0 01-65.9-26.2 8 8 0 0111-11.6A80 80 0 1071.4 71.4L44.6 96H72a8 8 0 010 16H24a8 8 0 01-8-8V56a8 8 0 0116 0v29.8L60.2 60A96 96 0 01224 128z" />
                  </svg>
                  Replay
                </button>
              </div>
              <div className="flex-1 bg-cover bg-center aspect-video rounded-xl" style={{ backgroundImage: `url(${quest.imageUrl})` }} />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default QuestHistory;