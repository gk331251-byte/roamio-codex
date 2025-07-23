from fastapi import FastAPI, Query, Body, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import requests
import hashlib
from datetime import datetime
import asyncio
import googlemaps
import openai
import certifi
from google.cloud import firestore_v1, storage
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession


from dotenv import load_dotenv
from emotion_utils import generate_filtered_quest_payload

# === Load .env variables (if running locally) ===
load_dotenv()

# === Set up trusted certs for HTTPS (esp. in Codex) ===
os.environ["SSL_CERT_FILE"] = certifi.where()

if "CODEX_PROXY_URL" in os.environ:
    os.environ["HTTPS_PROXY"] = os.environ["CODEX_PROXY_URL"]
    os.environ["HTTP_PROXY"] = os.environ["CODEX_PROXY_URL"]

# === Load API keys from env (Codex-compatible) ===
#
gmaps_key = os.getenv("VITE_GOOGLE_MAPS_API_KEY") or "AIzaSyAnKnr4-l4zDeWqLhR5_6xIltr_aXRH6lQ"
try:
    gmaps = googlemaps.Client(key=gmaps_key, timeout=10)
except Exception as e:
    print("Google Maps disabled:", e);
    gmaps = None
openai_key = os.getenv("OPENAI_API_KEY");
if openai_key and openai_key.startswith("sk-"):
    openai.api_key = openai_key
else:
    openai.api_key = None

# === Initialize Firestore using REST transport to avoid gRPC SSL issues ===

db = firestore_v1.Client(
    client_options={"api_endpoint": "https://firestore.googleapis.com"}
)

# Session for REST-based Firestore calls
creds = service_account.Credentials.from_service_account_file(
    os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "firestore-key.json"),
    scopes=["https://www.googleapis.com/auth/datastore"],
)
rest_session = AuthorizedSession(creds)


def generate_hash_key(city, mood):
    key_str = f"{city.strip().lower()}_{mood.strip().lower()}"
    return hashlib.sha256(key_str.encode()).hexdigest()

def get_cached_quest(hash_key):
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests/{hash_key}"
    resp = rest_session.get(url)
    if resp.status_code == 200:
        return _decode_document(resp.json())
    return None

def save_quest_to_firestore(hash_key, quest_obj):
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests/{hash_key}"
    body = {
        "fields": _encode_fields(quest_obj)
    }
    response = rest_session.patch(url, json=body)
    if response.status_code != 200:
        print("Firestore REST Error:", response.text)
        response.raise_for_status()





# Set up Secret Manager

# Set up Firestore


# Load Google Maps API 



app = FastAPI()

# ✅ Replace this with your actual frontend deployed domain
allowed_origins = [
    "http://localhost:5173",  # Vite dev server (local)
    "https://real-quest-frontend.web.app"  # Firebase Hosting / production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # <-- FIXED
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
def read_root():
    return {"message": "Real-World Quest Generator Backend is working!"}

@app.post("/generate-quest")
async def generate_quest(
    city: str = Body(...),
    moods: list[str] = Body(...),  # Now directly accepts a list
    time_limit: int = Body(...),
    token: str = Body(...),
):
    if not city or not moods:
        return {"error": "City and mood list are required."}

    hash_key = generate_hash_key(city, "_".join(moods))
    cached = get_cached_quest(hash_key)
    if cached:
        print("Using cached quest")
        return {"quest": cached}

    try:
        geocode = gmaps.geocode(city)
        city_location = geocode[0]["geometry"]["location"]
    except Exception as e:
        print(f"Geocoding error: {e}")
        return {"error": "Failed to locate city center."}

    try:
        response = gmaps.places_nearby(
            location=(city_location["lat"], city_location["lng"]),
            radius=5000,
            type="tourist_attraction"
        )
        places_results = response.get("results", [])[:15]
    except Exception as e:
        print(f"Places API error: {e}")
        return {"error": "Failed to fetch places"}

    all_places = []
    for place in places_results:
        try:
            loc = place["geometry"]["location"]
            name = place.get("name")
            lat = float(loc["lat"])
            lng = float(loc["lng"])
            type_ = place.get("types", ["Unknown"])[0]
            if name and lat and lng:
                all_places.append({"name": name, "type": type_, "lat": lat, "lng": lng})
        except Exception as e:
            print(f"Skipping place: {e}")

    quest_data = generate_filtered_quest_payload(all_places, moods, time_limit)
    filtered_places = quest_data["filtered_places"]
    difficulty = quest_data["difficulty"]

    if len(filtered_places) < 2:
        return {"error": "Filtered results too low. Try different moods."}

    origin = f"{filtered_places[0]['lat']},{filtered_places[0]['lng']}"
    destination = f"{filtered_places[-1]['lat']},{filtered_places[-1]['lng']}"
    waypoints = [f"{p['lat']},{p['lng']}" for p in filtered_places[1:-1]]

    try:
        directions = gmaps.directions(
            origin,
            destination,
            waypoints=waypoints,
            optimize_waypoints=True,
            mode="walking"
        )
    except Exception as e:
        print(f"Directions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve directions")

    route = directions[0]
    waypoint_order = route.get("waypoint_order", [])
    legs = route.get("legs", [])
    polyline = route.get("overview_polyline", {}).get("points", "")

    ordered_places = [filtered_places[0]] + [filtered_places[i+1] for i in waypoint_order] + [filtered_places[-1]]

    places_summary = ", ".join([p["name"] for p in ordered_places])
    prompt = f"""Write a short and fun quest (3–5 sentences max) for exploring {city}. Style: {', '.join(moods)}. Include 3–5 specific local places from this list: {places_summary}. Format as a single paragraph. No titles, no list items. Avoid repetition. Be playful."""

    try:
        completion = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a quest designer for a real-world RPG."},
                {"role": "user", "content": prompt}
            ]
        )
        quest_text = completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"OpenAI error: {e}")
        return {"error": "Failed to generate quest text."}

    route_legs = []
    for leg in legs:
        route_legs.append({
            "start": leg["start_address"],
            "end": leg["end_address"],
            "distance": leg["distance"]["text"],
            "duration": leg["duration"]["text"]
        })

    quest_obj = {
        "questText": quest_text,
        "places": ordered_places,
        "difficulty": difficulty,
        "route": {
            "legs": route_legs,
            "polyline": polyline,
            "total_distance": route["legs"][-1]["distance"]["text"],
            "total_duration": route["legs"][-1]["duration"]["text"]
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    save_quest_to_firestore(hash_key, quest_obj)
    return {"quest": quest_obj}





def _to_value(val):
    if val is None:
        return {"nullValue": None}
    if isinstance(val, bool):
        return {"booleanValue": val}
    if isinstance(val, int):
        return {"integerValue": str(val)}
    if isinstance(val, float):
        return {"doubleValue": val}
    if isinstance(val, str):
        return {"stringValue": val}
    if isinstance(val, list):
        return {"arrayValue": {"values": [_to_value(v) for v in val]}}
    if isinstance(val, dict):
        return {"mapValue": {"fields": {k: _to_value(v) for k, v in val.items()}}}
    return {"stringValue": str(val)}

def _encode_fields(data: dict):
    return {k: _to_value(v) for k, v in data.items()}

def _from_value(val):
    if "nullValue" in val:
        return None
    if "booleanValue" in val:
        return val["booleanValue"]
    if "integerValue" in val:
        return int(val["integerValue"])
    if "doubleValue" in val:
        return float(val["doubleValue"])
    if "stringValue" in val:
        return val["stringValue"]
    if "arrayValue" in val:
        return [
            _from_value(v) for v in val.get("arrayValue", {}).get("values", [])
        ]
    if "mapValue" in val:
        return {
            k: _from_value(v)
            for k, v in val.get("mapValue", {}).get("fields", {}).items()
        }
    return val

def _decode_document(doc: dict) -> dict:
    return {k: _from_value(v) for k, v in doc.get("fields", {}).items()}

@app.post("/quest-complete")
async def complete_quest(payload: dict = Body(...)):
    """Finalize a quest and award XP."""
    user_id = payload.get("userId")
    quest_id = payload.get("questId")
    if not user_id or not quest_id:
        return {"error": "userId and questId required"}

    timestamp = datetime.utcnow().isoformat()
    project_id = creds.project_id

    # Quest fields
    quest_doc = {
        "title": payload.get("title"),
        "city": payload.get("city"),
        "mood": payload.get("mood"),
        "difficulty": payload.get("difficulty"),
        "questText": payload.get("questText"),
        "locationList": payload.get("locationList", []),
        "imagePrompt": payload.get("imagePrompt"),
        "imageUrl": payload.get("imageUrl"),
        "visitedIndices": payload.get("visitedIndices", []),
        "completed": True,
        "completedAt": timestamp,
    }

    # Save quest under user_quests/{userId}/quests/{questId}
    quest_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/quests/{quest_id}"
    )
    quest_body = {"fields": _encode_fields(quest_doc)}
    resp = await asyncio.to_thread(rest_session.patch, quest_url, json=quest_body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    # Fetch current user doc
    user_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    )
    resp = await asyncio.to_thread(rest_session.get, user_url)
    user_data = {}
    if resp.status_code == 200:
        user_data = _decode_document(resp.json())

    xp = user_data.get("xp", 0) + 50
    stats = user_data.get("stats", {})
    badges = user_data.get("badges", {})
    stats["totalQuestsCompleted"] = stats.get("totalQuestsCompleted", 0) + 1
    stats["totalXP"] = stats.get("totalXP", 0) + 50

    if stats.get("totalQuestsCompleted", 0) >= 5:
        badges["explorer"] = True

    user_body = {
        "fields": _encode_fields(
            {
                "xp": xp,
                "stats": stats,
                "badges": badges,
                "lastActive": timestamp,
            }
        )
    }
    resp = await asyncio.to_thread(rest_session.patch, user_url, json=user_body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    return {"status": "completed", "newXP": xp, "badges": badges}


    if not all([user_id, quest_id, quest_data]):
        return {"error": "userId, questId and questData required"}

    timestamp = datetime.utcnow().isoformat()
    project_id = creds.project_id

    # === Save quest completion ===
    quest_doc = {
        "userId": user_id,
        "questId": quest_id,
        "questData": quest_data,
        "completedAt": timestamp,
    }
    quest_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{quest_id}"
    )
    quest_body = {"fields": _encode_fields(quest_doc)}
    resp = await asyncio.to_thread(rest_session.patch, quest_url, json=quest_body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    # === Update lastActive ===
    user_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    )
    user_body = {"fields": _encode_fields({"lastActive": timestamp})}
    resp = await asyncio.to_thread(rest_session.patch, user_url, json=user_body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    return {"status": "Quest saved!"}

    timestamp = datetime.utcnow().isoformat()
    project_id = creds.project_id

    # === Save quest completion ===
    quest_doc = {
        "userId": user_id,
        "questId": quest_id,
        "questData": quest_data,
        "completedAt": timestamp,
    }
    quest_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{quest_id}"
    )
    quest_body = {"fields": _encode_fields(quest_doc)}
    resp = await asyncio.to_thread(rest_session.patch, quest_url, json=quest_body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    # === Update lastActive ===
    user_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    )
    user_body = {"fields": _encode_fields({"lastActive": timestamp})}
    resp = await asyncio.to_thread(rest_session.patch, user_url, json=user_body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return {"status": "Quest saved!"}

    # === Save quest completion ===
    quest_doc = {
        "userId": user_id,
        "questId": quest_id,
        "questData": quest_data,
        "completedAt": timestamp,
    }
    quest_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{quest_id}"
    )
    quest_body = {"fields": _encode_fields(quest_doc)}
    resp = await asyncio.to_thread(rest_session.patch, quest_url, json=quest_body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    # === Update lastActive ===
    user_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    )
    user_body = {"fields": _encode_fields({"lastActive": timestamp})}
    resp = await asyncio.to_thread(rest_session.patch, user_url, json=user_body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    return {"status": "Quest saved!"}
  
@app.get("/places")
def get_places(city: str = Query(...)):
    geocode_result = gmaps.geocode(city)
    if not geocode_result:
        return {"error": "City not found"}

    location = geocode_result[0]["geometry"]["location"]

    places_result = gmaps.places_nearby(
        location=(location["lat"], location["lng"]),
        radius=5000,
        type="tourist_attraction"
    )

    place_names = [place['name'] for place in places_result.get('results', [])]
    return {"city": city, "places": place_names}


@app.post("/generate-postcard")
async def generate_postcard(request: Request):
    body = await request.json()
    user_id = body["userId"]
    quest_id = body["questId"]
    city = body["city"]
    mood = body["mood"]
    difficulty = body.get("difficulty", "Medium")

    # 🎨 Prompt for image generation
    prompt = f"A vintage postcard from {city} with a {mood} tone – Difficulty: {difficulty}. Retro art style."

    try:
        # 🧠 Generate image using OpenAI
        dalle_response = openai.Image.create(
            prompt=prompt,
            n=1,
            size="512x512"
        )
        image_url = dalle_response["data"][0]["url"]

        # 💾 Download and re-upload to Firebase Storage
        image_data = requests.get(image_url).content
        filename = f"postcards/{user_id}_{quest_id}.png"

        bucket_name = os.getenv("VITE_FIREBASE_STORAGE_BUCKET") or "your-bucket-name"
        bucket = storage.Client().bucket(bucket_name)
        blob = bucket.blob(filename)
        blob.upload_from_string(image_data, content_type="image/png")
        blob.make_public()

        public_url = blob.public_url

        # 📝 Update Firestore document
        quest_ref = db.collection("user_quests").document(user_id).collection("quests").document(quest_id)
        quest_ref.update({
            "imageUrl": public_url,
            "completed": True,
            "completedAt": firestore.SERVER_TIMESTAMP
        })

        return {"status": "ok", "imageUrl": public_url}

    except Exception as e:
        print("🔥 Error generating postcard:", e)
        return {"status": "error", "message": str(e)}

@app.get("/test-write")
def test_write():
    project_id = creds.project_id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/test/sample"
    )
    body = {"fields": {"message": {"stringValue": "Hello from FastAPI!"}}}
    resp = rest_session.patch(url, json=body)
    if resp.status_code == 200:
        return {"status": "Document written!"}
    print("Firestore REST error", resp.text)
    resp.raise_for_status()

@app.get("/get-user-quests")
async def get_user_quests(userId: str = Query(...)):
    """Return quests for a user sorted by completedAt desc."""
    project_id = creds.project_id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{userId}:runQuery"
    )
    query = {
        "structuredQuery": {
            "from": [{"collectionId": "quests"}],
            "orderBy": [
                {
                    "field": {"fieldPath": "completedAt"},
                    "direction": "DESCENDING",
                }
            ],
        }
    }
    resp = await asyncio.to_thread(rest_session.post, url, json=query)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    raw = resp.json()
    results = []
    for item in raw:
        doc = item.get("document")
        if not doc:
            continue
        obj = _decode_document(doc)
        obj["id"] = doc["name"].split("/")[-1]
        results.append(obj)
    return {"quests": results}


@app.get("/get-quest/{quest_id}")
async def get_quest(quest_id: str):
    """Fetch a quest document via Firestore REST."""
    project_id = creds.project_id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests/{quest_id}"
    )
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return resp.json()


@app.post("/track-visit")
async def track_visit(payload: dict = Body(...)):
    """Update visited quest indices and award XP."""
    user_id = payload.get("userId")
    quest_id = payload.get("questId")
    place_index = payload.get("placeIndex")

    if user_id is None or quest_id is None or place_index is None:
        return {"error": "userId, questId and placeIndex required"}

    project_id = creds.project_id
    quest_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{quest_id}"
    )

    # Fetch existing quest document
    resp = await asyncio.to_thread(rest_session.get, quest_url)
    existing_fields = {}
    if resp.status_code == 200:
        existing_fields = _decode_document(resp.json())

    visited = existing_fields.get("visitedIndices", [])
    new_visit = place_index not in visited
    if new_visit:
        visited.append(place_index)
        visited.sort()
    existing_fields["visitedIndices"] = visited

    # Update quest document
    body = {"fields": _encode_fields(existing_fields)}
    resp = await asyncio.to_thread(rest_session.patch, quest_url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    # ----- XP & Badges -----
    user_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    )
    resp = await asyncio.to_thread(rest_session.get, user_url)
    user_data = {}
    if resp.status_code == 200:
        user_data = _decode_document(resp.json())

    xp = user_data.get("xp", 0)
    stats = user_data.get("stats", {})
    badges = user_data.get("badges", {})

    if new_visit:
        xp += 10
        stats["totalStopsVisited"] = stats.get("totalStopsVisited", 0) + 1
        stats["totalXP"] = stats.get("totalXP", 0) + 10

    if len(visited) == 10:
        badges["adventurer"] = True
    if stats.get("totalQuestsCompleted", 0) >= 5:
        badges["explorer"] = True

    user_body = {"fields": _encode_fields({"xp": xp, "stats": stats, "badges": badges})}
    resp = await asyncio.to_thread(rest_session.patch, user_url, json=user_body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    return {"status": "ok", "visitedIndices": visited, "xp": xp, "badges": badges}


@app.post("/upload-postcard")
async def upload_postcard(payload: dict = Body(...)):
    """Attach postcard image info to quest."""
    user_id = payload.get("userId")
    quest_id = payload.get("questId")
    image_url = payload.get("imageUrl")
    if not all([user_id, quest_id, image_url]):
        return {"error": "userId, questId, and imageUrl required"}
    project_id = creds.project_id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{quest_id}"
    )
    body = {"fields": _encode_fields({"postcardUrl": image_url})}
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return {"status": "postcard uploaded"}


@app.post("/reroll-quest")
async def reroll_quest(payload: dict = Body(...)):
    """Regenerate a quest for the same parameters."""
    city = payload.get("city")
    moods = payload.get("moods", [])
    time_limit = payload.get("time_limit", 60)
    token = payload.get("token", "")
    # Reuse generate_quest logic
    return await generate_quest(city=city, moods=moods, time_limit=time_limit, token=token)


@app.get("/validate-premium/{user_id}")
async def validate_premium(user_id: str):
    """Mock premium validation."""
    return {"premium": True}


@app.post("/get-directions")
async def get_directions(payload: dict = Body(...)):
    """Return mocked directions data for a list of places."""
    places = payload.get("places", [])
    if not isinstance(places, list) or len(places) < 2:
        return {"error": "At least two places required"}

    # Pretend to compute directions. Real API calls are disabled.
    await asyncio.sleep(0)

    return {
        "polyline": "abc123mockedpolyline",
        "legs": [
            {
                "duration": {"text": "10 mins"},
                "start_address": places[0].get("name", "Start"),
                "end_address": places[1].get("name", "Stop 1"),
            },
            {
                "duration": {"text": "12 mins"},
                "start_address": places[1].get("name", "Stop 1"),
                "end_address": places[2].get("name", "Stop 2") if len(places) > 2 else places[1].get("name", "Stop 2"),
            },
        ],
        "totalTime": "22 mins",
    }

