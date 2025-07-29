FROM python:3.11-slim

WORKDIR /app

COPY backend /app

ENV GOOGLE_APPLICATION_CREDENTIALS=/secrets/firestore-key
ENV PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir -r requirements.txt

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
