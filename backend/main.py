from fastapi import FastAPI, Query, Body, Request
import os 
import requests
from google.cloud import firestore
from google.cloud import secretmanager
import googlemaps
import openai
from fastapi.middleware.cors import CORSMiddleware
import hashlib
from google.cloud import firestore
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, Body
from emotion_utils import generate_filtered_quest_payload
load_dotenv()

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")




# Firestore setup
db = firestore.Client()

def generate_hash_key(city, mood):
    key_str = f"{city.strip().lower()}_{mood.strip().lower()}"
    return hashlib.sha256(key_str.encode()).hexdigest()

def get_cached_quest(hash_key):
    doc_ref = db.collection("quests").document(hash_key)
    doc = doc_ref.get()
    if doc.exists:
        return doc.to_dict()
    return None

def save_quest_to_firestore(hash_key, quest_obj):
    doc_ref = db.collection("quests").document(hash_key)
    doc_ref.set(quest_obj)




# Set up Secret Manager
def get_secret(secret_id):
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/366325378414/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

# Set up Firestore
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "firestore-key.json"
db = firestore.Client()

# Load Google Maps API Key
gmaps_api_key = get_secret("places-api-key")
gmaps = googlemaps.Client(key=gmaps_api_key)

# Load OpenAI API Key
openai_api_key = get_secret("openai-api-key")
openai.api_key = openai_api_key

app = FastAPI()

# ✅ Replace this with your actual frontend deployed domain
allowed_origins = [
    "http://localhost:5173",  # Vite dev server (local)
    "https://real-quest-frontend.web.app"  # Firebase Hosting / production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # or ["*"] for dev only
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





@app.post("/quest-complete")
def complete_quest(user_id: str = Body(...), quest_id: str = Body(...)):
    user_quest_ref = db.collection("user_quests").document(user_id).collection("completed").document(quest_id)
    user_quest_ref.set({"completed": True, "timestamp": firestore.SERVER_TIMESTAMP})
    quest_ref = db.collection("quests").document(quest_id)
    quest_ref.update({"usageCount": firestore.Increment(1)})
    return {"status": "Quest marked as completed"}

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

        bucket_name = get_secret("firebase-storage-bucket")  # or hardcode if needed
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
    doc_ref = db.collection("test").document("sample")
    doc_ref.set({"message": "Hello from FastAPI!"})
    return {"status": "Document written!"}
