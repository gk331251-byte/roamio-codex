# emotion_utils.py

from typing import List, Dict, Any

# Define the preferred types per emotion
MOOD_PREFERENCES = {
    "adventurous": ["hike", "trail", "museum", "tourist_attraction", "stadium", "aquarium"],
    "chill": ["park", "cafe", "bookstore", "aquarium", "shopping_mall"],
    "romantic": ["restaurant", "art_gallery", "scenic_view", "park", "museum"],
    "mystery": ["cemetery", "historic_site", "alley", "museum"],
    "cozy": ["cafe", "bookstore", "park", "shopping_mall"],
    "historic": ["museum", "tourist_attraction", "cemetery", "historic_site", "church"],
    "spiritual": ["church", "temple", "cemetery", "garden"],
    "creative": ["art_gallery", "bookstore", "street_art", "museum"],
    "outdoorsy": ["park", "hike", "trail", "scenic_view", "aquarium"],
    "quirky": ["oddity_shop", "bar", "street_art", "shopping_mall"],
}


def score_place(place: Dict[str, Any], selected_moods: List[str]) -> int:
    """
    Returns a score from 0+ based on how relevant a place is to selected moods.
    """
    score = 0
    place_type = place.get("type", "").lower()

    for mood in selected_moods:
        prefs = MOOD_PREFERENCES.get(mood, [])
        if place_type in prefs:
            score += 2
        elif any(p in place_type for p in prefs):  # Partial match
            score += 1

    return score


def filter_and_score_places(places: List[Dict[str, Any]], selected_moods: List[str], max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Filters and scores a list of places based on emotion preferences.
    """
    scored = []
    for place in places:
        score = score_place(place, selected_moods)
        if score >= 2:
            scored.append({**place, "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:max_results]


def calculate_difficulty(num_places: int, time_limit: int, moods: List[str]) -> str:
    """
    Estimate quest difficulty based on count, time, and mood context.
    """
    if num_places >= 5 and time_limit >= 120:
        return "Hard"
    if num_places >= 4 and time_limit >= 90:
        return "Medium"
    return "Easy"


def generate_filtered_quest_payload(all_places: List[Dict[str, Any]], moods: List[str], time_limit: int) -> Dict[str, Any]:
    """
    Full flow: filters places, scores them, and returns structured payload.
    """
    filtered = filter_and_score_places(all_places, moods)
    difficulty = calculate_difficulty(len(filtered), time_limit, moods)

    return {
        "filtered_places": filtered,
        "difficulty": difficulty,
        "mood_summary": moods,
        "place_names": [p.get("name", "Unnamed") for p in filtered]
    }
