export const BADGE_CATALOG = {
  first_quest: {
    id: 'first_quest',
    name: 'First Explorer',
    description: 'Complete your first quest',
    icon: '🗺️',
    criteria: { type: 'questCount', value: 1 },
  },
  level_3: {
    id: 'level_3',
    name: 'Bronze Path',
    description: 'Reach Level 3',
    icon: '🥉',
    criteria: { type: 'level', value: 3 },
  },
  level_6: {
    id: 'level_6',
    name: 'Silver Path',
    description: 'Reach Level 6',
    icon: '🥈',
    criteria: { type: 'level', value: 6 },
  },
  foodie: {
    id: 'foodie',
    name: 'Foodie Crawl',
    description: 'Complete 3 food-themed quests',
    icon: '🍜',
    criteria: { type: 'moodCount', mood: 'Foodie', value: 3 },
  },
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    description: 'Complete 5 quests',
    icon: '🧭',
    criteria: { type: 'questCount', value: 5 },
  },
  adventurer: {
    id: 'adventurer',
    name: 'Adventurer',
    description: 'Visit 10 stops',
    icon: '🎒',
    criteria: { type: 'stopCount', value: 10 },
  },
};
