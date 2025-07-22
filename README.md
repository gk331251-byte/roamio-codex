# roamio
Roamio

Roamio is a location-driven quest generation app that puts adventure back into your day. It uses real-world data, AI content generation, and an intuitive UI to deliver customized quests based on your mood, location, and time availability. This project is structured as a full-stack monorepo with distinct frontend and backend folders, built to be cloud-native and easily deployable.

🌐 Tech Stack

Frontend

React.js (w/ Tailwind CSS)

Firebase Authentication

Google Maps API (for map rendering and GPS routing)

Deployed via Google Cloud Run or Firebase Hosting

Backend

FastAPI (Python)

Firestore (as main DB)

Google Places API

OpenAI GPT-4 API (for quest content)

Google Secret Manager (for secure API key handling)

Google Pub/Sub (for async image generation queue)

Deployed via Google Cloud Run

Infra

Terraform-managed deployment

Cloud Logging enabled

GitHub integration with Codex for AI agents

🚀 Core Features

Quest Generation:

Enter location manually or via GPS

Select one or more moods (e.g., whimsical, spooky, romantic)

Returns:

Quest title and story

A map route of 2–5 local spots ("NPCs")

A generated postcard image (via DALL·E)

Estimated time & difficulty level

User Functionality:

Google OAuth2 login

Daily limit: 3 quests/day

Saved quest history with postcard gallery

Quest progress tracking with real-time GPS and ETA

"Mark as visited" and "Complete quest" buttons

🏆 Premium (Quest+ Tier)

Custom quest builder (e.g., date night, spooky crawl)

Group quests w/ shared maps and in-quest chat

Community quest feed (upcoming)

Shared replays and leaderboards

🚧 Roadmap

Phase 1 (MVP) ✅

Core screens (Landing, Login, QuestHome, QuestDetails, Profile, QuestHistory)

Backend quest pipeline (Places + GPT + Firestore)

Phase 2 (Now)

Live quest page w/ real-time GPS and map tracking

Route progress & "Mark Stop Visited" logic

Image prompt generation for postcard

Monorepo setup with GitHub + Codex agents

Phase 3 (Soon)

Quest+ upsell page

Custom quest creator UI

Group invite/share UI

Stripe payment integration

Phase 4 (Stretch Goals)

Leaderboard + community feed

Admin dashboard

Map overlays (events, badges)

Quest scheduling

🧹 Inspiration

We wanted to revive a sense of wonder in the day-to-day. Whether you’re in your hometown or visiting somewhere new, Roamio turns your location into an interactive journey.

"Put adventure back into the day by day."

🚑 Dev Tips

All API keys must go in Secret Manager (never commit them)

Each quest is stored in Firestore under /quests/{locationHash_mood}

Users are stored under /users/{uid}

Quest history: /user_quests/{uid}/{questId}

Enable billing and Firestore rules for production

👁‍🗨️ Contact

Built by Gavin K.

