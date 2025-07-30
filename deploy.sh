#!/bin/bash

# Build and deploy to Cloud Run
echo "Building container..."
# Build new container with updated paths
gcloud builds submit --tag gcr.io/real-world-quest-app/real-quest-backend .

echo "Deploying to Cloud Run..."

# Deploy with separate directories for each secret
gcloud run deploy real-quest-backend \
  --image gcr.io/real-world-quest-app/real-quest-backend \
  --region us-east1 \
  --platform managed \
  --allow-unauthenticated \
  --timeout 300 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars="PYTHONPATH=/app,GOOGLE_CLOUD_PROJECT=real-world-quest-app" \
  --update-secrets="/secrets/firestore/key=firestore-key:latest" \
  --update-secrets="/secrets/places/key=places-api-key:latest" \
  --update-secrets="/secrets/openai/key=openai-api-key:latest" \
  --service-account=firestore-access@real-world-quest-app.iam.gserviceaccount.com

echo "Deployment complete!"
