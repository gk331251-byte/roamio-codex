FROM python:3.11-slim

WORKDIR /app

# Install dependencies separately to leverage Docker cache
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend ./backend

# Cloud Run expects the app to listen on port 8080
ENV PORT=8080
ENV GOOGLE_APPLICATION_CREDENTIALS=/secrets/firestore-key.json

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
