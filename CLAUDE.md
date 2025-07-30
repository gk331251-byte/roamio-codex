# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Roamio is a location-driven quest generation app structured as a full-stack monorepo with three main components:

### Frontend (`/frontend/`)
- **Framework**: React + Vite with Tailwind CSS
- **Authentication**: Firebase Auth with Google OAuth2
- **Maps**: Google Maps API with react routing
- **State Management**: React Context + Firebase Firestore real-time listeners
- **Deployment**: Firebase Hosting (serves from `frontend/dist`)

### Backend (`/backend/`)
- **Framework**: FastAPI (Python)
- **Database**: Firestore as primary database
- **APIs**: Google Places API, OpenAI GPT-4, Google Maps
- **Authentication**: Firebase Admin SDK for token verification
- **Secrets**: Google Secret Manager for API keys
- **Deployment**: Google Cloud Run with containerized deployment

### Mobile (`/roamio-mobile/`)
- **Framework**: React Native with Expo
- **Maps**: react-native-maps with Google integration
- **State**: Shared context and Firebase integration

## Development Commands

### Frontend Development
```bash
cd frontend
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend Development
```bash
cd backend
pip install -r requirements.txt  # Install Python dependencies
python main.py                   # Run FastAPI server locally
# Or use: uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

### Mobile Development
```bash
cd roamio-mobile
npm start            # Start Expo dev server
npm run android      # Run on Android
npm run ios          # Run on iOS
npm run web          # Run on web
```

### Deployment
```bash
./deploy.sh          # Deploy backend to Google Cloud Run
# Frontend deploys automatically via Firebase Hosting
```

## Key Architectural Patterns

### Quest Generation Pipeline
1. User inputs location + mood + time limit via frontend
2. Frontend calls `/generate-quest` API with Firebase auth token
3. Backend validates token, generates quest using:
   - Google Places API for location data
   - OpenAI GPT-4 for quest narrative and story
   - Custom logic for route optimization and difficulty
4. Quest stored in Firestore under `/quests/{locationHash_mood}`
5. Postcard image generated asynchronously via DALL·E

### Data Models
- **Users**: `/users/{uid}` - profile, premium status, quest limits
- **Quests**: `/quests/{questId}` - generated quest content and metadata  
- **User Quests**: `/user_quests/{uid}/{questId}` - user's quest history and progress
- **Group Quests**: `/group_quests/{groupId}` - shared quest instances for premium users

### Authentication Flow
- Frontend uses Firebase Auth for Google OAuth2
- All API calls include Firebase ID token in Authorization header
- Backend validates tokens using Firebase Admin SDK
- User limits enforced: 3 quests/day for free users

### Real-time Features
- Quest progress tracking uses Firestore real-time listeners
- Group chat implemented via Firestore subcollections
- Live GPS updates stored in user quest documents

## Premium Features (Quest+)
- Custom quest builder with templates
- Group quests with shared maps and chat
- Unlimited daily quest generation
- Community feed and leaderboards
- Stripe integration for payments

## Environment Setup
- All API keys stored in Google Secret Manager (never commit)
- Firebase config loaded via environment variables
- Backend expects secrets mounted at `/secrets/` in Cloud Run
- Frontend uses Vite environment variables with `VITE_` prefix

## Testing
- Firestore security rules tested in `/tests/firestoreRules.test.js`
- No formal test framework setup yet - manual testing preferred
- Use Firebase Local Emulator Suite for development testing

## Common Issues
- Ensure Firebase project billing is enabled for production
- Firestore security rules must be deployed separately from code
- Cloud Run requires proper service account permissions for Secret Manager
- Mobile app requires Expo development build for maps functionality