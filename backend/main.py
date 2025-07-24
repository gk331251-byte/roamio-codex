from fastapi import FastAPI, Query, Body, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import requests
import hashlib
from datetime import datetime, timedelta
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
gmaps_key = os.getenv("VITE_GOOGLE_MAPS_API_KEY")
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


def generate_hash_key(*parts: str) -> str:
    """Generate a deterministic cache key from string parts."""
    key_str = "_".join(p.strip().lower() for p in parts if p)
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


def get_cached_place(place_id: str) -> dict | None:
    """Retrieve a cached place with tags."""
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/places_cache/{place_id}"
    resp = rest_session.get(url)
    if resp.status_code == 200:
        return _decode_document(resp.json())
    return None


def save_place_to_cache(place_id: str, data: dict):
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/places_cache/{place_id}"
    body = {"fields": _encode_fields(data)}
    resp = rest_session.patch(url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()


def get_user_preferred_tags(user_id: str) -> list[str]:
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    resp = rest_session.get(url)
    if resp.status_code == 200:
        doc = _decode_document(resp.json())
        if isinstance(doc.get("preferredTags"), list):
            return doc.get("preferredTags")
    return []


CHAIN_KEYWORDS = [
    "starbucks",
    "mcdonald",
    "chipotle",
    "subway",
    "dunkin",
    "walmart",
    "target",
]


def compute_place_tags(place: dict, details: dict | None = None) -> list[str]:
    """Assign tags using simple heuristic rules."""
    tags = set()
    for t in place.get("types", []):
        tags.add(t.replace("_", "-"))
    name = place.get("name", "").lower()
    if any(k in name for k in ["brew", "bar", "tap"]):
        tags.add("bar")
    if any(k in name for k in ["occult", "witch", "dark"]):
        tags.update(["occult", "weird"])
    rating = place.get("rating")
    if isinstance(rating, (int, float)) and rating >= 4.5:
        tags.add("local-fave")
    if details:
        periods = details.get("result", {}).get("opening_hours", {}).get("periods", [])
        for p in periods:
            close = p.get("close", {})
            time = close.get("time")
            if time and int(time[:2]) >= 22:
                tags.add("open-late")
                break
    return list(tags)


def is_chain(name: str) -> bool:
    lower = name.lower()
    return any(k in lower for k in CHAIN_KEYWORDS)


# === Narrative template map for tag-based generation ===
TEMPLATE_MAP = {
    ("weird", "occult"): "Begin your journey into the unknown with these strange and magical stops in [city]: [places].",
    ("romantic", "bookstore", "quiet"): "Take your time drifting through this soft and charming city trail of [places] in [city].",
    ("cheap eats", "bar", "open-late"): "Feast through the night with this budget-friendly adventure across [places] in [city].",
}

def choose_template(tags: list[str]) -> str | None:
    for key, tmpl in TEMPLATE_MAP.items():
        if all(t in tags for t in key):
            return tmpl
    return None

def fill_template(template: str, city: str, mood: str, places: list[dict]) -> str:
    text = template.replace("[city]", city).replace("[mood]", mood)
    text = text.replace("[places]", ", ".join(p["name"] for p in places))
    if places:
        text = text.replace("[firstStop]", places[0]["name"])
        text = text.replace("[lastStop]", places[-1]["name"])
    return text



def get_user_preferred_tags(user_id: str) -> list[str]:
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    resp = rest_session.get(url)
    if resp.status_code == 200:
        doc = _decode_document(resp.json())
        if isinstance(doc.get("preferredTags"), list):
            return doc.get("preferredTags")
    return []


CHAIN_KEYWORDS = [
    "starbucks",
    "mcdonald",
    "chipotle",
    "subway",
    "dunkin",
    "walmart",
    "target",
]


def compute_place_tags(place: dict, details: dict | None = None) -> list[str]:
    """Assign tags using simple heuristic rules."""
    tags = set()
    for t in place.get("types", []):
        tags.add(t.replace("_", "-"))
    name = place.get("name", "").lower()
    if any(k in name for k in ["brew", "bar", "tap"]):
        tags.add("bar")
    if any(k in name for k in ["occult", "witch", "dark"]):
        tags.update(["occult", "weird"])
    rating = place.get("rating")
    if isinstance(rating, (int, float)) and rating >= 4.5:
        tags.add("local-fave")
    if details:
        periods = details.get("result", {}).get("opening_hours", {}).get("periods", [])
        for p in periods:
            close = p.get("close", {})
            time = close.get("time")
            if time and int(time[:2]) >= 22:
                tags.add("open-late")
                break
    return list(tags)


def is_chain(name: str) -> bool:
    lower = name.lower()
    return any(k in lower for k in CHAIN_KEYWORDS)

# === Narrative template map for tag-based generation ===
TEMPLATE_MAP = {
    ("weird", "occult"): "Begin your journey into the unknown with these strange and magical stops in [city]: [places].",
    ("romantic", "bookstore", "quiet"): "Take your time drifting through this soft and charming city trail of [places] in [city].",
    ("cheap eats", "bar", "open-late"): "Feast through the night with this budget-friendly adventure across [places] in [city].",
}

def choose_template(tags: list[str]) -> str | None:
    for key, tmpl in TEMPLATE_MAP.items():
        if all(t in tags for t in key):
            return tmpl
    return None

def fill_template(template: str, city: str, mood: str, places: list[dict]) -> str:
    text = template.replace("[city]", city).replace("[mood]", mood)
    text = text.replace("[places]", ", ".join(p["name"] for p in places))
    if places:
        text = text.replace("[firstStop]", places[0]["name"])
        text = text.replace("[lastStop]", places[-1]["name"])
    return text

# Set up Secret Manager

# Set up Firestore


# Load Google Maps API 

app = FastAPI()

# Manual fallbacks for vague regions
CITY_FALLBACK_MAP = {
    "hudson valley": "New York",
    "catskills": "Albany",
    "poconos": "Philadelphia",
}

# ✅ Replace this with your actual frontend deployed domain
allowed_origins = [
    "http://localhost:5173",  # Vite dev server (local)
    "https://real-quest-frontend.web.app",  # Firebase Hosting / production
    "https://real-world-quest-app.web.app",  # Firebase hosted frontend
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
    moods: list[str] = Body(...),
    time_limit: int = Body(...),
    token: str = Body(...),
    user_id: str | None = Body(None),
    lat: float | None = Body(None),
    lng: float | None = Body(None),
):
    """Generate a quest using tag-based filtering and optional GPT text."""
    if not city or not moods:
        return {"error": "City and mood list are required."}

    preferred = get_user_preferred_tags(user_id) if user_id else []

    usage_count = 0
    user_is_premium = False
    if user_id:
        usage_count = await get_daily_usage(user_id)
        user_is_premium = await check_premium(user_id)
        if not user_is_premium and usage_count >= 3:
            return JSONResponse(status_code=403, content={"error": "Daily quest limit reached"})

    try:
        if lat is not None and lng is not None:
            city_location = {"lat": float(lat), "lng": float(lng)}
        else:
            geocode = gmaps.geocode(city)
            city_location = geocode[0]["geometry"]["location"]
    except Exception as e:
        print(f"Geocoding error: {e}")
        return {"error": "Failed to locate city center."}


    attempts = 0
    fallback_city = None
    selected = []
    while attempts < 2:
        try:
            response = gmaps.places_nearby(
                location=(city_location["lat"], city_location["lng"]),
                radius=2000,
                type="tourist_attraction",
            )
            places_results = response.get("results", [])
        except Exception as e:
            print(f"Places API error: {e}")
            return {"error": "Failed to fetch places"}

        candidates = []
        for place in places_results:
            try:
                name = place.get("name")
                if not name or is_chain(name):
                    continue
                pid = place.get("place_id")
                cached_place = get_cached_place(pid) if pid else None
                details = None
                if not cached_place and pid:
                    try:
                        details = gmaps.place(pid)
                    except Exception:
                        details = None
                tags = (
                    cached_place.get("tags") if cached_place else compute_place_tags(place, details)
                )
                if not cached_place and pid:
                    save_place_to_cache(pid, {"tags": tags, "name": name})
                if preferred:
                    overlap = len(set(tags) & set(preferred))
                else:
                    overlap = 1
                if overlap <= 0:
                    continue
                loc = place["geometry"]["location"]
                typ = place.get("types", ["Unknown"])[0]
                candidates.append({
                    "name": name,
                    "type": typ,
                    "lat": float(loc["lat"]),
                    "lng": float(loc["lng"]),
                    "tags": tags,
                    "score": overlap,
                    "rating": place.get("rating", 0),
                })
            except Exception as e:
                print("Skipping place", e)
        candidates.sort(key=lambda x: (x["score"], x["rating"]), reverse=True)

        selected = []
        seen_types = set()
        for c in candidates:
            if c["type"] in seen_types:
                continue
            selected.append(c)
            seen_types.add(c["type"])
            if len(selected) >= 5:
                break

        if len(selected) >= 3:
            break

        fallback_city = CITY_FALLBACK_MAP.get(city.lower())
        if not fallback_city:
            break
        attempts += 1
        try:
            geo = gmaps.geocode(fallback_city)
            city_location = geo[0]["geometry"]["location"]
            city = fallback_city
        except Exception as e:
            print("Fallback geocode error", e)
            break

    if len(selected) < 3:
        return {"error": "Not enough matching places"}

    loc_hash = f"{city_location['lat']:.2f}_{city_location['lng']:.2f}"
    tag_combo = "-".join(sorted(preferred)) if preferred else "none"
    hash_key = generate_hash_key(loc_hash, "_".join(moods), tag_combo)
    cached = get_cached_quest(hash_key)
    if cached:
        print("Using cached quest")
        result = {"quest": cached}
        if fallback_city:
            result["fallbackCity"] = fallback_city
        return result

    if lat is not None and lng is not None:
        origin = f"{lat},{lng}"
        waypoints = [f"{p['lat']},{p['lng']}" for p in selected[:-1]]
    else:
        origin = f"{selected[0]['lat']},{selected[0]['lng']}"
        waypoints = [f"{p['lat']},{p['lng']}" for p in selected[1:-1]]
    destination = f"{selected[-1]['lat']},{selected[-1]['lng']}"

    try:
        directions = gmaps.directions(
            origin,
            destination,
            waypoints=waypoints,
            optimize_waypoints=True,
            mode="walking",
        )
    except Exception as e:
        print("Directions error", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve directions")

    route = directions[0]
    waypoint_order = route.get("waypoint_order", [])
    legs = route.get("legs", [])
    polyline = route.get("overview_polyline", {}).get("points", "")

    if lat is not None and lng is not None:
        ordered_waypoints = [selected[i] for i in waypoint_order]
        ordered = (
            [{"name": "Your Location", "type": "start", "lat": float(lat), "lng": float(lng), "tags": []}]
            + ordered_waypoints
            + [selected[-1]]
        )
    else:
        ordered = [selected[0]] + [selected[i+1] for i in waypoint_order] + [selected[-1]]
    place_names = ", ".join([p["name"] for p in ordered if p.get("type") != "start"])

    if openai.api_key:
        prompt = (
            f"Write a short playful quest including these places: {place_names}. "
            f"Keep it under 300 tokens. Style: {', '.join(moods)}"
        )
        try:
            completion = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
            )
            quest_text = completion.choices[0].message.content.strip()
        except Exception as e:
            print("OpenAI error", e)
            quest_text = (
                f"Your adventure begins at {ordered[0]['name']}, then heads to {ordered[1]['name']} "
                f"and ends at {ordered[-1]['name']}!"
            )
    else:
        quest_text = (
            f"Your adventure begins at {ordered[0]['name']}, then heads to {ordered[1]['name']} "
            f"and ends at {ordered[-1]['name']}!"
        )

    route_legs = [
        {
            "start": leg["start_address"],
            "end": leg["end_address"],
            "distance": leg["distance"]["text"],
            "duration": leg["duration"]["text"],
        }
        for leg in legs
    ]
    tag_set = set()
    for p in ordered:
        tag_set.update(p.get("tags", []))

    gen_method = "gpt" if openai.api_key else "template"

    quest_obj = {
        "questText": quest_text,
        "places": ordered,
        "difficulty": "Easy",
        "route": {
            "legs": route_legs,
            "polyline": polyline,
            "total_distance": route["legs"][-1]["distance"]["text"],
            "total_duration": route["legs"][-1]["duration"]["text"],
        },
        "timestamp": datetime.utcnow().isoformat(),
        "generationMethod": gen_method,
        "tagSource": "auto",
        "tags": list(tag_set),
        "city": city,
        "mood": ",".join(moods),
        "flagged": False,
    }

    save_quest_to_firestore(hash_key, quest_obj)
    if user_id:
        await increment_daily_usage(user_id)
    result = {"quest": quest_obj}
    if fallback_city:
        result["fallbackCity"] = fallback_city
    return result





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


async def check_premium(user_id: str) -> bool:
    """Return True if the user has premium status."""
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code == 200:
        fields = _decode_document(resp.json())
        return fields.get("premium") is True
    return False


async def get_daily_usage(user_id: str) -> int:
    """Retrieve today's quest generation count for the user."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    project_id = creds.project_id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}/dailyUsage/{today}"
    )
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code == 200:
        doc = _decode_document(resp.json())
        return int(doc.get("count", 0))
    return 0


async def increment_daily_usage(user_id: str) -> int:
    """Increment and return today's quest generation count."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    project_id = creds.project_id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}/dailyUsage/{today}"
    )
    resp = await asyncio.to_thread(rest_session.get, url)
    count = 0
    if resp.status_code == 200:
        doc = _decode_document(resp.json())
        count = int(doc.get("count", 0))
    count += 1
    body = {"fields": _encode_fields({"count": count})}
    await asyncio.to_thread(rest_session.patch, url, json=body)
    return count

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

    if payload.get("public"):
        feed_id = f"{quest_id}_{user_id}"
        feed_doc = {
            "city": payload.get("city"),
            "mood": payload.get("mood"),
            "displayName": payload.get("displayName"),
            "imageUrl": payload.get("imageUrl"),
            "questText": payload.get("questText"),
            "completedAt": timestamp,
            "userId": user_id,
            "questId": quest_id,
            "title": payload.get("title"),
        }
        feed_url = (
            f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/community_quests/{feed_id}"
        )
        feed_body = {"fields": _encode_fields(feed_doc)}
        fr = await asyncio.to_thread(rest_session.patch, feed_url, json=feed_body)
        if fr.status_code != 200:
            print("Firestore REST error", fr.text)
            fr.raise_for_status()

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
        if obj.get("visible") is False or obj.get("flagged") is True:
            continue
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
    lat = payload.get("lat")
    lng = payload.get("lng")
    return await generate_quest(city=city, moods=moods, time_limit=time_limit, token=token, lat=lat, lng=lng)


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


@app.post("/create-group-quest")
async def create_group_quest(payload: dict = Body(...)):
    """Create a shared group quest and set user active state."""
    user_id = payload.get("userId")
    quest_id = payload.get("questId")
    display_name = payload.get("displayName")
    if not user_id or not quest_id:
        return {"error": "userId and questId required"}

    project_id = creds.project_id
    active_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_active_quest/{user_id}"
    active_resp = await asyncio.to_thread(rest_session.get, active_url)
    if active_resp.status_code == 200:
        active_fields = _decode_document(active_resp.json())
        if active_fields.get("status") != "completed":
            return {"error": "active quest already"}

    group_id = hashlib.sha1(f"{user_id}-{quest_id}-{datetime.utcnow()}".encode()).hexdigest()[:8]

    member_entry = {"userId": user_id, "displayName": display_name or user_id}
    group_doc = {
        "questId": quest_id,
        "members": [member_entry],
        "progress": {user_id: []},
        "invitedBy": user_id,
        "completed": False,
        "createdAt": datetime.utcnow().isoformat(),
    }
    group_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/groups/{group_id}"
    body = {"fields": _encode_fields(group_doc)}
    resp = await asyncio.to_thread(rest_session.patch, group_url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    active_doc = {
        "groupId": group_id,
        "questId": quest_id,
        "status": "active",
        "visitedStops": [],
        "startedAt": datetime.utcnow().isoformat(),
    }
    active_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_active_quest/{user_id}"
    active_body = {"fields": _encode_fields(active_doc)}
    await asyncio.to_thread(rest_session.patch, active_url, json=active_body)

    return {"groupId": group_id}


@app.post("/join-group")
async def join_group(payload: dict = Body(...)):
    """Add a user to an existing group quest."""
    user_id = payload.get("userId")
    group_id = payload.get("groupId")
    display_name = payload.get("displayName")
    if not user_id or not group_id:
        return {"error": "userId and groupId required"}

    project_id = creds.project_id
    active_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_active_quest/{user_id}"
    active_resp = await asyncio.to_thread(rest_session.get, active_url)
    if active_resp.status_code == 200:
        active_fields = _decode_document(active_resp.json())
        if active_fields.get("status") != "completed" and active_fields.get("groupId") not in (None, group_id):
            return {"error": "active quest already"}
    group_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/groups/{group_id}"
    resp = await asyncio.to_thread(rest_session.get, group_url)
    if resp.status_code != 200:
        return {"error": "Group not found"}
    fields = _decode_document(resp.json())
    if fields.get("completed"):
        return {"error": "Group completed"}

    members = fields.get("members", [])
    if not any(m.get("userId") == user_id for m in members):
        members.append({"userId": user_id, "displayName": display_name or user_id})
    progress = fields.get("progress", {})
    if user_id not in progress:
        progress[user_id] = []

    fields.update({"members": members, "progress": progress})
    body = {"fields": _encode_fields(fields)}
    await asyncio.to_thread(rest_session.patch, group_url, json=body)

    active_doc = {
        "groupId": group_id,
        "questId": fields.get("questId"),
        "status": "active",
        "visitedStops": progress[user_id],
        "startedAt": datetime.utcnow().isoformat(),
    }
    active_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_active_quest/{user_id}"
    active_body = {"fields": _encode_fields(active_doc)}
    await asyncio.to_thread(rest_session.patch, active_url, json=active_body)

    return {"status": "joined", "questId": fields.get("questId")}


@app.post("/track-stop-visit")
async def track_stop_visit(payload: dict = Body(...)):
    """Track a stop visit for a group quest."""
    group_id = payload.get("groupId")
    user_id = payload.get("userId")
    place_index = payload.get("placeIndex")
    if group_id is None or user_id is None or place_index is None:
        return {"error": "groupId, userId and placeIndex required"}

    project_id = creds.project_id
    group_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/groups/{group_id}"
    resp = await asyncio.to_thread(rest_session.get, group_url)
    if resp.status_code != 200:
        return {"error": "Group not found"}
    fields = _decode_document(resp.json())
    if fields.get("completed"):
        return {"error": "Group completed"}
    if not any(m.get("userId") == user_id for m in fields.get("members", [])):
        return {"error": "Not a group member"}

    progress = fields.get("progress", {})
    user_progress = progress.get(user_id, [])
    if place_index not in user_progress:
        user_progress.append(place_index)
        user_progress.sort()
        progress[user_id] = user_progress
        fields["progress"] = progress
        body = {"fields": _encode_fields(fields)}
        await asyncio.to_thread(rest_session.patch, group_url, json=body)

    active_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_active_quest/{user_id}"
    active_resp = await asyncio.to_thread(rest_session.get, active_url)
    active_fields = {}
    if active_resp.status_code == 200:
        active_fields = _decode_document(active_resp.json())
    active_fields.update({
        "groupId": group_id,
        "questId": fields.get("questId"),
        "status": "active",
        "visitedStops": user_progress,
    })
    active_body = {"fields": _encode_fields(active_fields)}
    await asyncio.to_thread(rest_session.patch, active_url, json=active_body)

    return {"visitedStops": user_progress}


@app.post("/complete-group-quest")
async def complete_group_quest(payload: dict = Body(...)):
    """Mark a group quest as completed by a user."""
    group_id = payload.get("groupId")
    user_id = payload.get("userId")
    if not group_id or not user_id:
        return {"error": "groupId and userId required"}

    project_id = creds.project_id
    group_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/groups/{group_id}"
    resp = await asyncio.to_thread(rest_session.get, group_url)
    if resp.status_code != 200:
        return {"error": "Group not found"}
    fields = _decode_document(resp.json())
    if fields.get("completed"):
        return {"error": "Group already completed"}
    if not any(m.get("userId") == user_id for m in fields.get("members", [])):
        return {"error": "Not a group member"}
    fields["completed"] = True
    body = {"fields": _encode_fields(fields)}
    await asyncio.to_thread(rest_session.patch, group_url, json=body)

    active_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_active_quest/{user_id}"
    active_fields = {
        "groupId": group_id,
        "questId": fields.get("questId"),
        "status": "completed",
    }
    active_body = {"fields": _encode_fields(active_fields)}
    await asyncio.to_thread(rest_session.patch, active_url, json=active_body)

    return {"status": "completed"}


@app.get("/active-quest/{user_id}")
async def get_active_quest(user_id: str):
    """Return the current active quest doc for the user."""
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_active_quest/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        return {}
    active = _decode_document(resp.json())

    quest_ok = True
    if active.get("questId"):
        qurl = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests/{active['questId']}"
        qresp = await asyncio.to_thread(rest_session.get, qurl)
        quest_ok = qresp.status_code == 200

    group_ok = True
    if active.get("groupId"):
        gurl = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/groups/{active['groupId']}"
        gresp = await asyncio.to_thread(rest_session.get, gurl)
        if gresp.status_code != 200:
            group_ok = False
        else:
            gdata = _decode_document(gresp.json())
            group_ok = not gdata.get("completed")

    if not quest_ok or not group_ok:
        await asyncio.to_thread(rest_session.delete, url)
        return {}

    return active


@app.post("/leave-group")
async def leave_group(payload: dict = Body(...)):
    """Remove a user from a group and clear their active quest."""
    user_id = payload.get("userId")
    group_id = payload.get("groupId")
    if not user_id or not group_id:
        return {"error": "userId and groupId required"}

    project_id = creds.project_id
    group_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/groups/{group_id}"
    resp = await asyncio.to_thread(rest_session.get, group_url)
    if resp.status_code == 200:
        fields = _decode_document(resp.json())
        members = [m for m in fields.get("members", []) if m.get("userId") != user_id]
        progress = fields.get("progress", {})
        progress.pop(user_id, None)
        fields.update({"members": members, "progress": progress})
        body = {"fields": _encode_fields(fields)}
        await asyncio.to_thread(rest_session.patch, group_url, json=body)

    active_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_active_quest/{user_id}"
    await asyncio.to_thread(rest_session.delete, active_url)
    return {"status": "left"}


@app.post("/report-quest")
async def report_quest(payload: dict = Body(...)):
    """Receive a quest report and store in Firestore."""
    user_id = payload.get("userId")
    quest_id = payload.get("questId")
    reason = payload.get("reason")
    if not user_id or not quest_id or not reason:
        return {"error": "userId, questId and reason required"}

    project_id = creds.project_id
    doc_id = f"{quest_id}_{user_id}"
    report = {
        "userId": user_id,
        "questId": quest_id,
        "reason": reason,
        "city": payload.get("city"),
        "mood": payload.get("mood"),
        "timestamp": datetime.utcnow().isoformat(),
    }
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quest_reports/{doc_id}"
    body = {"fields": _encode_fields(report)}
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return {"status": "reported"}


@app.get("/get-quest-reports")
async def get_quest_reports():
    """Return recent quest reports for admin review."""
    project_id = creds.project_id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quest_reports:runQuery"
    )
    query = {
        "structuredQuery": {
            "from": [{"collectionId": "quest_reports"}],
            "orderBy": [{"field": {"fieldPath": "timestamp"}, "direction": "DESCENDING"}],
            "limit": 20,
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
    return {"reports": results}


@app.post("/toggle-quest-visibility")
async def toggle_quest_visibility(payload: dict = Body(...)):
    """Hide or show a community quest."""
    quest_id = payload.get("questId")
    user_id = payload.get("userId")
    visible = payload.get("visible", True)
    if not quest_id or not user_id:
        return {"error": "questId and userId required"}

    project_id = creds.project_id
    doc_id = f"{quest_id}_{user_id}"
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/community_quests/{doc_id}"
    body = {"fields": _encode_fields({"visible": visible})}
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return {"status": "updated"}


@app.get("/get-community-quests")
async def get_community_quests():
    """Return recently completed public quests."""
    project_id = creds.project_id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/community_quests:runQuery"
    )
    query = {
        "structuredQuery": {
            "from": [{"collectionId": "community_quests"}],
            "orderBy": [{"field": {"fieldPath": "completedAt"}, "direction": "DESCENDING"}],
            "limit": 20,
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
        if obj.get("visible") is False:
            continue
        obj["id"] = doc["name"].split("/")[-1]
        results.append(obj)
    return {"quests": results}

@app.post("/create-checkout-session")
async def create_checkout_session(payload: dict = Body(...)):
    """Return a Stripe Checkout URL or mock URL."""
    user_id = payload.get("userId")
    email = payload.get("email")
    if not user_id or not email:
        return {"error": "userId and email required"}

    base_url = payload.get("baseUrl", "https://example.com")
    success = f"{base_url}/payment-success?userId={user_id}&session_id={{CHECKOUT_SESSION_ID}}"
    cancel = f"{base_url}/payment-failed"
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if stripe_key:
        try:
            import stripe
            stripe.api_key = stripe_key
            session = await asyncio.to_thread(
                stripe.checkout.Session.create,
                payment_method_types=["card"],
                mode="payment",
                line_items=[{"price": os.getenv("STRIPE_PRICE_ID", "price_123"), "quantity": 1}],
                customer_email=email,
                success_url=success,
                cancel_url=cancel,
            )
            return {"url": session.url}
        except Exception as e:
            print("Stripe error", e)
            return {"error": "stripe failed"}
    # Fallback mock URL
    return {"url": success.replace("{CHECKOUT_SESSION_ID}", "mock")}


@app.get("/validate-premium/{user_id}")
async def validate_premium(user_id: str, session_id: str | None = Query(None)):
    """Check premium flag and optionally verify checkout session."""
    project_id = creds.project_id
    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, user_url)
    fields = {}
    if resp.status_code == 200:
        fields = _decode_document(resp.json())
    premium = fields.get("premium") is True

    if not premium and session_id:
        stripe_key = os.getenv("STRIPE_SECRET_KEY")
        if stripe_key and session_id != "mock":
            try:
                import stripe
                stripe.api_key = stripe_key
                sess = await asyncio.to_thread(stripe.checkout.Session.retrieve, session_id)
                premium = sess.get("payment_status") == "paid"
            except Exception as e:
                print("Stripe verify error", e)
                premium = False
        elif session_id == "mock":
            premium = True
        if premium:
            fields["premium"] = True
            body = {"fields": _encode_fields(fields)}
            await asyncio.to_thread(rest_session.patch, user_url, json=body)

    return {"premium": premium}


@app.post("/update-active-quest")
async def update_active_quest(payload: dict = Body(...)):
    """Patch the user's active quest document with extra data."""
    user_id = payload.get("userId")
    data = payload.get("data")
    if not user_id or not isinstance(data, dict):
        return {"error": "userId and data required"}

    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_active_quest/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    fields = {}
    if resp.status_code == 200:
        fields = _decode_document(resp.json())
    fields.update(data)
    body = {"fields": _encode_fields(fields)}
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return {"status": "updated"}


@app.post("/create-custom-quest")
async def create_custom_quest(payload: dict = Body(...)):
    """Store a manually crafted quest."""
    user_id = payload.get("user_id")
    places = payload.get("places", [])
    print(f"🛠️ Received custom quest request from {user_id}")
    print(f"📦 Payload: {payload}")
    if not user_id or len(places) < 2:
        return {"error": "user_id and at least 2 places required"}

    is_premium = await check_premium(user_id)
    if not is_premium:
        return JSONResponse(status_code=403, content={"error": "Premium required"})

    try:
        project_id = creds.project_id
        quest_id = hashlib.sha1(
            f"{user_id}-{datetime.utcnow()}-{payload.get('title','custom')}".encode()
        ).hexdigest()[:12]

        status = payload.get("status", "draft")
        public = payload.get("public", False)

        quest_doc = {
            "title": payload.get("title") or "Custom Quest",
            "moodTags": payload.get("mood_tags", []),
            "places": places,
            "timeLimit": payload.get("time_limit", 60),
            "customPrompt": payload.get("custom_prompt") or "",
            "createdBy": user_id,
            "createdAt": datetime.utcnow().isoformat(),
            "type": "custom",
            "status": status,
            "public": public,
            "likesCount": 0,
            "viewsCount": 0,
            "replaysCount": 0,
        }
        if status == "published" or public:
            quest_doc["publishedAt"] = datetime.utcnow().isoformat()

        body = {"fields": _encode_fields(quest_doc)}

        user_url = (
            f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{quest_id}"
        )
        resp = await asyncio.to_thread(rest_session.patch, user_url, json=body)
        if resp.status_code != 200:
            print("Firestore REST error", resp.text)
            resp.raise_for_status()

        global_url = (
            f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
        )
        await asyncio.to_thread(rest_session.patch, global_url, json=body)

        group_id = payload.get("group_id")
        if group_id:
            g_url = (
                f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/group_quests/{group_id}/{quest_id}"
            )
            await asyncio.to_thread(rest_session.patch, g_url, json=body)

        return {"questId": quest_id, "quest": quest_doc}
    except Exception as e:
        print("create_custom_quest error", e)
        return JSONResponse(status_code=500, content={"error": "Failed to save custom quest"})


@app.get("/get-custom-quest/{quest_id}")
async def get_custom_quest(quest_id: str):
    """Fetch a custom quest by ID."""
    project_id = creds.project_id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    )
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return resp.json()


@app.post("/publish-custom-quest")
async def publish_custom_quest(payload: dict = Body(...)):
    """Mark a custom quest as public and published."""
    user_id = payload.get("user_id")
    quest_id = payload.get("quest_id")
    if not user_id or not quest_id:
        return {"error": "user_id and quest_id required"}

    project_id = creds.project_id
    patch_fields = {
        "status": "published",
        "public": True,
        "publishedAt": datetime.utcnow().isoformat(),
    }
    body = {"fields": _encode_fields(patch_fields)}

    user_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{quest_id}"
    )
    global_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    )
    for url in (user_url, global_url):
        resp = await asyncio.to_thread(rest_session.patch, url, json=body)
        if resp.status_code != 200:
            print("Firestore REST error", resp.text)
            resp.raise_for_status()

    return {"status": "published"}


@app.post("/like-quest")
async def like_quest(payload: dict = Body(...)):
    """Record a quest like and increment counter."""
    user_id = payload.get("user_id")
    quest_id = payload.get("quest_id")
    if not user_id or not quest_id:
        return {"error": "user_id and quest_id required"}

    project_id = creds.project_id
    like_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quest_likes/{quest_id}/{user_id}"
    )
    body = {"fields": _encode_fields({"timestamp": datetime.utcnow().isoformat()})}
    resp = await asyncio.to_thread(rest_session.patch, like_url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    quest_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    )
    qresp = await asyncio.to_thread(rest_session.get, quest_url)
    if qresp.status_code == 200:
        data = _decode_document(qresp.json())
        count = data.get("likesCount", 0) + 1
        patch = {"fields": _encode_fields({"likesCount": count})}
        await asyncio.to_thread(rest_session.patch, quest_url, json=patch)

    return {"status": "liked"}


@app.post("/view-quest")
async def view_quest(payload: dict = Body(...)):
    """Record a unique quest view."""
    user_id = payload.get("user_id")
    quest_id = payload.get("quest_id")
    if not user_id or not quest_id:
        return {"error": "user_id and quest_id required"}

    project_id = creds.project_id
    view_doc = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quest_views/{quest_id}/{user_id}"
    )
    resp = await asyncio.to_thread(rest_session.get, view_doc)
    if resp.status_code == 404:
        body = {"fields": _encode_fields({"timestamp": datetime.utcnow().isoformat()})}
        await asyncio.to_thread(rest_session.patch, view_doc, json=body)

        quest_url = (
            f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
        )
        qresp = await asyncio.to_thread(rest_session.get, quest_url)
        if qresp.status_code == 200:
            data = _decode_document(qresp.json())
            count = data.get("viewsCount", 0) + 1
            patch = {"fields": _encode_fields({"viewsCount": count})}
            await asyncio.to_thread(rest_session.patch, quest_url, json=patch)

    return {"status": "viewed"}


@app.post("/replay-quest")
async def replay_quest(payload: dict = Body(...)):
    """Increment replay counter for a quest."""
    quest_id = payload.get("quest_id")
    if not quest_id:
        return {"error": "quest_id required"}

    project_id = creds.project_id
    quest_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    )
    qresp = await asyncio.to_thread(rest_session.get, quest_url)
    if qresp.status_code == 200:
        data = _decode_document(qresp.json())
        count = data.get("replaysCount", 0) + 1
        patch = {"fields": _encode_fields({"replaysCount": count})}
        await asyncio.to_thread(rest_session.patch, quest_url, json=patch)

    return {"status": "replayed"}


@app.post("/create-community-group")
async def create_community_group(payload: dict = Body(...)):
    """Create a new community group."""
    name = payload.get("name")
    creator = payload.get("creator")
    if not name or not creator:
        return {"error": "name and creator required"}

    project_id = creds.project_id
    group_id = hashlib.sha1(f"{name}-{datetime.utcnow()}".encode()).hexdigest()[:10]
    doc = {
        "name": name,
        "creator": creator,
        "description": payload.get("description", ""),
        "tags": payload.get("tags", []),
        "imageUrl": payload.get("imageUrl", ""),
        "members": [creator],
        "linked_quests": [],
        "createdAt": datetime.utcnow().isoformat(),
    }
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/community_groups/{group_id}"
    )
    body = {"fields": _encode_fields(doc)}
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return {"groupId": group_id}


@app.post("/join-community-group")
async def join_community_group(payload: dict = Body(...)):
    group_id = payload.get("group_id")
    user_id = payload.get("user_id")
    if not group_id or not user_id:
        return {"error": "group_id and user_id required"}

    project_id = creds.project_id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/community_groups/{group_id}"
    )
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        return {"error": "group not found"}
    data = _decode_document(resp.json())
    members = data.get("members", [])
    if user_id not in members:
        members.append(user_id)
        data["members"] = members
        body = {"fields": _encode_fields(data)}
        await asyncio.to_thread(rest_session.patch, url, json=body)
    return {"status": "joined"}


@app.post("/link-quest-to-group")
async def link_quest_to_group(payload: dict = Body(...)):
    group_id = payload.get("group_id")
    quest_id = payload.get("quest_id")
    upcoming = payload.get("upcoming", False)
    if not group_id or not quest_id:
        return {"error": "group_id and quest_id required"}

    project_id = creds.project_id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/community_groups/{group_id}"
    )
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        return {"error": "group not found"}
    data = _decode_document(resp.json())
    linked = data.get("linked_quests", [])
    if quest_id not in linked:
        linked.append(quest_id)
    if upcoming:
        data["upcoming_quest"] = quest_id
    data["linked_quests"] = linked
    body = {"fields": _encode_fields(data)}
    await asyncio.to_thread(rest_session.patch, url, json=body)
    return {"status": "linked"}

@app.get("/audit-quest-cache")
async def audit_quest_cache():
    """Return quests with overly long or malformed text."""
    project_id = creds.project_id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests:runQuery"
    )
    query = {"structuredQuery": {"from": [{"collectionId": "quests"}]}}
    resp = await asyncio.to_thread(rest_session.post, url, json=query)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    flagged = []
    for item in resp.json():
        doc = item.get("document")
        if not doc:
            continue
        data = _decode_document(doc)
        text = data.get("questText", "") or ""
        reason = None
        if not text:
            reason = "missing"
        elif len(text) > 600:
            reason = "too_long"
        elif text.count("NPC") > 3 or "???" in text:
            reason = "malformed"
        if reason:
            flagged.append({"id": doc["name"].split("/")[-1], "reason": reason})
    print("Audit results", flagged)
    return {"flagged": flagged}


@app.post("/rebuild-quest-cache")
async def rebuild_quest_cache(payload: dict = Body(...)):
    """Regenerate a quest using templates and optional tag overrides."""
    city = payload.get("city")
    mood = payload.get("mood")
    override = payload.get("tagOverride", [])
    if not city or not mood:
        return {"error": "city and mood required"}

    try:
        geocode = gmaps.geocode(city)
        city_loc = geocode[0]["geometry"]["location"]
    except Exception as e:
        print("geocode error", e)
        return {"error": "geocode failed"}

    try:
        resp = gmaps.places_nearby(
            location=(city_loc["lat"], city_loc["lng"]),
            radius=2000,
            type="tourist_attraction",
        )
        places_results = resp.get("results", [])
    except Exception as e:
        print("places error", e)
        return {"error": "places failed"}

    candidates = []
    for pl in places_results:
        name = pl.get("name")
        if not name or is_chain(name):
            continue
        pid = pl.get("place_id")
        cached = get_cached_place(pid) if pid else None
        details = None
        if not cached and pid:
            try:
                details = gmaps.place(pid)
            except Exception:
                details = None
        tags = cached.get("tags") if cached else compute_place_tags(pl, details)
        if not cached and pid:
            save_place_to_cache(pid, {"tags": tags, "name": name})
        loc = pl["geometry"]["location"]
        candidates.append({
            "name": name,
            "type": pl.get("types", ["Unknown"])[0],
            "lat": float(loc["lat"]),
            "lng": float(loc["lng"]),
            "tags": tags,
            "rating": pl.get("rating", 0),
        })

    # simple sort by rating
    candidates.sort(key=lambda x: x["rating"], reverse=True)

    selected = []
    seen = set()
    for c in candidates:
        if c["type"] in seen:
            continue
        selected.append(c)
        seen.add(c["type"])
        if len(selected) >= 5:
            break

    if len(selected) < 3:
        return {"error": "not enough places"}

    origin = f"{selected[0]['lat']},{selected[0]['lng']}"
    destination = f"{selected[-1]['lat']},{selected[-1]['lng']}"
    waypoints = [f"{p['lat']},{p['lng']}" for p in selected[1:-1]]

    try:
        directions = gmaps.directions(
            origin,
            destination,
            waypoints=waypoints,
            optimize_waypoints=True,
            mode="walking",
        )
    except Exception as e:
        print("directions error", e)
        return {"error": "directions failed"}

    route = directions[0]
    order = route.get("waypoint_order", [])
    legs = route.get("legs", [])
    polyline = route.get("overview_polyline", {}).get("points", "")

    ordered = [selected[0]] + [selected[i+1] for i in order] + [selected[-1]]

    tag_set = set(override) if override else set()
    if not override:
        for p in ordered:
            tag_set.update(p.get("tags", []))

    template = choose_template(list(tag_set))
    if not template:
        template = "Explore [city] on a [mood] adventure through [places]."

    quest_text = fill_template(template, city, mood, ordered)

    legs_info = [
        {
            "start": l["start_address"],
            "end": l["end_address"],
            "distance": l["distance"]["text"],
            "duration": l["duration"]["text"],
        }
        for l in legs
    ]

    quest_obj = {
        "questText": quest_text,
        "places": ordered,
        "route": {"legs": legs_info, "polyline": polyline},
        "timestamp": datetime.utcnow().isoformat(),
        "generationMethod": "template",
        "tagSource": "manual" if override else "auto",
        "tags": list(tag_set),
        "city": city,
        "mood": mood,
        "flagged": False,
    }

    loc_hash = f"{city_loc['lat']:.2f}_{city_loc['lng']:.2f}"
    tag_combo = "-".join(sorted(tag_set))
    hash_key = generate_hash_key(loc_hash, mood, tag_combo)
    save_quest_to_firestore(hash_key, quest_obj)
    return {"quest": quest_obj, "hash": hash_key}

@app.get("/search-quests")
async def search_quests(query: str = Query(...), user_id: str | None = None):
    """Search public and user quests by simple keyword matching."""
    tokens = [t.lower() for t in query.split() if t]
    project_id = creds.project_id
    results = {"public": [], "custom": [], "user": []}

    def _matches(obj: dict) -> bool:
        hay = " ".join([
            str(obj.get("city", "")),
            str(obj.get("mood", "")),
            " ".join(obj.get("tags", [])),
            str(obj.get("title", "")),
        ]).lower()
        return any(tok in hay for tok in tokens)

    # community quests
    cq_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/community_quests:runQuery"
    )
    cq_query = {
        "structuredQuery": {
            "from": [{"collectionId": "community_quests"}],
            "orderBy": [{"field": {"fieldPath": "completedAt"}, "direction": "DESCENDING"}],
            "limit": 20,
        }
    }
    resp = await asyncio.to_thread(rest_session.post, cq_url, json=cq_query)
    if resp.status_code == 200:
        for item in resp.json():
            doc = item.get("document")
            if not doc:
                continue
            data = _decode_document(doc)
            if _matches(data) and not data.get("flagged"):
                data["id"] = doc["name"].split("/")[-1]
                results["public"].append(data)

    # custom quests (published)
    cust_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests:runQuery"
    )
    cust_query = {
        "structuredQuery": {
            "from": [{"collectionId": "custom_quests"}],
            "where": {
                "fieldFilter": {
                    "field": {"fieldPath": "public"},
                    "op": "EQUAL",
                    "value": {"booleanValue": True},
                }
            },
            "limit": 20,
        }
    }
    resp = await asyncio.to_thread(rest_session.post, cust_url, json=cust_query)
    if resp.status_code == 200:
        for item in resp.json():
            doc = item.get("document")
            if not doc:
                continue
            data = _decode_document(doc)
            if _matches(data):
                data["id"] = doc["name"].split("/")[-1]
                results["custom"].append(data)

    # user quests
    if user_id:
        uq_url = (
            f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}:runQuery"
        )
        uq_query = {"structuredQuery": {"from": [{"collectionId": "quests"}], "limit": 20}}
        resp = await asyncio.to_thread(rest_session.post, uq_url, json=uq_query)
        if resp.status_code == 200:
            for item in resp.json():
                doc = item.get("document")
                if not doc:
                    continue
                data = _decode_document(doc)
                if _matches(data):
                    data["id"] = doc["name"].split("/")[-1]
                    results["user"].append(data)

    return results


@app.post("/replay-quest")
async def replay_quest(payload: dict = Body(...)):
    """Save a quest copy to the user and increment replay count."""
    quest_id = payload.get("quest_id")
    user_id = payload.get("user_id")
    if not quest_id or not user_id:
        return {"error": "quest_id and user_id required"}

    project_id = creds.project_id
    quest_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    resp = await asyncio.to_thread(rest_session.get, quest_url)
    if resp.status_code != 200:
        quest_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests/{quest_id}"
        resp = await asyncio.to_thread(rest_session.get, quest_url)
        if resp.status_code != 200:
            return {"error": "quest not found"}
    quest_data = _decode_document(resp.json())

    if "replaysCount" in quest_data:
        count = quest_data.get("replaysCount", 0) + 1
        patch = {"fields": _encode_fields({"replaysCount": count})}
        await asyncio.to_thread(rest_session.patch, quest_url, json=patch)

    new_id = hashlib.sha1(f"{user_id}-{datetime.utcnow()}-{quest_id}".encode()).hexdigest()[:12]
    user_doc = {
        "questIdRef": quest_id,
        "generatedAt": datetime.utcnow().isoformat(),
        "questData": quest_data,
    }
    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{new_id}"
    body = {"fields": _encode_fields(user_doc)}
    await asyncio.to_thread(rest_session.patch, user_url, json=body)

    return {"quest": quest_data, "userQuestId": new_id}


@app.post("/remix-quest")
async def remix_quest(payload: dict = Body(...)):
    """Generate a new quest from existing tags and save to user quests."""
    location = payload.get("location")
    mood = payload.get("mood")
    tags = payload.get("tagList", [])
    user_id = payload.get("user_id")
    if not location or not mood or not user_id:
        return {"error": "location, mood, and user_id required"}

    rebuilt = await rebuild_quest_cache({"city": location, "mood": mood, "tagOverride": tags})
    quest = rebuilt.get("quest")
    quest_id = rebuilt.get("hash")

    user_doc = {
        "questIdRef": quest_id,
        "generatedAt": datetime.utcnow().isoformat(),
        "questData": quest,
    }
    project_id = creds.project_id
    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{quest_id}"
    body = {"fields": _encode_fields(user_doc)}
    await asyncio.to_thread(rest_session.patch, user_url, json=body)

    return {"quest": quest, "userQuestId": quest_id}

@app.post("/create-community")
async def create_community(payload: dict = Body(...)):
    """Create a new community document."""
    name = payload.get("name")
    owner_id = payload.get("ownerId")
    if not name or not owner_id:
        return {"error": "name and ownerId required"}

    description = payload.get("description", "")
    tags = payload.get("tags", [])
    is_public = bool(payload.get("isPublic", True))

    community_id = hashlib.sha1(f"{owner_id}-{name}-{datetime.utcnow()}".encode()).hexdigest()[:12]
    created_at = datetime.utcnow().isoformat()

    doc = {
        "name": name,
        "description": description,
        "tags": tags,
        "isPublic": is_public,
        "ownerId": owner_id,
        "createdAt": created_at,
        "followerCount": 1,
        "memberIds": [owner_id],
        "questRefs": [],
        "analytics": {},
    }
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/communities/{community_id}"
    body = {"fields": _encode_fields(doc)}
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{owner_id}/joinedCommunities/{community_id}"
    join_doc = {"communityId": community_id, "joinedAt": created_at}
    join_body = {"fields": _encode_fields(join_doc)}
    await asyncio.to_thread(rest_session.patch, user_url, json=join_body)

    return {"communityId": community_id}


@app.post("/join-community")
async def join_community(payload: dict = Body(...)):
    user_id = payload.get("userId")
    community_id = payload.get("communityId")
    if not user_id or not community_id:
        return {"error": "userId and communityId required"}

    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/communities/{community_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        return {"error": "community not found"}
    data = _decode_document(resp.json())
    members = data.get("memberIds", [])
    updated = False
    if user_id not in members:
        members.append(user_id)
        data["memberIds"] = members
        data["followerCount"] = int(data.get("followerCount", 0)) + 1
        updated = True
    if updated:
        body = {"fields": _encode_fields(data)}
        await asyncio.to_thread(rest_session.patch, url, json=body)

    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}/joinedCommunities/{community_id}"
    join_doc = {"communityId": community_id, "joinedAt": datetime.utcnow().isoformat()}
    join_body = {"fields": _encode_fields(join_doc)}
    await asyncio.to_thread(rest_session.patch, user_url, json=join_body)

    return {"status": "joined"}


@app.post("/publish-to-community")
async def publish_to_community(payload: dict = Body(...)):
    community_id = payload.get("communityId")
    quest_id = payload.get("questId")
    if not community_id or not quest_id:
        return {"error": "communityId and questId required"}

    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/communities/{community_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        return {"error": "community not found"}
    data = _decode_document(resp.json())
    refs = data.get("questRefs", [])
    if quest_id not in refs:
        refs.append(quest_id)
        data["questRefs"] = refs
        body = {"fields": _encode_fields(data)}
        await asyncio.to_thread(rest_session.patch, url, json=body)

    return {"status": "published"}


@app.get("/community/{community_id}")
async def get_community(community_id: str):
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/communities/{community_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        return {"error": "community not found"}
    data = _decode_document(resp.json())
    quests = []
    for qid in data.get("questRefs", []):
        qurl = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{qid}"
        qresp = await asyncio.to_thread(rest_session.get, qurl)
        if qresp.status_code != 200:
            qurl = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests/{qid}"
            qresp = await asyncio.to_thread(rest_session.get, qurl)
            if qresp.status_code != 200:
                continue
        qdata = _decode_document(qresp.json())
        qdata["id"] = qid
        quests.append(qdata)
    return {"community": data, "quests": quests}


@app.get("/community-trending")
async def community_trending():
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/communities:runQuery"
    query = {
        "structuredQuery": {
            "from": [{"collectionId": "communities"}],
            "where": {
                "fieldFilter": {
                    "field": {"fieldPath": "isPublic"},
                    "op": "EQUAL",
                    "value": {"booleanValue": True},
                }
            },
            "orderBy": [{"field": {"fieldPath": "followerCount"}, "direction": "DESCENDING"}],
            "limit": 10,
        }
    }
    resp = await asyncio.to_thread(rest_session.post, url, json=query)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    results = []
    for item in resp.json():
        doc = item.get("document")
        if not doc:
            continue
        data = _decode_document(doc)
        data["id"] = doc["name"].split("/")[-1]
        results.append(data)
    return {"communities": results}

async def _verify_admin(user_id: str) -> bool:
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code == 200:
        data = _decode_document(resp.json())
        return data.get("isAdmin") is True
    return False


@app.get("/admin/dashboard")
async def admin_dashboard(userId: str = Query(...)):
    if not await _verify_admin(userId):
        return JSONResponse(status_code=403, content={"error": "Access denied"})

    project_id = creds.project_id
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # quests today
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents:runQuery"
    query = {
        "structuredQuery": {
            "from": [{"collectionId": "quests", "allDescendants": True}],
            "where": {
                "fieldFilter": {
                    "field": {"fieldPath": "generatedAt"},
                    "op": "GREATER_THAN_OR_EQUAL",
                    "value": {"stringValue": today},
                }
            },
        }
    }
    resp = await asyncio.to_thread(rest_session.post, url, json=query)
    quests_today = sum(1 for x in resp.json() if x.get("document"))

    # completions last 7 days and active users
    seven_days = (datetime.utcnow() - timedelta(days=6)).strftime("%Y-%m-%d")
    comp_query = {
        "structuredQuery": {
            "from": [{"collectionId": "quests", "allDescendants": True}],
            "where": {
                "fieldFilter": {
                    "field": {"fieldPath": "completedAt"},
                    "op": "GREATER_THAN_OR_EQUAL",
                    "value": {"stringValue": seven_days},
                }
            },
        }
    }
    comp_resp = await asyncio.to_thread(rest_session.post, url, json=comp_query)
    daily = {}
    users = {}
    for item in comp_resp.json():
        doc = item.get("document")
        if not doc:
            continue
        data = _decode_document(doc)
        day = data.get("completedAt", "")[:10]
        daily[day] = daily.get(day, 0) + 1
        parts = doc["name"].split("/")
        if "user_quests" in parts:
            uid = parts[parts.index("user_quests") + 1]
            users[uid] = users.get(uid, 0) + 1

    # total users
    users_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users:runQuery"
    all_users = await asyncio.to_thread(rest_session.post, users_url, json={"structuredQuery": {"from": [{"collectionId": "users"}]}})
    total_users = sum(1 for i in all_users.json() if i.get("document"))

    # top cities
    quests_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests:runQuery"
    q_resp = await asyncio.to_thread(rest_session.post, quests_url, json={"structuredQuery": {"from": [{"collectionId": "quests"}]}})
    cities = {}
    moods = {}
    diff = {}
    for item in q_resp.json():
        doc = item.get("document")
        if not doc:
            continue
        data = _decode_document(doc)
        city = data.get("city", "unknown")
        mood = data.get("mood")
        difficulty = data.get("difficulty")
        if city:
            cities[city] = cities.get(city, 0) + 1
        if mood:
            for m in str(mood).split(","):
                moods[m] = moods.get(m, 0) + 1
        if difficulty:
            diff[difficulty] = diff.get(difficulty, 0) + 1

    top_cities = sorted(cities.items(), key=lambda x: x[1], reverse=True)[:5]
    top_moods = sorted(moods.items(), key=lambda x: x[1], reverse=True)[:5]

    reports_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/reports:runQuery"
    rep_query = {
        "structuredQuery": {
            "from": [{"collectionId": "reports"}],
            "where": {
                "fieldFilter": {
                    "field": {"fieldPath": "resolved"},
                    "op": "EQUAL",
                    "value": {"booleanValue": False},
                }
            },
        }
    }
    rep_resp = await asyncio.to_thread(rest_session.post, reports_url, json=rep_query)
    reports = []
    for item in rep_resp.json():
        doc = item.get("document")
        if not doc:
            continue
        data = _decode_document(doc)
        data["id"] = doc["name"].split("/")[-1]
        reports.append(data)

    stats = {
        "questsToday": quests_today,
        "dailyCompletions": daily,
        "topCities": top_cities,
        "activeUsers": sorted(users.items(), key=lambda x: x[1], reverse=True)[:5],
        "totalUsers": total_users,
        "topMoods": top_moods,
        "difficultyBreakdown": diff,
        "totalReports": len(reports),
    }

    return {"stats": stats, "reports": reports}


@app.post("/admin/resolve-report")
async def admin_resolve_report(payload: dict = Body(...)):
    user_id = payload.get("userId")
    report_id = payload.get("reportId")
    if not await _verify_admin(user_id):
        return JSONResponse(status_code=403, content={"error": "Access denied"})
    if not report_id:
        return {"error": "reportId required"}
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/reports/{report_id}"
    patch = {"fields": _encode_fields({"resolved": True})}
    await asyncio.to_thread(rest_session.patch, url, json=patch)
    return {"status": "resolved"}


@app.post("/admin/delete-quest")
async def admin_delete_quest(payload: dict = Body(...)):
    user_id = payload.get("userId")
    quest_id = payload.get("questId")
    qtype = payload.get("type", "standard")
    if not await _verify_admin(user_id):
        return JSONResponse(status_code=403, content={"error": "Access denied"})
    if not quest_id:
        return {"error": "questId required"}
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/{'custom_quests' if qtype=='custom' else 'quests'}/{quest_id}"
    await asyncio.to_thread(rest_session.delete, url)
    return {"status": "deleted"}


@app.post("/admin/ban-user")
async def admin_ban_user(payload: dict = Body(...)):
    user_id = payload.get("userId")
    target_id = payload.get("targetId")
    if not await _verify_admin(user_id):
        return JSONResponse(status_code=403, content={"error": "Access denied"})
    if not target_id:
        return {"error": "targetId required"}
    project_id = creds.project_id
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{target_id}"
    patch = {"fields": _encode_fields({"banned": True})}
    await asyncio.to_thread(rest_session.patch, url, json=patch)
    return {"status": "banned"}
