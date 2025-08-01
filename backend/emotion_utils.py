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
    "weird": ["cemetery", "historic_site", "museum", "oddity_shop", "art_gallery"],
    "foodie": ["restaurant", "cafe", "bar", "shopping_mall"],
    "cultural": ["museum", "art_gallery", "tourist_attraction", "church", "historic_site"],
    "nature": ["park", "hike", "trail", "scenic_view", "aquarium"],
}

# Intelligent mood fallback hierarchy
MOOD_FALLBACKS = {
    "weird": ["quirky", "mystery", "creative"],
    "quirky": ["creative", "adventurous", "chill"],
    "mystery": ["historic", "creative", "chill"],
    "romantic": ["cozy", "creative", "chill"],
    "adventurous": ["outdoorsy", "cultural", "chill"],
    "outdoorsy": ["nature", "adventurous", "chill"],
    "foodie": ["cozy", "romantic", "chill"],
    "cultural": ["historic", "creative", "chill"],
    "historic": ["cultural", "spiritual", "chill"],
    "spiritual": ["historic", "nature", "chill"],
    "creative": ["cultural", "quirky", "chill"],
    "cozy": ["romantic", "chill"],
    "nature": ["outdoorsy", "spiritual", "chill"],
    "chill": [],  # Base fallback - no further fallbacks
}

# Location type intelligence
LOCATION_INTELLIGENCE = {
    "urban": {
        "preferred_moods": ["cultural", "foodie", "creative", "quirky", "romantic"],
        "radius_multiplier": 1.0,
        "place_types": ["restaurant", "museum", "art_gallery", "bar", "shopping_mall"]
    },
    "suburban": {
        "preferred_moods": ["cozy", "romantic", "chill", "foodie"],
        "radius_multiplier": 1.5,
        "place_types": ["park", "restaurant", "shopping_mall", "cafe", "bookstore"]
    },
    "rural": {
        "preferred_moods": ["nature", "outdoorsy", "spiritual", "chill"],
        "radius_multiplier": 2.0,
        "place_types": ["park", "hike", "trail", "scenic_view", "church"]
    }
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


def get_mood_fallbacks(original_moods: List[str]) -> List[List[str]]:
    """
    Generate intelligent fallback mood sequences for when insufficient places are found.
    Returns a list of mood combinations to try in order.
    """
    fallback_sequences = []
    
    # Try each original mood's fallbacks
    for mood in original_moods:
        mood_lower = mood.lower()
        if mood_lower in MOOD_FALLBACKS:
            for fallback in MOOD_FALLBACKS[mood_lower]:
                fallback_combo = [fallback] + [m for m in original_moods if m.lower() != mood_lower]
                if fallback_combo not in fallback_sequences:
                    fallback_sequences.append(fallback_combo)
    
    # Add progressive broadening fallbacks
    broad_fallbacks = [
        ["adventurous", "chill"],
        ["cultural", "chill"], 
        ["chill"],  # Ultimate fallback
    ]
    
    for fallback in broad_fallbacks:
        if fallback not in fallback_sequences:
            fallback_sequences.append(fallback)
    
    return fallback_sequences


def detect_location_type(places_results: List[Dict[str, Any]], population_density: str = None) -> str:
    """
    Detect if location is urban, suburban, or rural based on available places.
    """
    if not places_results:
        return "rural"
    
    # Count urban indicators
    urban_types = {"restaurant", "bar", "shopping_mall", "subway_station", "bus_station"}
    nature_types = {"park", "trail", "natural_feature", "campground"}
    
    urban_count = sum(1 for place in places_results 
                     for place_type in place.get("types", []) 
                     if place_type in urban_types)
    
    nature_count = sum(1 for place in places_results 
                      for place_type in place.get("types", []) 
                      if place_type in nature_types)
    
    total_places = len(places_results)
    
    if urban_count / total_places > 0.6:
        return "urban"
    elif nature_count / total_places > 0.4:
        return "rural"
    else:
        return "suburban"


def determine_quest_type(place_count: int, time_limit: int, moods: List[str]) -> Dict[str, Any]:
    """
    Determine appropriate quest type based on available places and constraints.
    """
    if place_count >= 3:
        return {
            "type": "Standard Quest",
            "description": f"A complete {time_limit}-minute adventure visiting {place_count} unique locations",
            "places_needed": min(place_count, 5)
        }
    elif place_count == 2:
        return {
            "type": "Mini Quest",
            "description": f"A focused {time_limit}-minute journey between 2 special places",
            "places_needed": 2
        }
    elif place_count == 1:
        return {
            "type": "Deep Dive",
            "description": f"An immersive {time_limit}-minute exploration of one amazing location",
            "places_needed": 1
        }
    else:
        return {
            "type": "Discovery Quest",
            "description": "Let us help you discover what makes this area special",
            "places_needed": 1
        }


def calculate_adaptive_radius(base_radius: int, location_type: str, attempt: int, time_limit: int) -> int:
    """
    Calculate intelligent radius based on location type, attempt number, and time constraints.
    """
    # Get location intelligence
    location_info = LOCATION_INTELLIGENCE.get(location_type, LOCATION_INTELLIGENCE["suburban"])
    multiplier = location_info["radius_multiplier"]
    
    # Progressive expansion: 2km → 5km → 10km
    radius_steps = [2000, 5000, 10000]
    if attempt < len(radius_steps):
        base = radius_steps[attempt]
    else:
        base = 15000  # Final fallback
    
    # Adjust for location type
    adjusted = int(base * multiplier)
    
    # Adjust for time constraints - longer time allows wider search
    if time_limit >= 180:  # 3+ hours
        adjusted = int(adjusted * 1.5)
    elif time_limit <= 60:  # 1 hour or less
        adjusted = int(adjusted * 0.8)
    
    return min(adjusted, 50000)  # Cap at 50km


def generate_smart_fallback_message(original_moods: List[str], fallback_moods: List[str], 
                                  radius: int, quest_type: str) -> str:
    """
    Generate user-friendly message explaining the adaptation.
    """
    messages = []
    
    if fallback_moods != original_moods:
        original_str = ", ".join(original_moods)
        fallback_str = ", ".join(fallback_moods)
        messages.append(f"We adapted your {original_str} mood to {fallback_str} for better local options")
    
    if radius > 2000:
        radius_km = radius / 1000
        messages.append(f"Expanded search area to {radius_km:.0f}km to find great places")
    
    if quest_type != "Standard Quest":
        messages.append(f"Created a {quest_type} perfectly suited to available locations")
    
    if not messages:
        messages.append("Found perfect matches for your preferences!")
    
    return " • ".join(messages)


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
