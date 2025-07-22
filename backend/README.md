# Roamio: Real-World Quest Generator

> “Put adventure back into the day by day.”

## 🔥 Purpose

Roamio is a gamified real-world exploration platform that turns your surroundings into an adventure. Users receive GPT-generated quests based on their GPS location, mood, and local places — with stops visualized on a route map and styled as narrative-driven challenges.

This app showcases full-stack AI integration with Google Cloud infrastructure, geolocation APIs, and Firebase authentication.

## ✨ Current MVP Features

* ✅ Quest generation via GPT-4 API
* ✅ Google Places API to locate real shops, hikes, attractions
* ✅ Google Maps route visualization (with ETA and polyline)
* ✅ GPS or manual location input
* ✅ Select one or more quest "moods" (e.g., romantic, eerie, nostalgic)
* ✅ Firestore-based caching to reduce API costs
* ✅ Firebase OAuth2 login (Google sign-in)
* ✅ Firestore rate-limiting (3 quests/day)
* ✅ Quest history and Profile tracking
* ✅ Postcard image generation (DALL·E prompt per difficulty)
* ✅ Polished UI via Tailwind + Stitch

## 🔭 Roadmap (Q3 2025)

* 🚧 Quest+ Tier with:

  * Custom Quest Builder
  * Group Quests + Live chat
  * Postcard Gallery & social sharing
* 🧭 Community Quests & Leaderboard
* 🧩 Monetization (Stripe integration, bundle packs)
* 🗺️ Local sponsor integration (quest "loot")
* 🔁 Scheduled region-based quest drops
* 🧠 Admin dashboard + feedback loop

---

## 🧱 Stack

| Layer          | Tech                                     |
| -------------- | ---------------------------------------- |
| Frontend       | React.js + Tailwind CSS (Vite, Stitch)   |
| Backend        | FastAPI on Google Cloud Run              |
| Database       | Firestore (NoSQL)                        |
| Auth           | Firebase Auth (Google OAuth2)            |
| APIs           | Google Maps, Google Places, OpenAI GPT-4 |
| Infrastructure | Terraform, Cloud Logging, Pub/Sub        |

## 🧠 Firestore Schema

```plaintext
/users/{userId} → {
  displayName, email, lastActive
}

/quests/{locationHash_mood} → {
  questText, locationList, timestamp, usageCount
}

/user_quests/{userId}/{questId} → {
  questIdRef, generatedAt, postcardUrl (optional)
}
```

## 💻 Dev Setup

```bash
# Clone frontend and backend separately
$ git clone https://github.com/gk331251-byte/real-world-quest-frontend.git
$ git clone https://github.com/gk331251-byte/real-world-quest-backend.git

# Frontend setup
$ cd real-world-quest-frontend
$ npm install
$ npm run dev

# Backend setup
$ cd ../real-world-quest-backend
$ python3 -m venv venv && source venv/bin/activate
$ pip install -r requirements.txt
$ uvicorn main:app --reload
```

> Set environment variables or use Google Secret Manager in production

## 📬 Contact & Contribution

Pull requests welcome. This is a demo portfolio project showcasing:

* AI Integration
* Scalable Cloud Architecture
* Location + Content Generation

To contribute, open an issue or fork the repo with clear documentation.

---

🗺️ Roamio was built to bring wonder back into everyday wandering. Whether you're chasing a date-night story or an eerie solo adventure — open the app, and start exploring.

