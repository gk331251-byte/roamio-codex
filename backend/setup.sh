#!/bin/bash
set -eo pipefail

echo "🔧 Setting up Roamio backend..."

cd backend
pip install -r requirements.txt
echo "$FIRESTORE_KEY_B64" | base64 --decode > firestore-key.json
export GOOGLE_APPLICATION_CREDENTIALS="firestore-key.json"

cd ../frontend
npm install
