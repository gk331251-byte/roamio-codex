import asyncio
import hashlib
import logging
import os
import sys
import traceback
from datetime import datetime, timedelta
from typing import Any, List

import certifi
import firebase_admin
import googlemaps
import openai
import requests
import uvicorn
from dotenv import load_dotenv
from fastapi import Body, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from firebase_admin import auth as fb_auth
from google.cloud import firestore_v1, storage

# Boot messages
print("🔥 booted")
print("🔥 Starting backend.main")

# Import security validation system with fallback
try:
    from security_validator import (
        InputValidator,
        SecurityMiddleware,
        SecurityValidationError,
        validate_input,
    )
    SECURITY_VALIDATOR_AVAILABLE = True
    print("✅ security_validator imported successfully")
except ImportError as e:
    print(f"⚠️ Security validator not available: {e}")
    # Create dummy classes for compatibility
    class InputValidator:
        def __init__(self, strict_mode=True):
            pass
        def validate_quest_request(self, data):
            return data
        def sanitize_string(self, value, max_length=None):
            return str(value)[:max_length] if max_length else str(value)
    
    class SecurityMiddleware:
        def __init__(self, validator=None):
            pass
    
    class SecurityValidationError(Exception):
        pass
    
    def validate_input(input_type, value, **kwargs):
        return value
    
    SECURITY_VALIDATOR_AVAILABLE = False

# Import session management system
from session_manager import (
    SessionInfo,
    SessionManager,
    SessionMiddleware,
    create_user_session,
    db_transaction,
    execute_db_transaction,
    execute_with_session_management,
    get_user_session,
    session_context,
    session_manager,
)

# Load environment variables early
load_dotenv()
os.environ["SSL_CERT_FILE"] = certifi.where()

# Add paths for container deployment
if "/app" not in sys.path:
    sys.path.insert(0, "/app")

# Import auth_utils after setting up paths
try:
    from backend.auth_utils import PROJECT_ID, get_rest_session, load_api_keys
    from backend.emotion_utils import (
        LOCATION_INTELLIGENCE,
        calculate_adaptive_radius,
        detect_location_type,
        determine_quest_type,
        filter_and_score_places,
        generate_smart_fallback_message,
        get_mood_fallbacks,
    )
except ImportError:
    from auth_utils import PROJECT_ID, get_rest_session, load_api_keys
    from emotion_utils import (
        LOCATION_INTELLIGENCE,
        calculate_adaptive_radius,
        detect_location_type,
        determine_quest_type,
        filter_and_score_places,
        generate_smart_fallback_message,
        get_mood_fallbacks,
    )


app = FastAPI(title="Roamio Backend API", version="1.0.0")

# Add CORS middleware with enhanced configuration for production and development
allowed_origins = [
    # Production domains
    "https://real-world-quest-app.web.app",
    "https://real-world-quest-app.firebaseapp.com",
    # Development domains
    os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
    "http://localhost:5174",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# Allow all origins in development, specific origins in production
is_development = os.getenv("ENVIRONMENT", "development") == "development"
cors_origins = ["*"] if is_development else allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add session management middleware
app.add_middleware(SessionMiddleware)


# Startup and shutdown events for session management
@app.on_event("startup")
async def startup_event():
    """Initialize session management on startup."""
    try:
        await session_manager.start()
        logging.info("🚀 Session management started successfully")
    except Exception as e:
        logging.error(f"❌ Failed to start session management: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup session management on shutdown."""
    try:
        await session_manager.shutdown()
        logging.info("🛑 Session management shutdown completed")
    except Exception as e:
        logging.error(f"❌ Error during session management shutdown: {e}")


# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests for debugging."""
    logger = logging.getLogger(__name__)
    logger.info(f"🌐 {request.method} {request.url} - Headers: {dict(request.headers)}")
    response = await call_next(request)
    logger.info(f"📤 Response: {response.status_code}")
    return response


# Configure structured logging for startup diagnostics
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
    ],
)

# Global startup health tracking
startup_health = {
    "startup_time": None,
    "critical_services_ready": False,
    "services_status": {},
    "startup_errors": [],
    "startup_warnings": [],
}

print("🔐 Loading API keys and credentials...")

# Load API keys from Cloud Run secrets or environment variables
try:
    load_api_keys()
    print("✅ API keys loaded from secrets/environment")
except Exception as e:
    print(f"⚠️ Failed to load API keys: {e}")

# Initialize Google Maps early
gmaps = None
gmaps_key = os.environ.get("GOOGLE_MAPS_API_KEY")
if gmaps_key:
    try:
        gmaps = googlemaps.Client(key=gmaps_key, timeout=10)
        print("✅ Google Maps Client initialized")
    except Exception as e:
        print(f"❌ Google Maps init failed: {e}")
        gmaps = None
else:
    print("❌ GOOGLE_MAPS_API_KEY not found")

# Initialize OpenAI early
openai_key = os.environ.get("OPENAI_API_KEY")
if openai_key and openai_key.startswith("sk-"):
    openai.api_key = openai_key
    print("✅ OpenAI API key set")
else:
    print("⚠️ OpenAI API key not found or invalid")

# Initialize Firebase Admin early
try:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
        print("✅ Firebase Admin initialized")
except Exception as e:
    print(f"❌ Firebase Admin init failed: {e}")

print("✅ Backend initialization complete!")


@app.on_event("startup")
async def startup_event():
    """Comprehensive startup diagnostics and health checks."""
    global startup_health
    logger = logging.getLogger(__name__)

    startup_health["startup_time"] = datetime.utcnow().isoformat()

    print("\n" + "=" * 60)
    print("🚀 ROAMIO BACKEND STARTUP DIAGNOSTICS")
    print("=" * 60)

    # Track overall health
    health_checks = []
    critical_failures = []
    warnings = []

    # 1. Environment and Path Diagnostics
    logger.info("🔍 Environment Diagnostics:")
    logger.info(f"   Working Directory: {os.getcwd()}")
    logger.info(f"   Python Version: {sys.version}")
    logger.info(
        f"   Environment: {'Cloud Run' if '/app' in sys.path else 'Local Development'}"
    )

    # 2. Google Cloud Credentials Validation
    logger.info("🔐 Google Cloud Credentials Check:")
    try:
        session = get_rest_session()

        if session:
            logger.info("   ✅ Firestore REST session initialized successfully")
            logger.info(f"   ✅ Project ID: {PROJECT_ID}")

            # Test actual Firestore connectivity
            try:
                test_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
                test_resp = await asyncio.to_thread(session.get, test_url)
                if test_resp.status_code in [
                    200,
                    403,
                ]:  # 403 means authenticated but no permission
                    logger.info("   ✅ Firestore connectivity test passed")
                    health_checks.append("firestore_connection")
                else:
                    logger.error(
                        f"   ❌ Firestore connectivity test failed: HTTP {test_resp.status_code}"
                    )
                    critical_failures.append("firestore_connection")
            except Exception as e:
                logger.error(f"   ❌ Firestore connectivity test error: {str(e)}")
                critical_failures.append("firestore_connection")

        else:
            logger.error("   ❌ Firestore REST session initialization failed")
            logger.error(
                "   💡 Check Google Cloud credentials and service account permissions"
            )
            critical_failures.append("firestore_session")

    except Exception as e:
        logger.error(f"   ❌ Google Cloud setup error: {str(e)}")
        critical_failures.append("gcloud_setup")

    # 3. Google Maps API Validation
    logger.info("🗺️  Google Maps API Check:")
    if gmaps:
        try:
            # Test geocoding with a simple query
            test_geocode = gmaps.geocode("New York, NY")
            if test_geocode and len(test_geocode) > 0:
                logger.info("   ✅ Google Maps API working (geocoding test passed)")
                health_checks.append("google_maps")
            else:
                logger.warning(
                    "   ⚠️ Google Maps API responding but geocoding test failed"
                )
                warnings.append("google_maps_geocoding")
        except Exception as e:
            logger.error(f"   ❌ Google Maps API test failed: {str(e)}")
            critical_failures.append("google_maps")
    else:
        logger.warning(
            "   ⚠️ Google Maps API not initialized - check GOOGLE_MAPS_API_KEY"
        )
        warnings.append("google_maps_missing")

    # 4. OpenAI API Validation
    logger.info("🤖 OpenAI API Check:")
    if openai.api_key:
        logger.info("   ✅ OpenAI API key configured")
        health_checks.append("openai_configured")
        # Note: We don't test OpenAI on startup to avoid quota usage
    else:
        logger.warning(
            "   ⚠️ OpenAI API key not configured - quest narratives will use fallback"
        )
        warnings.append("openai_missing")

    # 5. Firebase Admin SDK Check
    logger.info("🔥 Firebase Admin SDK Check:")
    try:
        if firebase_admin._apps:
            logger.info("   ✅ Firebase Admin SDK initialized")

            # Test token verification (without actual token)
            logger.info("   ✅ Firebase Auth ready for token verification")
            health_checks.append("firebase_admin")
        else:
            logger.error("   ❌ Firebase Admin SDK not initialized")
            critical_failures.append("firebase_admin")
    except Exception as e:
        logger.error(f"   ❌ Firebase Admin SDK error: {str(e)}")
        critical_failures.append("firebase_admin")

    # 6. API Keys Security Check
    logger.info("🔒 Security Configuration Check:")
    sensitive_vars = ["GOOGLE_MAPS_API_KEY", "OPENAI_API_KEY"]
    for var in sensitive_vars:
        value = os.environ.get(var)
        if value:
            logger.info(f"   ✅ {var}: Configured (***{value[-4:]})")
        else:
            logger.info(f"   ⚠️ {var}: Not configured")

    # 7. Database Module Dependencies Check
    logger.info("📦 Module Dependencies Check:")
    module_status = {
        "auth_utils": False,
        "firestore_utils": False,
        "group_utils": False,
        "emotion_utils": False,
        "stripe_utils": False,
    }

    for module_name in module_status.keys():
        try:
            __import__(module_name)
            logger.info(f"   ✅ {module_name}: Available")
            module_status[module_name] = True
        except ImportError:
            logger.warning(f"   ⚠️ {module_name}: Import failed - using stubs")

    # 8. Startup Summary
    print("\n" + "=" * 60)
    print("📊 STARTUP HEALTH SUMMARY")
    print("=" * 60)

    logger.info(f"✅ Services Ready: {len(health_checks)}")
    for check in health_checks:
        logger.info(f"   • {check}")

    if warnings:
        logger.info(f"⚠️  Warnings: {len(warnings)}")
        for warning in warnings:
            logger.info(f"   • {warning}")

    if critical_failures:
        logger.error(f"❌ Critical Issues: {len(critical_failures)}")
        for failure in critical_failures:
            logger.error(f"   • {failure}")

        if (
            "firestore_session" in critical_failures
            or "gcloud_setup" in critical_failures
        ):
            logger.error("🚨 CRITICAL: Database connectivity failed!")
            logger.error("   Quest generation for authenticated users will fail")
            logger.error(
                "   Please check Google Cloud credentials and service account permissions"
            )

    # Overall health status
    if len(critical_failures) == 0:
        logger.info("🎉 STARTUP COMPLETE - All critical services ready!")
        startup_health["critical_services_ready"] = True
    elif len(critical_failures) <= 2:
        logger.warning("⚠️  STARTUP COMPLETE - Some services degraded but functional")
        startup_health["critical_services_ready"] = False
    else:
        logger.error("🚨 STARTUP COMPLETE - Multiple critical failures detected!")
        startup_health["critical_services_ready"] = False

    # Store results for health endpoint
    startup_health["services_status"] = {
        "ready": health_checks,
        "warnings": warnings,
        "critical_failures": critical_failures,
    }
    startup_health["startup_errors"] = critical_failures
    startup_health["startup_warnings"] = warnings

    print("=" * 60 + "\n")


# Health check endpoint for Cloud Run
@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration."""
    current_time = datetime.utcnow().isoformat()

    # For Cloud Run health checks, we need to be less strict
    # The server should be considered healthy if core services are working
    critical_failures = startup_health.get("startup_errors", [])
    services_ready = startup_health.get("services_status", {}).get("ready", [])

    # Consider healthy if we have Firebase Admin working (core auth service)
    # Firestore connection issues shouldn't fail health checks in dev/test environments
    has_core_services = "firebase_admin" in services_ready
    firestore_only_failure = critical_failures == ["firestore_connection"]

    if (
        startup_health.get("critical_services_ready")
        or has_core_services
        or firestore_only_failure
    ):
        return {
            "status": "healthy",
            "timestamp": current_time,
            "startup_time": startup_health.get("startup_time"),
            "services": startup_health.get("services_status", {}),
            "uptime_seconds": (
                (
                    datetime.utcnow()
                    - datetime.fromisoformat(
                        startup_health.get("startup_time", current_time)
                    )
                ).total_seconds()
                if startup_health.get("startup_time")
                else 0
            ),
            "environment": (
                "development" if not os.path.exists("/secrets") else "production"
            ),
        }
    else:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": current_time,
                "startup_time": startup_health.get("startup_time"),
                "services": startup_health.get("services_status", {}),
                "errors": startup_health.get("startup_errors", []),
                "warnings": startup_health.get("startup_warnings", []),
                "environment": (
                    "development" if not os.path.exists("/secrets") else "production"
                ),
            },
        )


@app.get("/")
async def root():
    """Root endpoint to confirm the API is running."""
    return {
        "message": "Roamio Backend API is running",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/ping")
async def ping() -> dict[str, Any]:
    """Test route to verify REST session is usable."""
    session = get_rest_session()
    try:
        resp = await asyncio.to_thread(session.get, "https://example.com")
        upstream = resp.status_code
    except Exception:
        upstream = None
    return {"status": "ok", "upstream_status": upstream}


@app.get("/openai-status")
async def openai_status():
    """Get OpenAI usage statistics and safety status."""
    try:
        from openai_safety import openai_safety_manager

        stats = openai_safety_manager.get_usage_stats()
        return {
            "status": "operational",
            "usage_stats": stats,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


# Debug path information
print(f"🔍 Python path: {sys.path}")
print(f"🔍 Current working directory: {os.getcwd()}")
print(
    f"🔍 Contents of /app: {os.listdir('/app') if os.path.exists('/app') else 'Not found'}"
)

print(
    f"🔍 Contents of /app/backend: {os.listdir('/app/backend') if os.path.exists('/app/backend') else 'Not found'}"
)

# Use centralized session from backend.auth_utils
# `rest_session` imported above is initialized in backend.auth_utils


# Replace with this safe import block:
print("🔧 Loading backend modules...")

# Safe imports with error handling
try:
    from emotion_utils import generate_filtered_quest_payload

    print("✅ emotion_utils loaded")
except Exception as e:
    print(f"⚠️ emotion_utils failed: {e}")

    def generate_filtered_quest_payload(*args, **kwargs):
        return {}


try:
    from stripe_utils import create_subscription_session, verify_webhook

    print("✅ stripe_utils loaded")
except Exception as e:
    print(f"⚠️ stripe_utils failed: {e}")

    def create_subscription_session(*args, **kwargs):
        raise NotImplementedError("Stripe not available")

    def verify_webhook(*args, **kwargs):
        raise NotImplementedError("Stripe not available")


try:
    from backend.auth_utils import (
        check_not_banned,
        is_premium_user,
        require_admin,
        require_user,
        sanitize_input,
        verify_token,
    )

    print("✅ auth_utils functions loaded")
except Exception as e:
    print(f"⚠️ auth_utils functions failed: {e}")

    # Create stub functions
    async def is_premium_user(uid):
        return False

    async def verify_token(token):
        return None

    async def require_user(request):
        raise HTTPException(401, "Auth disabled")

    async def require_admin(uid):
        raise HTTPException(403, "Auth disabled")

    async def check_not_banned(uid):
        return uid


def is_age_restricted(name, tags):
    """Check if a place is age-restricted (21+)."""
    if not name or not tags:
        return False

    name_lower = name.lower()

    # Check for age-restricted tags
    restricted_tags = {"bar", "night-club", "liquor-store", "brewery", "winery"}
    if any(tag in tags for tag in restricted_tags):
        return True

    # Check for age-restricted keywords in name
    restricted_keywords = [
        "bar",
        "pub",
        "brewery",
        "winery",
        "club",
        "lounge",
        "tavern",
    ]
    if any(keyword in name_lower for keyword in restricted_keywords):
        return True

    return False


def sanitize_input(text):
    """Legacy sanitize function - use security_validator for new code."""
    try:
        validator = InputValidator()
        return validator.sanitize_string(str(text), max_length=1000)
    except SecurityValidationError:
        # Fallback to basic sanitization if security validation fails
        return str(text).strip()


try:
    from backend.firestore_utils import get_custom_quest as fs_get_custom_quest
    from backend.firestore_utils import (
        query_custom_quests_by_creator,
        write_custom_quest,
    )

    print("✅ firestore_utils loaded")
except Exception as e:
    print(f"⚠️ firestore_utils failed: {e}")

    # Create stub functions
    async def write_custom_quest(data, uid):
        raise NotImplementedError("Firestore not available")

    async def fs_get_custom_quest(quest_id):
        return None

    async def query_custom_quests_by_creator(creator_id, public_only=False):
        return []


try:
    from backend.group_utils import add_user_to_group, create_group_document

    print("✅ group_utils loaded")
except Exception as e:
    print(f"⚠️ group_utils failed: {e}")

    # Create stub functions
    async def create_group_document(user_id, quest_id, display_name):
        raise NotImplementedError("Group utils not available")

    async def add_user_to_group(user_id, group_id, display_name):
        raise NotImplementedError("Group utils not available")


print("🔧 Backend modules loading complete")


#
# ----- XP & Level Helpers -----
# Each level is reached every 1000 XP. Pre-generate a list so we can
# easily look up the next threshold when returning quest results.
LEVEL_THRESHOLDS = [i * 1000 for i in range(1, 101)]  # supports up to level 100

BADGE_CATALOG = {
    "first_quest": {
        "id": "first_quest",
        "name": "First Explorer",
        "description": "Complete your first quest",
        "icon": "🗺️",
        "criteria": {"type": "questCount", "value": 1},
    },
    "level_3": {
        "id": "level_3",
        "name": "Bronze Path",
        "description": "Reach Level 3",
        "icon": "🥉",
        "criteria": {"type": "level", "value": 3},
    },
    "level_6": {
        "id": "level_6",
        "name": "Silver Path",
        "description": "Reach Level 6",
        "icon": "🥈",
        "criteria": {"type": "level", "value": 6},
    },
    "foodie": {
        "id": "foodie",
        "name": "Foodie Crawl",
        "description": "Complete 3 food-themed quests",
        "icon": "🍜",
        "criteria": {"type": "moodCount", "mood": "Foodie", "value": 3},
    },
    "explorer": {
        "id": "explorer",
        "name": "Explorer",
        "description": "Complete 5 quests",
        "icon": "🧭",
        "criteria": {"type": "questCount", "value": 5},
    },
    "adventurer": {
        "id": "adventurer",
        "name": "Adventurer",
        "description": "Visit 10 stops",
        "icon": "🎒",
        "criteria": {"type": "stopCount", "value": 10},
    },
    "hardcore": {
        "id": "hardcore",
        "name": "Hardcore",
        "description": "Complete a Hard quest",
        "icon": "💀",
        "type": "difficulty",
    },
    "streak-7": {
        "id": "streak-7",
        "name": "Flame Keeper",
        "description": "Maintain a 7-day streak",
        "icon": "🔥",
        "type": "streak",
    },
    "explorer-5": {
        "id": "explorer-5",
        "name": "City Explorer",
        "description": "Complete quests in 5 cities",
        "icon": "🌆",
        "type": "exploration",
    },
    "squad-player": {
        "id": "squad-player",
        "name": "Squad Player",
        "description": "Complete a group quest with 3+ members",
        "icon": "👥",
        "type": "group",
    },
    "quest-10": {
        "id": "quest-10",
        "name": "Veteran",
        "description": "Complete 10 quests",
        "icon": "🏅",
        "type": "milestone",
    },
}


def get_level_from_xp(xp: int) -> int:
    """Return user level based on total XP using 1000 XP per level."""
    try:
        xp_val = int(xp)
    except Exception:
        xp_val = 0
    return xp_val // 1000


def parse_ts(ts: str) -> datetime | None:
    """Parse ISO timestamp to datetime (UTC)."""
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", ""))
    except Exception:
        return None


def calculate_age(dob_str: str) -> int:
    """Return age in years from YYYY-MM-DD string."""
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
        today = datetime.utcnow().date()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age
    except Exception:
        return 0


def compute_badge_unlocks(stats: dict, level: int, existing: list) -> list:
    """Return list of newly unlocked badge IDs."""
    try:
        logging.info(
            f"Computing badge unlocks for level {level} with {len(stats)} stats"
        )

        if not isinstance(stats, dict):
            logging.warning(f"Invalid stats type: {type(stats)}, using empty dict")
            stats = {}

        if not isinstance(level, int) or level < 0:
            logging.warning(f"Invalid level: {level}, using 0")
            level = 0

        unlocked = set(existing or [])
        new = []

        for badge in BADGE_CATALOG.values():
            try:
                bid = badge.get("id")
                if not bid:
                    logging.warning("Badge missing id field, skipping")
                    continue

                if bid in unlocked:
                    continue

                crit = badge.get("criteria", {})
                btype = crit.get("type")
                val = crit.get("value", 0)

                if (
                    btype == "questCount"
                    and stats.get("totalQuestsCompleted", 0) >= val
                ):
                    unlocked.add(bid)
                    new.append(bid)
                elif btype == "level" and level >= val:
                    unlocked.add(bid)
                    new.append(bid)
                elif btype == "moodCount":
                    key = f"{crit.get('mood','').lower()}Quests"
                    if stats.get(key, 0) >= val:
                        unlocked.add(bid)
                        new.append(bid)
                elif btype == "stopCount" and stats.get("totalStopsVisited", 0) >= val:
                    unlocked.add(bid)
                    new.append(bid)

            except Exception as e:
                logging.error(
                    f"Error processing badge {badge.get('id', 'unknown')}: {e}"
                )
                continue

        logging.info(f"Computed {len(new)} new badge unlocks")
        return new

    except Exception as e:
        logging.error(f"Error in compute_badge_unlocks: {e}")
        return []


# === Load .env variables (if running locally) ===
load_dotenv()

# === Set up trusted certs for HTTPS (esp. in Codex) ===
os.environ["SSL_CERT_FILE"] = certifi.where()

if "CODEX_PROXY_URL" in os.environ:
    os.environ["HTTPS_PROXY"] = os.environ["CODEX_PROXY_URL"]
    os.environ["HTTP_PROXY"] = os.environ["CODEX_PROXY_URL"]

# === Load API keys from env (Codex-compatible) ===
#
if not gmaps:
    try:
        gmaps_key = os.environ.get("GOOGLE_MAPS_API_KEY")
        if gmaps_key:
            gmaps = googlemaps.Client(key=gmaps_key, timeout=10)
            print("✅ Google Maps Client initialized (fallback)")
        else:
            print("❌ No Google Maps key for fallback init")
            gmaps = None
    except Exception as e:
        print("Google Maps fallback disabled:", e)
        gmaps = None
openai_key = os.getenv("OPENAI_API_KEY")
if openai_key and openai_key.startswith("sk-"):
    openai.api_key = openai_key
else:
    openai.api_key = None

# === Initialize Firestore using REST transport to avoid gRPC SSL issues ===

db = None
try:
    db = firestore_v1.Client(
        client_options={"api_endpoint": "https://firestore.googleapis.com"}
    )
    print("✅ Firestore client initialized")
except Exception as e:
    print(f"⚠️ Firestore client initialization failed: {e}")
    print("⚠️ Some Firestore features will be disabled")
    db = None

# Use centralized session and PROJECT_ID from backend.auth_utils
# (Already imported above)


def generate_hash_key(*parts: str) -> str:
    """Generate a deterministic cache key from string parts."""
    key_str = "_".join(p.strip().lower() for p in parts if p)
    return hashlib.sha256(key_str.encode()).hexdigest()


def get_cached_quest(hash_key):
    """Retrieve a cached quest from Firestore."""
    try:
        logging.info(f"Fetching cached quest with key: {hash_key}")

        if not hash_key:
            logging.warning("Empty hash key provided")
            return None

        project_id = PROJECT_ID
        url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests/{hash_key}"

        rest_session = get_rest_session()
        resp = rest_session.get(url)

        if resp.status_code == 200:
            logging.info(f"Successfully retrieved cached quest: {hash_key}")
            return _decode_document(resp.json())
        elif resp.status_code == 404:
            logging.info(f"Quest not found in cache: {hash_key}")
            return None
        else:
            logging.warning(
                f"Unexpected status code {resp.status_code} for quest {hash_key}: {resp.text}"
            )
            return None

    except requests.RequestException as e:
        logging.error(f"Network error fetching cached quest {hash_key}: {e}")
        return None
    except Exception as e:
        logging.error(f"Error fetching cached quest {hash_key}: {e}")
        return None


def save_quest_to_firestore(hash_key, quest_obj):
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests/{hash_key}"
    body = {"fields": _encode_fields(quest_obj)}
    rest_session = get_rest_session()
    response = rest_session.patch(url, json=body)
    if response.status_code != 200:
        print("Firestore REST Error:", response.text)
        response.raise_for_status()


def get_cached_place(place_id: str) -> dict | None:
    """Retrieve a cached place with tags."""
    try:
        logging.info(f"Fetching cached place: {place_id}")

        if not place_id:
            logging.warning("Empty place_id provided")
            return None

        project_id = PROJECT_ID
        url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/places_cache/{place_id}"

        rest_session = get_rest_session()
        resp = rest_session.get(url)

        if resp.status_code == 200:
            logging.info(f"Successfully retrieved cached place: {place_id}")
            return _decode_document(resp.json())
        elif resp.status_code == 404:
            logging.info(f"Place not found in cache: {place_id}")
            return None
        else:
            logging.warning(
                f"Unexpected status code {resp.status_code} for place {place_id}: {resp.text}"
            )
            return None

    except requests.RequestException as e:
        logging.error(f"Network error fetching cached place {place_id}: {e}")
        return None
    except Exception as e:
        logging.error(f"Error fetching cached place {place_id}: {e}")
        return None


def save_place_to_cache(place_id: str, data: dict):
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/places_cache/{place_id}"
    body = {"fields": _encode_fields(data)}
    rest_session = get_rest_session()
    resp = rest_session.patch(url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()


def get_user_preferred_tags(user_id: str) -> list[str]:
    """Retrieve user's preferred tags from Firestore."""
    try:
        logging.info(f"Fetching preferred tags for user: {user_id}")

        if not user_id:
            logging.warning("Empty user_id provided")
            return []

        project_id = PROJECT_ID
        url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"

        rest_session = get_rest_session()
        resp = rest_session.get(url)

        if resp.status_code == 200:
            doc = _decode_document(resp.json())
            preferred_tags = doc.get("preferredTags", [])

            if isinstance(preferred_tags, list):
                logging.info(
                    f"Retrieved {len(preferred_tags)} preferred tags for user {user_id}"
                )
                return preferred_tags
            else:
                logging.warning(
                    f"Invalid preferredTags format for user {user_id}: {type(preferred_tags)}"
                )
                return []
        elif resp.status_code == 404:
            logging.info(f"User not found: {user_id}")
            return []
        else:
            logging.warning(
                f"Unexpected status code {resp.status_code} for user {user_id}: {resp.text}"
            )
            return []

    except requests.RequestException as e:
        logging.error(f"Network error fetching preferred tags for user {user_id}: {e}")
        return []
    except Exception as e:
        logging.error(f"Error fetching preferred tags for user {user_id}: {e}")
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
    try:
        logging.info(f"Computing tags for place: {place.get('name', 'unknown')}")

        if not isinstance(place, dict):
            logging.warning(f"Invalid place type: {type(place)}")
            return []

        tags = set()

        # Process place types
        try:
            for t in place.get("types", []):
                if isinstance(t, str):
                    tags.add(t.replace("_", "-"))
        except Exception as e:
            logging.warning(f"Error processing place types: {e}")

        # Process place name
        try:
            name = place.get("name", "").lower()
            if isinstance(name, str):
                if any(k in name for k in ["brew", "bar", "tap"]):
                    tags.add("bar")
                if any(k in name for k in ["occult", "witch", "dark"]):
                    tags.update(["occult", "weird"])
        except Exception as e:
            logging.warning(f"Error processing place name: {e}")

        # Process rating
        try:
            rating = place.get("rating")
            if isinstance(rating, (int, float)) and rating >= 4.5:
                tags.add("local-fave")
        except Exception as e:
            logging.warning(f"Error processing place rating: {e}")

        # Process details for opening hours
        if details:
            try:
                periods = (
                    details.get("result", {})
                    .get("opening_hours", {})
                    .get("periods", [])
                )
                for p in periods:
                    if not isinstance(p, dict):
                        continue
                    close = p.get("close", {})
                    time = close.get("time")
                    if time and isinstance(time, str) and len(time) >= 2:
                        try:
                            if int(time[:2]) >= 22:
                                tags.add("open-late")
                                break
                        except ValueError:
                            continue
            except Exception as e:
                logging.warning(f"Error processing opening hours: {e}")

        result = list(tags)
        logging.info(f"Computed {len(result)} tags for place")
        return result

    except Exception as e:
        logging.error(f"Error computing place tags: {e}")
        return []


def is_chain(name: str) -> bool:
    lower = name.lower()
    return any(k in lower for k in CHAIN_KEYWORDS)


# === Narrative template map for tag-based generation ===
TEMPLATE_MAP = {
    (
        "weird",
        "occult",
    ): "Begin your journey into the unknown with these strange and magical stops in [city]: [places].",
    (
        "romantic",
        "bookstore",
        "quiet",
    ): "Take your time drifting through this soft and charming city trail of [places] in [city].",
    (
        "cheap eats",
        "bar",
        "open-late",
    ): "Feast through the night with this budget-friendly adventure across [places] in [city].",
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


CHAIN_KEYWORDS = [
    "starbucks",
    "mcdonald",
    "chipotle",
    "subway",
    "dunkin",
    "walmart",
    "target",
]


# === Narrative template map for tag-based generation ===
TEMPLATE_MAP = {
    (
        "weird",
        "occult",
    ): "Begin your journey into the unknown with these strange and magical stops in [city]: [places].",
    (
        "romantic",
        "bookstore",
        "quiet",
    ): "Take your time drifting through this soft and charming city trail of [places] in [city].",
    (
        "cheap eats",
        "bar",
        "open-late",
    ): "Feast through the night with this budget-friendly adventure across [places] in [city].",
}


# Set up Secret Manager

# Set up Firestore


# Load Google Maps API


# Manual fallbacks for vague regions
CITY_FALLBACK_MAP = {
    "hudson valley": "New York",
    "catskills": "Albany",
    "poconos": "Philadelphia",
}


@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle preflight OPTIONS requests for CORS."""
    return JSONResponse(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        },
        content={"message": "CORS preflight OK"},
    )


@app.get("/")
def read_root():
    return {"message": "Real-World Quest Generator Backend is working!"}


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancer probes."""
    logger = logging.getLogger(__name__)

    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {},
        "warnings": [],
        "errors": [],
    }

    # Check Firestore connectivity
    try:
        rest_session = get_rest_session()
        if rest_session:
            test_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
            test_resp = await asyncio.to_thread(rest_session.get, test_url)
            if test_resp.status_code in [200, 403]:
                health_status["services"]["firestore"] = "operational"
            else:
                health_status["services"]["firestore"] = "degraded"
                health_status["errors"].append(
                    f"Firestore HTTP {test_resp.status_code}"
                )
        else:
            health_status["services"]["firestore"] = "unavailable"
            health_status["errors"].append("Firestore session not initialized")
    except Exception as e:
        health_status["services"]["firestore"] = "error"
        health_status["errors"].append(f"Firestore: {str(e)}")

    # Check Google Maps API
    if gmaps:
        health_status["services"]["google_maps"] = "operational"
    else:
        health_status["services"]["google_maps"] = "unavailable"
        health_status["warnings"].append("Google Maps API not configured")

    # Check OpenAI
    if openai.api_key:
        health_status["services"]["openai"] = "configured"
    else:
        health_status["services"]["openai"] = "unavailable"
        health_status["warnings"].append("OpenAI API not configured")

    # Check Firebase Admin
    if firebase_admin._apps:
        health_status["services"]["firebase_admin"] = "operational"
    else:
        health_status["services"]["firebase_admin"] = "unavailable"
        health_status["errors"].append("Firebase Admin SDK not initialized")

    # Determine overall status
    if health_status["errors"]:
        health_status["status"] = (
            "unhealthy" if len(health_status["errors"]) > 2 else "degraded"
        )
    elif health_status["warnings"]:
        health_status["status"] = "degraded"

    # Return appropriate HTTP status
    if health_status["status"] == "unhealthy":
        return JSONResponse(status_code=503, content=health_status)
    elif health_status["status"] == "degraded":
        return JSONResponse(status_code=200, content=health_status)
    else:
        return health_status


@app.post("/generate-quest")
async def generate_quest(request: Request):
    """Generate a quest using tag-based filtering and optional GPT text."""
    # Initialize security validator and middleware
    validator = InputValidator()
    security_middleware = SecurityMiddleware(validator)

    # Get session ID from request headers or create new session
    session_id = request.headers.get("x-session-id")
    if not session_id:
        # Create anonymous session for requests without session ID
        session_id = session_manager.create_session("anonymous")
        logger.info(f"Created anonymous session: {session_id}")

    # Validate session and check rate limits
    session_info = session_manager.get_session(session_id)
    if not session_info:
        return JSONResponse(
            status_code=401,
            content={"error": "Invalid or expired session", "session_id": session_id},
        )

    # Check rate limits
    if not session_manager.check_rate_limit(session_id):
        return JSONResponse(
            status_code=429, content={"error": "Rate limit exceeded", "retry_after": 60}
        )

    try:
        # Security validation: Check request size
        content_length = int(request.headers.get("content-length", 0))
        security_middleware.validate_request_size(content_length, max_size=100000)

        # Security validation: Check headers
        security_middleware.validate_rate_limit_headers(dict(request.headers))

        # Parse and validate request body with security checks
        body_raw = await request.body()
        body_str = body_raw.decode("utf-8")

        # Validate JSON input size and structure
        body = validator.validate_json_input(body_str, max_size=50000)

    except SecurityValidationError as e:
        logging.error(f"Security validation failed: {e}")
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid request",
                "detail": "Security validation failed",
            },
        )
    except Exception as e:
        logging.error(f"Request parsing failed: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON in request body", "detail": str(e)},
        )

    try:
        # Extract and validate parameters with comprehensive security checks
        city = body.get("city")
        moods = body.get("moods")
        time_limit = body.get("time_limit") or body.get(
            "timeLimit"
        )  # Support both formats
        token = body.get("token")
        user_id = body.get("user_id") or body.get("userId")  # Support both formats
        difficulty = body.get("difficulty", "Easy")
        lat = body.get("lat")
        lng = body.get("lng")

        # Security validation for all inputs
        validated_data = {}

        # Validate city (required string input)
        if city:
            validated_data["city"] = validator.sanitize_string(city, max_length=100)

        # Validate moods (required list with whitelist validation)
        if moods and isinstance(moods, list):
            validated_moods = []
            for mood in moods:
                try:
                    validated_mood = validator.validate_mood(str(mood))
                    validated_moods.append(validated_mood)
                except SecurityValidationError:
                    logging.warning(f"Invalid mood skipped: {mood}")
            validated_data["moods"] = validated_moods

        # Validate time limit (required integer with bounds)
        if time_limit is not None:
            validated_data["time_limit"] = validator.validate_time_limit(time_limit)

        # Validate user ID (required for auth)
        if user_id:
            validated_data["user_id"] = validator.validate_user_id(user_id)

        # Validate coordinates (optional but must be valid if provided)
        if lat is not None and lng is not None:
            validated_data["lat"] = validator.validate_coordinate(lat, "latitude")
            validated_data["lng"] = validator.validate_coordinate(lng, "longitude")

        # Validate difficulty (optional string with sanitization)
        if difficulty:
            validated_data["difficulty"] = validator.sanitize_string(
                difficulty, max_length=20
            )

        # Validate token (required for auth)
        if token:
            validated_data["token"] = validator.sanitize_string(token, max_length=2000)

    except SecurityValidationError as e:
        logging.error(f"Input validation failed: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid input data", "detail": str(e)},
        )
    except Exception as e:
        logging.error(f"Validation error: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": "Validation failed", "detail": "Invalid input format"},
        )

    # Use validated data for the rest of the processing
    city = validated_data.get("city")
    moods = validated_data.get("moods")
    time_limit = validated_data.get("time_limit")
    token = validated_data.get("token")
    user_id = validated_data.get("user_id")
    difficulty = validated_data.get("difficulty", "Easy")
    lat = validated_data.get("lat")
    lng = validated_data.get("lng")

    # Configure request logging
    request_id = hashlib.md5(
        f"{user_id or 'anonymous'}-{datetime.utcnow()}".encode()
    ).hexdigest()[:8]
    logger = logging.getLogger(__name__)
    logger.info(
        f"[{request_id}] Quest generation request - city: {city}, moods: {moods}, user: {user_id}"
    )

    # Final validation check for required fields (after security validation)
    if not city:
        return JSONResponse(
            status_code=400,
            content={"error": "City is required", "request_id": request_id},
        )

    if not moods or len(moods) == 0:
        return JSONResponse(
            status_code=400,
            content={
                "error": "At least one mood is required",
                "request_id": request_id,
            },
        )

    if time_limit is None:
        return JSONResponse(
            status_code=400,
            content={"error": "Time limit is required", "request_id": request_id},
        )

    # Execute quest generation with session management and queuing
    try:

        async def quest_generation_operation():
            """Quest generation operation to be executed with session management."""
            return await _generate_quest_internal(
                city=city,
                moods=moods,
                time_limit=time_limit,
                user_id=user_id,
                token=token,
                difficulty=difficulty,
                lat=lat,
                lng=lng,
                request_id=request_id,
            )

        # Execute with session management (priority 3 for quest generation)
        result = await session_manager.execute_with_session(
            session_id=session_id, operation=quest_generation_operation, priority=3
        )

        # Add session ID to response headers
        response = JSONResponse(content=result)
        response.headers["x-session-id"] = session_id
        return response

    except RuntimeError as e:
        if "Rate limit exceeded" in str(e):
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded", "retry_after": 60},
            )
        else:
            return JSONResponse(
                status_code=503,
                content={"error": "Service temporarily unavailable", "detail": str(e)},
            )
    except Exception as e:
        logger.error(f"Quest generation failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Quest generation failed", "request_id": request_id},
        )


async def _generate_quest_internal(
    city: str,
    moods: List[str],
    time_limit: int,
    user_id: str,
    token: str,
    difficulty: str,
    lat: float,
    lng: float,
    request_id: str,
) -> dict:
    """Internal quest generation function for session management."""

    preferred = get_user_preferred_tags(user_id) if user_id else []

    usage_count = 0
    user_is_premium = False
    user_level = 1
    user_age = 0
    prefers_clean = False
    # Validate session before proceeding with any operations
    if user_id:
        logger.info(
            f"[{request_id}] Processing authenticated request for user: {user_id}"
        )

        # Check session availability early with session management
        try:
            rest_session = get_rest_session()
            if not rest_session:
                logger.error(
                    f"[{request_id}] Firestore session unavailable - cannot process authenticated request"
                )
                raise RuntimeError("Database connection failed")
        except Exception as e:
            logger.error(f"[{request_id}] Session error: {e}")
            raise RuntimeError("Service temporarily unavailable")

        try:
            usage_count = await get_daily_usage(user_id)
            user_is_premium = await check_premium(user_id)
            logger.info(
                f"[{request_id}] User status - premium: {user_is_premium}, usage: {usage_count}"
            )

        except Exception as e:
            logger.error(f"[{request_id}] Failed to fetch user status: {str(e)}")
            raise RuntimeError("Failed to validate user account")

        if not user_is_premium:
            try:
                # fetch level from Firestore
                project_id = PROJECT_ID
                url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
                resp = await asyncio.to_thread(rest_session.get, url)

                if resp.status_code == 200:
                    user_doc = _decode_document(resp.json())
                    user_level = int(user_doc.get("level", 1))
                    dob = user_doc.get("dateOfBirth")
                    if dob:
                        user_age = calculate_age(dob)
                    else:
                        user_age = int(user_doc.get("age", 0))
                    prefers_clean = bool(user_doc.get("prefersCleanMode", False))
                    logger.info(
                        f"[{request_id}] User profile - level: {user_level}, age: {user_age}, clean: {prefers_clean}"
                    )
                elif resp.status_code == 404:
                    logger.warning(
                        f"[{request_id}] User document not found - using defaults"
                    )
                else:
                    logger.error(
                        f"[{request_id}] Failed to fetch user document - status: {resp.status_code}"
                    )

            except Exception as e:
                logger.error(f"[{request_id}] Error fetching user profile: {str(e)}")
                # Continue with defaults rather than failing

            if usage_count >= 3:
                logger.info(
                    f"[{request_id}] Daily limit reached for user: {user_id} ({usage_count}/3)"
                )
                raise RuntimeError("Daily quest limit reached")

            # difficulty gating
            req_diff = difficulty.title()
            required_level = (
                1 if req_diff == "Easy" else 3 if req_diff == "Medium" else 6
            )
            if user_level < required_level:
                logger.info(
                    f"[{request_id}] Difficulty locked - user level {user_level} < required {required_level}"
                )
                raise RuntimeError(f"You haven't unlocked {req_diff} quests yet.")
    else:
        logger.info(f"[{request_id}] Processing anonymous request")

    # Geocoding with comprehensive error handling
    try:
        if lat is not None and lng is not None:
            logger.info(f"[{request_id}] Using provided coordinates: {lat}, {lng}")
            city_location = {"lat": float(lat), "lng": float(lng)}
        else:
            logger.info(f"[{request_id}] Geocoding city: {city}")

            # Check if gmaps client is available
            if not gmaps:
                logger.error(f"[{request_id}] Google Maps client not initialized")
                raise RuntimeError("Location services temporarily unavailable")

            geocode = gmaps.geocode(city)

            if not geocode or len(geocode) == 0:
                logger.error(f"[{request_id}] No geocoding results for city: {city}")
                raise RuntimeError(f"Location not found: {city}")

            city_location = geocode[0]["geometry"]["location"]
            logger.info(f"[{request_id}] Geocoded to: {city_location}")

    except googlemaps.exceptions.ApiError as e:
        logger.error(f"[{request_id}] Google Maps API error: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "error": "Location service error",
                "request_id": request_id,
                "detail": "Google Maps API quota exceeded or invalid API key",
            },
        )
    except googlemaps.exceptions.Timeout as e:
        logger.error(f"[{request_id}] Google Maps timeout: {e}")
        return JSONResponse(
            status_code=504,
            content={
                "error": "Location service timeout",
                "request_id": request_id,
                "detail": "Please try again in a moment",
            },
        )
    except Exception as e:
        logger.error(f"[{request_id}] Geocoding error: {str(e)}")
        logger.error(f"[{request_id}] Geocoding traceback: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to locate city center",
                "request_id": request_id,
                "city": city,
            },
        )

    # Intelligent quest generation with progressive fallbacks
    logger.info(f"[{request_id}] Starting intelligent quest generation for {city}")

    # Validate gmaps client early
    if not gmaps:
        logger.error(f"[{request_id}] Google Maps client not available for Places API")
        return JSONResponse(
            status_code=503,
            content={
                "error": "Places service temporarily unavailable",
                "request_id": request_id,
                "detail": "Google Maps API client not configured",
            },
        )

    # Initialize variables for intelligent fallback system
    original_moods = moods.copy()
    current_moods = moods.copy()
    selected = []
    places_results = []
    location_attempts = 0
    mood_attempts = 0
    adaptation_messages = []
    final_radius = 2000
    quest_type_info = None
    location_type = "suburban"  # Default assumption

    # Progressive search with radius expansion and mood fallbacks
    while len(selected) < 1 and location_attempts < 4:  # At least 1 place needed
        logger.info(f"[{request_id}] Search attempt {location_attempts + 1}/4")

        # Calculate adaptive radius based on attempts and location intelligence
        final_radius = calculate_adaptive_radius(
            2000, location_type, location_attempts, time_limit
        )

        if location_attempts > 0:
            radius_km = final_radius / 1000
            logger.info(f"[{request_id}] Expanding search area to {radius_km:.0f}km")
            adaptation_messages.append(f"Expanding search area to {radius_km:.0f}km...")

        try:
            # Search for places with current radius and settings
            response = gmaps.places_nearby(
                location=(city_location["lat"], city_location["lng"]),
                radius=final_radius,
                type="tourist_attraction",
            )
            places_results = response.get("results", [])

            logger.info(
                f"[{request_id}] Found {len(places_results)} places in {final_radius/1000:.0f}km radius"
            )

            if len(places_results) == 0:
                location_attempts += 1
                continue

            # Detect location type for intelligent adaptation
            if location_attempts == 0:  # Only detect once
                location_type = detect_location_type(places_results)
                logger.info(f"[{request_id}] Detected location type: {location_type}")

                # Suggest location-appropriate moods if needed
                location_info = LOCATION_INTELLIGENCE.get(location_type, {})
                preferred_moods = location_info.get("preferred_moods", [])

                # If original moods don't match location type well, suggest adaptation
                mood_match = any(
                    mood.lower() in preferred_moods for mood in original_moods
                )
                if not mood_match and preferred_moods:
                    suggested_mood = preferred_moods[0]
                    if suggested_mood not in [m.lower() for m in current_moods]:
                        current_moods.append(suggested_mood.title())
                        adaptation_messages.append(
                            f"Added {suggested_mood} mood for better local matches"
                        )
            # Process places with current mood preferences
            mood_tags = set()
            for mood in current_moods:
                if mood.lower() == "weird":
                    mood_tags.update(["occult", "weird"])
                elif mood.lower() in ["food", "foodie"]:
                    mood_tags.update(["bar", "restaurant"])
                elif mood.lower() in ["adventure", "adventurous"]:
                    mood_tags.update(["hike", "outdoors", "scenic"])
                elif mood.lower() == "cozy":
                    mood_tags.update(["bookstore", "cafe", "quiet"])
                elif mood.lower() == "quirky":
                    mood_tags.update(["vintage", "oddity-shop"])
                elif mood.lower() in ["drinks", "bar"]:
                    mood_tags.update(["bar", "brewery"])
                elif mood.lower() == "historic":
                    mood_tags.update(["historic", "museum"])
                elif mood.lower() in ["artsy", "art"]:
                    mood_tags.update(["art", "gallery", "museum"])
                elif mood.lower() == "chill":
                    mood_tags.update(["park", "cafe", "quiet"])
                elif mood.lower() == "romantic":
                    mood_tags.update(["restaurant", "scenic", "historic"])
                elif mood.lower() == "cultural":
                    mood_tags.update(["museum", "art", "historic"])
                elif mood.lower() == "nature":
                    mood_tags.update(["park", "hike", "scenic"])

            # Score and select places
            candidates = []
            for place in places_results:
                try:
                    name = place.get("name", "Unnamed Place")
                    if "establishment" in place.get("types", []):
                        tags = compute_place_tags(place)
                        is_restricted = is_age_restricted(name, tags)

                        if is_restricted and user_age < 21:
                            continue

                        # Score based on tag overlap
                        overlap = len(mood_tags.intersection(tags))
                        if len(mood_tags) == 0:
                            overlap = 1

                        if overlap <= 0:
                            continue

                        loc = place["geometry"]["location"]
                        typ = place.get("types", ["Unknown"])[0]
                        candidates.append(
                            {
                                "name": name,
                                "type": typ,
                                "lat": float(loc["lat"]),
                                "lng": float(loc["lng"]),
                                "tags": tags,
                                "isAgeRestricted": is_restricted,
                                "score": overlap,
                                "rating": place.get("rating", 0),
                            }
                        )
                except Exception as e:
                    logger.warning(
                        f"[{request_id}] Skipping place processing error: {str(e)}"
                    )

            # Sort and select diverse places
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

            logger.info(
                f"[{request_id}] Found {len(selected)} suitable places with current moods"
            )

            # If still not enough places, try mood fallbacks
            if len(selected) < 1 and mood_attempts < 3:
                mood_fallbacks = get_mood_fallbacks(current_moods)
                if mood_attempts < len(mood_fallbacks):
                    old_moods = current_moods.copy()
                    current_moods = mood_fallbacks[mood_attempts]
                    logger.info(
                        f"[{request_id}] Trying mood fallback: {old_moods} → {current_moods}"
                    )
                    adaptation_messages.append(
                        f"Adapting mood from {', '.join(old_moods)} to {', '.join(current_moods)} for better options"
                    )
                    mood_attempts += 1
                    continue

            # If we have at least one place, break out of the loop
            if len(selected) >= 1:
                break

        except googlemaps.exceptions.ApiError as e:
            logger.error(f"[{request_id}] Places API error: {e}")
            if "OVER_QUERY_LIMIT" in str(e):
                return JSONResponse(
                    status_code=503,
                    content={
                        "error": "Service temporarily overloaded",
                        "request_id": request_id,
                        "detail": "Please try again later",
                        "retry_after": 60,
                    },
                )
            elif "REQUEST_DENIED" in str(e):
                return JSONResponse(
                    status_code=503,
                    content={
                        "error": "Places service configuration error",
                        "request_id": request_id,
                        "detail": "API access denied",
                    },
                )
        except Exception as e:
            logger.error(f"[{request_id}] Places search error: {str(e)}")

        location_attempts += 1

    # Determine appropriate quest type based on what we found
    if len(selected) >= 1:
        quest_type_info = determine_quest_type(len(selected), time_limit, current_moods)

        # Limit places to what the quest type needs
        places_needed = quest_type_info["places_needed"]
        if len(selected) > places_needed:
            selected = selected[:places_needed]

        # Generate user-friendly adaptation message
        adaptation_message = generate_smart_fallback_message(
            original_moods, current_moods, final_radius, quest_type_info["type"]
        )

        logger.info(
            f"[{request_id}] Quest generation successful: {quest_type_info['type']} with {len(selected)} places"
        )
        logger.info(f"[{request_id}] Adaptations: {adaptation_message}")

    else:
        # Ultimate fallback - provide discovery suggestions
        logger.warning(f"[{request_id}] No suitable places found after all fallbacks")
        return JSONResponse(
            status_code=200,  # Changed to 200 since we're providing helpful alternatives
            content={
                "quest_type": "Discovery Quest",
                "message": "We're still exploring this area! Here are some suggestions:",
                "suggestions": [
                    "Try searching in a nearby larger city",
                    "Consider broader moods like 'Chill' or 'Adventurous'",
                    "This might be perfect for a nature-focused quest - try 'Outdoorsy' mood",
                    f"Extend your time limit beyond {time_limit} minutes for wider exploration",
                ],
                "fallback_search": {
                    "expanded_radius": f"{final_radius/1000:.0f}km",
                    "tried_moods": current_moods,
                    "location_type": location_type,
                },
                "request_id": request_id,
                "adaptations": adaptation_messages,
            },
        )

    # At this point, selected places are already available from the intelligent quest generation above
    # Continue with hash key generation and caching logic

    loc_hash = f"{city_location['lat']:.2f}_{city_location['lng']:.2f}"
    tag_combo = "-".join(sorted(preferred)) if preferred else "none"
    hash_key = generate_hash_key(loc_hash, "_".join(moods), tag_combo)
    # Check for cached quest with proper error handling
    try:
        cached = get_cached_quest(hash_key)
        if cached:
            if (
                (user_age and user_age < 21) or prefers_clean
            ) and "age21+" in cached.get("tags", []):
                cached = None
                logger.info(
                    f"[{request_id}] Cached quest filtered out due to age restrictions"
                )
        if cached:
            logger.info(f"[{request_id}] Using cached quest: {hash_key}")
            result = {"quest": cached, "request_id": request_id}
            # Add adaptation information if available
            if "adaptation_message" in locals():
                result["adaptations"] = adaptation_message
            return result
        else:
            logger.info(f"[{request_id}] No cached quest found, generating new one")
    except Exception as e:
        logger.error(f"[{request_id}] Error checking quest cache: {str(e)}")
        # Continue with quest generation instead of failing

    if lat is not None and lng is not None:
        origin = f"{lat},{lng}"
        waypoints = [f"{p['lat']},{p['lng']}" for p in selected[:-1]]
    else:
        origin = f"{selected[0]['lat']},{selected[0]['lng']}"
        waypoints = [f"{p['lat']},{p['lng']}" for p in selected[1:-1]]
    destination = f"{selected[-1]['lat']},{selected[-1]['lng']}"

    # Generate route with comprehensive error handling
    logger.info(
        f"[{request_id}] Generating walking directions for {len(selected)} places"
    )

    try:
        if not gmaps:
            logger.error(
                f"[{request_id}] Google Maps client not available for directions"
            )
            return JSONResponse(
                status_code=503,
                content={
                    "error": "Directions service temporarily unavailable",
                    "request_id": request_id,
                    "detail": "Google Maps API client not configured",
                },
            )

        directions = gmaps.directions(
            origin,
            destination,
            waypoints=waypoints,
            optimize_waypoints=True,
            mode="walking",
        )

        if not directions or len(directions) == 0:
            logger.error(f"[{request_id}] No directions found for route")
            return JSONResponse(
                status_code=422,
                content={
                    "error": "Unable to create walking route",
                    "request_id": request_id,
                    "detail": "Places may be too far apart or unreachable on foot",
                },
            )

        logger.info(f"[{request_id}] Successfully generated directions")

    except googlemaps.exceptions.ApiError as e:
        logger.error(f"[{request_id}] Directions API error: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "error": "Directions service error",
                "request_id": request_id,
                "detail": "Google Directions API error",
            },
        )
    except googlemaps.exceptions.Timeout as e:
        logger.error(f"[{request_id}] Directions timeout: {e}")
        return JSONResponse(
            status_code=504,
            content={
                "error": "Directions service timeout",
                "request_id": request_id,
                "detail": "Route calculation taking too long",
            },
        )
    except Exception as e:
        logger.error(f"[{request_id}] Directions error: {str(e)}")
        logger.error(f"[{request_id}] Directions traceback: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to retrieve directions",
                "request_id": request_id,
            },
        )

    route = directions[0]
    waypoint_order = route.get("waypoint_order", [])
    legs = route.get("legs", [])
    polyline = route.get("overview_polyline", {}).get("points", "")

    if lat is not None and lng is not None:
        ordered_waypoints = [selected[i] for i in waypoint_order]
        ordered = (
            [
                {
                    "name": "Your Location",
                    "type": "start",
                    "lat": float(lat),
                    "lng": float(lng),
                    "tags": [],
                    "isAgeRestricted": False,
                }
            ]
            + ordered_waypoints
            + [selected[-1]]
        )
    else:
        ordered = (
            [selected[0]] + [selected[i + 1] for i in waypoint_order] + [selected[-1]]
        )
    place_names = ", ".join(
        [sanitize_input(p["name"]) for p in ordered if p.get("type") != "start"]
    )

    # Generate quest narrative using OpenAI Safety Manager (now with short prompts)
    fallback_text = (
        f"Your adventure begins at {ordered[0]['name']}, then heads to {ordered[1]['name']} "
        f"and ends at {ordered[-1]['name']}!"
    )

    try:
        from openai_safety import openai_safety_manager

        quest_text, generation_method = (
            await openai_safety_manager.generate_quest_narrative(
                place_names, moods, request_id
            )
        )
        logger.info(
            f"[{request_id}] Quest narrative generated using {generation_method}"
        )
    except Exception as e:
        logger.error(f"[{request_id}] OpenAI Safety Manager error: {str(e)}")
        quest_text = fallback_text
        generation_method = "template_error"

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
    if any(p.get("isAgeRestricted") for p in ordered):
        tag_set.add("age21+")

    # Use the generation method returned by the safety manager
    gen_method = (
        generation_method
        if "generation_method" in locals()
        else ("gpt" if openai.api_key else "template")
    )

    quest_obj = {
        "questText": quest_text,
        "places": ordered,
        "difficulty": difficulty.title(),
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
        "mood": ",".join(current_moods if "current_moods" in locals() else moods),
        "originalMoods": ",".join(
            original_moods if "original_moods" in locals() else moods
        ),
        "flagged": False,
        "intelligence": {
            "questType": (
                quest_type_info["type"]
                if "quest_type_info" in locals() and quest_type_info
                else "Standard Quest"
            ),
            "questDescription": (
                quest_type_info["description"]
                if "quest_type_info" in locals() and quest_type_info
                else f"A complete {time_limit}-minute adventure"
            ),
            "locationType": (
                location_type if "location_type" in locals() else "suburban"
            ),
            "searchRadius": (
                f"{final_radius/1000:.0f}km" if "final_radius" in locals() else "2km"
            ),
            "adaptationMessage": (
                adaptation_message
                if "adaptation_message" in locals()
                else "Perfect matches found for your preferences!"
            ),
            "moodAdaptations": (
                current_moods != original_moods
                if "current_moods" in locals() and "original_moods" in locals()
                else False
            ),
            "radiusExpanded": (
                final_radius > 2000 if "final_radius" in locals() else False
            ),
        },
    }

    # Save quest and update usage with error handling
    try:
        logger.info(f"[{request_id}] Saving quest to Firestore")
        save_quest_to_firestore(hash_key, quest_obj)
        logger.info(f"[{request_id}] Quest saved successfully")
    except Exception as e:
        logger.error(f"[{request_id}] Failed to save quest to Firestore: {str(e)}")
        # Continue anyway - user gets quest even if caching fails

    if user_id:
        try:
            await increment_daily_usage(user_id)
            logger.info(f"[{request_id}] Updated daily usage for user: {user_id}")
        except Exception as e:
            logger.error(f"[{request_id}] Failed to increment daily usage: {str(e)}")
            # Continue anyway - user gets quest even if usage tracking fails

    # Prepare final response
    result = {"quest": quest_obj, "request_id": request_id}

    # Add adaptation information if available
    if "adaptation_message" in locals():
        result["adaptations"] = adaptation_message
    if "current_moods" in locals() and current_moods != original_moods:
        result["moodAdaptations"] = {
            "original": original_moods,
            "adapted": current_moods,
        }

    logger.info(f"[{request_id}] Quest generation completed successfully")
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
    """Decode Firestore value format to Python value."""
    try:
        if not isinstance(val, dict):
            logging.warning(f"Invalid value format, expected dict: {type(val)}")
            return val

        if "nullValue" in val:
            return None
        if "booleanValue" in val:
            return val["booleanValue"]
        if "integerValue" in val:
            try:
                return int(val["integerValue"])
            except (ValueError, TypeError) as e:
                logging.warning(
                    f"Error parsing integer value {val['integerValue']}: {e}"
                )
                return 0
        if "doubleValue" in val:
            try:
                return float(val["doubleValue"])
            except (ValueError, TypeError) as e:
                logging.warning(f"Error parsing double value {val['doubleValue']}: {e}")
                return 0.0
        if "stringValue" in val:
            return val["stringValue"]
        if "arrayValue" in val:
            try:
                values = val.get("arrayValue", {}).get("values", [])
                return [_from_value(v) for v in values if v is not None]
            except Exception as e:
                logging.error(f"Error parsing array value: {e}")
                return []
        if "mapValue" in val:
            try:
                fields = val.get("mapValue", {}).get("fields", {})
                return {
                    k: _from_value(v) for k, v in fields.items() if k and v is not None
                }
            except Exception as e:
                logging.error(f"Error parsing map value: {e}")
                return {}

        logging.warning(f"Unknown value format: {val}")
        return val

    except Exception as e:
        logging.error(f"Error in _from_value: {e}")
        return None


def _decode_document(doc: dict) -> dict:
    return {k: _from_value(v) for k, v in doc.get("fields", {}).items()}


async def check_premium(user_id: str) -> bool:
    """Return True if the user has premium status."""
    rest_session = get_rest_session()
    if not rest_session:
        return False

    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code == 200:
        fields = _decode_document(resp.json())
        return fields.get("isPremium") is True
    return False


async def log_admin_event(event: str, payload: dict):
    """Write a simple event document to admin_logs."""
    doc_id = hashlib.sha1(f"{event}-{datetime.utcnow()}".encode()).hexdigest()[:12]
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/admin_logs/{doc_id}"
    body = {
        "fields": _encode_fields(
            {
                "event": event,
                "payload": payload,
                "created": datetime.utcnow().isoformat(),
            }
        )
    }
    session = get_rest_session()
    await asyncio.to_thread(session.patch, url, json=body)


async def get_daily_usage(user_id: str) -> int:
    """Retrieve today's quest generation count for the user."""
    rest_session = get_rest_session()
    if not rest_session:
        return 0

    today = datetime.utcnow().strftime("%Y-%m-%d")
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}/dailyUsage/{today}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code == 200:
        doc = _decode_document(resp.json())
        return int(doc.get("count", 0))
    return 0


async def increment_daily_usage(user_id: str) -> int:
    """Increment and return today's quest generation count."""
    rest_session = get_rest_session()
    if not rest_session:
        return 0

    today = datetime.utcnow().strftime("%Y-%m-%d")
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}/dailyUsage/{today}"
    resp = await asyncio.to_thread(rest_session.get, url)
    count = 0
    if resp.status_code == 200:
        doc = _decode_document(resp.json())
        count = int(doc.get("count", 0))
    count += 1
    body = {"fields": _encode_fields({"count": count})}
    session = get_rest_session()
    await asyncio.to_thread(session.patch, url, json=body)
    return count


@app.post("/generate-demo-quest")
async def generate_demo_quest():
    """Return a hardcoded quest used for onboarding demos."""
    return {
        "quest": {
            "questText": "Welcome adventurer! Try this fun intro route.",
            "places": [
                {
                    "name": "Welcome Plaza",
                    "lat": 37.7749,
                    "lng": -122.4194,
                    "type": "tourist_attraction",
                },
                {
                    "name": "Local Cafe",
                    "lat": 37.7750,
                    "lng": -122.4180,
                    "type": "cafe",
                },
                {
                    "name": "Riverside Walk",
                    "lat": 37.7755,
                    "lng": -122.4170,
                    "type": "park",
                },
            ],
            "difficulty": "Easy",
            "route": {
                "legs": [],
                "polyline": "",
                "total_distance": "0.5 miles",
                "total_duration": "15 minutes",
            },
            "timestamp": "2025-07-26T12:00:00Z",
            "generationMethod": "demo",
            "tagSource": "manual",
            "tags": ["demo", "intro"],
            "city": "Demo City",
            "mood": "adventure",
        }
    }


@app.post("/quest-complete")
async def complete_quest(payload: dict = Body(...)):
    """Finalize a quest and award XP."""
    user_id = payload.get("userId")
    quest_id = payload.get("questId")
    if not user_id or not quest_id:
        return {"error": "userId and questId required"}

    timestamp = datetime.utcnow().isoformat()
    project_id = PROJECT_ID

    # Path to quest document under the user's quests collection
    quest_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/quests/{quest_id}"
    resp = await asyncio.to_thread(rest_session.get, quest_url)
    existing_doc = _decode_document(resp.json()) if resp.status_code == 200 else {}

    xp_already_applied = bool(existing_doc.get("xpApplied"))

    # Quest fields
    quest_doc = {
        "title": payload.get("title"),
        "city": payload.get("city"),
        "mood": payload.get("mood"),
        "difficulty": payload.get("difficulty"),
        "questText": payload.get("questText"),
        "locationList": payload.get("locationList", []),
        "imagePrompt": payload.get("imagePrompt"),
        "postcardUrl": existing_doc.get("postcardUrl"),
        "visitedIndices": payload.get(
            "visitedIndices", existing_doc.get("visitedIndices", [])
        ),
        "completed": True,
        "completedAt": existing_doc.get("completedAt", timestamp),
        "isDemo": payload.get("isDemo", False),
    }

    difficulty = (payload.get("difficulty") or "Easy").title()
    base_xp = 100 if difficulty == "Easy" else 200 if difficulty == "Medium" else 300
    xp_earned = 0 if xp_already_applied else base_xp
    if payload.get("groupQuest") and not xp_already_applied:
        xp_earned += 100
    bonus_xp = 0
    new_badges = []

    # Fetch current user doc
    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, user_url)
    user_data = _decode_document(resp.json()) if resp.status_code == 200 else {}

    total_xp = user_data.get("xp", user_data.get("totalXP", 0))
    quests_completed = user_data.get("questsCompleted", 0)
    streak = user_data.get("streakCount", 0)
    group_completions = user_data.get("groupCompletions", 0)
    if xp_earned:
        total_xp += xp_earned
        quests_completed += 1
        last_ts = parse_ts(user_data.get("lastCompleted"))
        now_dt = datetime.utcnow()
        if last_ts and now_dt - last_ts <= timedelta(hours=36):
            streak += 1
        else:
            streak = 1
        user_data["lastCompleted"] = timestamp
        if payload.get("groupQuest"):
            group_completions += 1
    level = get_level_from_xp(total_xp)

    badge_set = set(user_data.get("badgesUnlocked", []))
    if quests_completed >= 1 and "first-quest" not in badge_set:
        badge_set.add("first-quest")
        new_badges.append("first-quest")
    if quests_completed >= 10 and "quest-10" not in badge_set:
        badge_set.add("quest-10")
        new_badges.append("quest-10")
    if streak >= 7 and "streak-7" not in badge_set:
        badge_set.add("streak-7")
        new_badges.append("streak-7")
    if difficulty == "Hard" and "hardcore" not in badge_set:
        badge_set.add("hardcore")
        new_badges.append("hardcore")
    if (
        payload.get("groupQuest")
        and len(payload.get("groupQuest", {}).get("members", [])) >= 3
        and "squad-player" not in badge_set
    ):
        badge_set.add("squad-player")
        new_badges.append("squad-player")
    if "explorer-5" not in badge_set:
        qurl = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}:runQuery"
        qresp = await asyncio.to_thread(
            rest_session.post,
            qurl,
            json={"structuredQuery": {"from": [{"collectionId": "quests"}]}},
        )
        if qresp.status_code == 200:
            cities = set()
            for item in qresp.json():
                doc = item.get("document")
                if not doc:
                    continue
                qd = _decode_document(doc)
                city = qd.get("city") or qd.get("questData", {}).get("city")
                if city:
                    cities.add(city)
                if len(cities) >= 5:
                    break
            if len(cities) >= 5:
                badge_set.add("explorer-5")
                new_badges.append("explorer-5")

    quest_doc.update(
        {
            "xpEarned": xp_earned,
            "xpApplied": True,
        }
    )
    quest_body = {"fields": _encode_fields(quest_doc)}
    rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, quest_url, json=quest_body)

    user_update = {
        "xp": total_xp,
        "level": level,
        "lastCompleted": user_data.get("lastCompleted"),
        "questsCompleted": quests_completed,
        "streakCount": streak,
        "groupCompletions": group_completions,
        "badgesUnlocked": list(badge_set),
        "badgeCount": len(badge_set),
    }
    if payload.get("city") and not user_data.get("city"):
        user_update["city"] = payload.get("city")
    await asyncio.to_thread(
        rest_session.patch, user_url, json={"fields": _encode_fields(user_update)}
    )

    for badge_id in new_badges:
        b_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}/badges/{badge_id}"
        body = {
            "fields": _encode_fields(
                {
                    "earnedAt": timestamp,
                    "type": BADGE_CATALOG.get(badge_id, {}).get("type", "general"),
                }
            )
        }
        rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, b_url, json=body)

    postcard_url = None
    prompt_raw = (
        payload.get("imagePrompt")
        or f"A vintage postcard from {payload.get('city','somewhere')}"
    )
    prompt = sanitize_input(prompt_raw)
    if openai.api_key:
        try:
            dalle = openai.Image.create(prompt=prompt, n=1, size="512x512")
            raw_url = dalle["data"][0]["url"]
            image_data = requests.get(raw_url).content
            filename = f"postcards/{user_id}_{quest_id}.png"
            bucket_name = (
                os.getenv("VITE_FIREBASE_STORAGE_BUCKET") or "your-bucket-name"
            )
            bucket = storage.Client().bucket(bucket_name)
            blob = bucket.blob(filename)
            blob.upload_from_string(image_data, content_type="image/png")
            blob.make_public()
            postcard_url = blob.public_url
        except Exception as e:
            print("postcard gen failed", e)

    if postcard_url:
        quest_doc["postcardUrl"] = postcard_url
        patch_body = {"fields": _encode_fields({"postcardUrl": postcard_url})}
        rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, quest_url, json=patch_body)

    if payload.get("public"):
        feed_id = f"{quest_id}_{user_id}"
        feed_doc = {
            "uid": user_id,
            "imageUrl": postcard_url,
            "city": payload.get("city"),
            "timestamp": timestamp,
            "badgesUnlocked": new_badges,
            "xpEarned": xp_earned,
            "displayName": payload.get("displayName"),
            "mood": payload.get("mood"),
            "questTitle": payload.get("title"),
            "sharedFromQuestId": quest_id,
            "isFlagged": False,
        }
        feed_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/ugc_feed/{feed_id}"
        feed_body = {"fields": _encode_fields(feed_doc)}
        fr = await asyncio.to_thread(rest_session.patch, feed_url, json=feed_body)
        if fr.status_code != 200:
            print("Firestore REST error", fr.text)
            fr.raise_for_status()

    return {
        "status": "completed",
        "xpEarned": xp_earned,
        "bonusXP": bonus_xp,
        "newTotal": total_xp,
        "level": level,
        "badgesUnlocked": new_badges,
        "nextLevelXP": LEVEL_THRESHOLDS[min(level, len(LEVEL_THRESHOLDS) - 1)],
        "imageUrl": postcard_url,
        "streakCount": streak,
    }


@app.get("/places")
def get_places(city: str = Query(...)):
    """Enhanced location analysis with intelligent mood recommendations."""
    # Security validation for city input
    try:
        validator = InputValidator()
        validated_city = validator.sanitize_string(city, max_length=100)
        logging.info(f"Places request for city: {validated_city}")
    except SecurityValidationError as e:
        logging.error(f"Invalid city in get_places: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid city input", "detail": "City validation failed"},
        )

    if not gmaps:
        return {"error": "Location services temporarily unavailable"}

    try:
        # Geocode the city
        geocode_result = gmaps.geocode(validated_city)
        if not geocode_result:
            return {"error": "City not found", "city": validated_city}

        location = geocode_result[0]["geometry"]["location"]
        formatted_address = geocode_result[0].get("formatted_address", validated_city)

        # Search for places with expanding radius for better coverage
        all_places = []
        radii = [2000, 5000, 10000]  # 2km, 5km, 10km

        for radius in radii:
            places_result = gmaps.places_nearby(
                location=(location["lat"], location["lng"]),
                radius=radius,
                type="tourist_attraction",
            )
            places = places_result.get("results", [])
            all_places.extend(places)
            if len(all_places) >= 10:  # Good coverage found
                break

        # Detect location type and get recommendations
        location_type = detect_location_type(all_places)
        location_info = LOCATION_INTELLIGENCE.get(location_type, {})

        # Count places by category for better insights
        place_categories = {}
        quality_places = 0

        for place in all_places[:20]:  # Analyze top 20 places
            place_types = place.get("types", [])
            rating = place.get("rating", 0)

            if rating >= 4.0:
                quality_places += 1

            for place_type in place_types:
                if place_type in ["establishment", "point_of_interest"]:
                    continue
                place_categories[place_type] = place_categories.get(place_type, 0) + 1

        # Generate mood recommendations based on available places
        recommended_moods = location_info.get("preferred_moods", [])

        # Add specific mood recommendations based on place analysis
        if place_categories.get("restaurant", 0) > 3:
            if "foodie" not in recommended_moods:
                recommended_moods.append("foodie")

        if (
            place_categories.get("museum", 0) > 1
            or place_categories.get("art_gallery", 0) > 0
        ):
            if "cultural" not in recommended_moods:
                recommended_moods.append("cultural")

        if (
            place_categories.get("park", 0) > 2
            or place_categories.get("natural_feature", 0) > 0
        ):
            if "nature" not in recommended_moods:
                recommended_moods.append("nature")

        # Limit to top 5 mood recommendations
        recommended_moods = recommended_moods[:5]

        return {
            "city": city,
            "formatted_address": formatted_address,
            "location": {"lat": location["lat"], "lng": location["lng"]},
            "analysis": {
                "total_places": len(all_places),
                "quality_places": quality_places,
                "location_type": location_type,
                "search_radius_km": min(
                    10, (radii[min(len(radii) - 1, len(all_places) // 5)] / 1000)
                ),
                "place_categories": dict(
                    sorted(place_categories.items(), key=lambda x: x[1], reverse=True)[
                        :8
                    ]
                ),
            },
            "recommendations": {
                "moods": recommended_moods,
                "message": f"{len(all_places)} locations found in this {location_type} area",
                "quest_potential": (
                    "excellent"
                    if quality_places > 5
                    else "good" if quality_places > 2 else "moderate"
                ),
            },
            "sample_places": [place["name"] for place in all_places[:8]],
        }

    except Exception as e:
        return {"error": "Failed to analyze location", "city": city, "detail": str(e)}


@app.post("/generate-postcard")
async def generate_postcard(request: Request):
    body = await request.json()
    user_id = body["userId"]
    quest_id = body["questId"]
    city = body["city"]
    mood = body["mood"]
    difficulty = body.get("difficulty", "Medium")

    # 🎨 Prompt for image generation
    prompt = sanitize_input(
        f"A vintage postcard from {city} with a {mood} tone – Difficulty: {difficulty}. Retro art style."
    )

    try:
        # 🧠 Generate image using OpenAI
        dalle_response = openai.Image.create(prompt=prompt, n=1, size="512x512")
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
        quest_ref = (
            db.collection("user_quests")
            .document(user_id)
            .collection("quests")
            .document(quest_id)
        )
        quest_ref.update(
            {
                "imageUrl": public_url,
                "completed": True,
                "completedAt": firestore.SERVER_TIMESTAMP,
            }
        )

        return {"status": "ok", "imageUrl": public_url}

    except Exception as e:
        print("🔥 Error generating postcard:", e)
        return {"status": "error", "message": str(e)}


@app.get("/test-write")
def test_write():
    """Test function to write a document to Firestore."""
    try:
        logging.info("Testing Firestore write operation")

        project_id = PROJECT_ID
        if not project_id:
            logging.error("PROJECT_ID not configured")
            return {"error": "Project ID not configured"}

        url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/test/sample"
        body = {"fields": {"message": {"stringValue": "Hello from FastAPI!"}}}

        rest_session = get_rest_session()
        resp = rest_session.patch(url, json=body)

        if resp.status_code == 200:
            logging.info("Successfully wrote test document to Firestore")
            return {"status": "Document written!"}
        else:
            logging.error(
                f"Firestore write failed with status {resp.status_code}: {resp.text}"
            )
            return {"error": f"Write failed: {resp.status_code}"}

    except requests.RequestException as e:
        logging.error(f"Network error during Firestore test write: {e}")
        return {"error": f"Network error: {str(e)}"}
    except Exception as e:
        logging.error(f"Error in test_write: {e}")
        return {"error": f"Test write failed: {str(e)}"}


@app.get("/get-user-quests")
async def get_user_quests(userId: str = Query(...)):
    """Return quests for a user sorted by completedAt desc."""
    # Security validation for user ID
    try:
        validator = InputValidator()
        validated_user_id = validator.validate_user_id(userId)
    except SecurityValidationError as e:
        logging.error(f"Invalid user ID in get_user_quests: {e}")
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid user ID",
                "detail": "User ID format validation failed",
            },
        )
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{validated_user_id}:runQuery"
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
    # Validate session availability early
    rest_session = get_rest_session()
    if not rest_session:
        return JSONResponse(
            status_code=503, content={"error": "Service temporarily unavailable"}
        )

    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests/{quest_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return resp.json()


@app.post("/track-visit")
async def track_visit(payload: dict = Body(...)):
    """Update visited quest indices and award XP."""
    # Validate session availability early
    rest_session = get_rest_session()
    if not rest_session:
        return JSONResponse(
            status_code=503, content={"error": "Service temporarily unavailable"}
        )

    # Security validation for all inputs
    try:
        validator = InputValidator()

        user_id = payload.get("userId")
        quest_id = payload.get("questId")
        place_index = payload.get("placeIndex")

        if user_id is None or quest_id is None or place_index is None:
            return {"error": "userId, questId and placeIndex required"}

        # Validate user ID
        validated_user_id = validator.validate_user_id(user_id)

        # Validate quest ID (treat as place ID format for now)
        validated_quest_id = validator.sanitize_string(quest_id, max_length=128)

        # Validate place index (must be non-negative integer)
        if not isinstance(place_index, int) or place_index < 0:
            raise SecurityValidationError("Place index must be a non-negative integer")
        if place_index > 1000:  # Reasonable upper bound
            raise SecurityValidationError("Place index too large")

        logging.info(
            f"Track visit validated: user={validated_user_id}, quest={validated_quest_id}, index={place_index}"
        )

    except SecurityValidationError as e:
        logging.error(f"Track visit validation failed: {e}")
        return JSONResponse(
            status_code=400, content={"error": "Invalid input data", "detail": str(e)}
        )
    except Exception as e:
        logging.error(f"Track visit error: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": "Validation failed", "detail": "Invalid input format"},
        )

    project_id = PROJECT_ID
    quest_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{validated_user_id}/{validated_quest_id}"

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
    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, user_url)
    user_data = {}
    if resp.status_code == 200:
        user_data = _decode_document(resp.json())

    total_xp = user_data.get("totalXP", 0)
    level = user_data.get("level", 1)
    stats = user_data.get("stats", {})
    badges = user_data.get("badges", {})
    badge_list = user_data.get("badgesUnlocked", [])

    if new_visit:
        total_xp += 10
        level = get_level_from_xp(total_xp)
        stats["totalStopsVisited"] = stats.get("totalStopsVisited", 0) + 1
        stats["totalXP"] = total_xp

    new_badges = []
    if len(visited) >= 10:
        new_badges.append("adventurer")
    if stats.get("totalQuestsCompleted", 0) >= 5:
        new_badges.append("explorer")
    badge_list = user_data.get("badgesUnlocked", [])
    unlocked_now = compute_badge_unlocks(stats, level, badge_list)
    new_badges.extend([b for b in unlocked_now if b not in new_badges])
    for b in new_badges:
        badges[b] = True
        if b not in badge_list:
            badge_list.append(b)

    user_body = {
        "fields": _encode_fields(
            {
                "totalXP": total_xp,
                "level": level,
                "stats": stats,
                "badges": badges,
                "badgesUnlocked": badge_list,
            }
        )
    }
    resp = await asyncio.to_thread(rest_session.patch, user_url, json=user_body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    return {
        "status": "ok",
        "visitedIndices": visited,
        "totalXP": total_xp,
        "level": level,
        "badges": badges,
    }


@app.post("/upload-postcard")
async def upload_postcard(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Attach postcard image info to quest."""
    user_id = payload.get("userId")
    quest_id = payload.get("questId")
    image_url = payload.get("imageUrl")
    if not all([user_id, quest_id, image_url]):
        return {"error": "userId, questId, and imageUrl required"}
    if uid != user_id:
        raise HTTPException(status_code=403, detail="You do not own this resource.")
    await check_not_banned(uid)

    project_id = PROJECT_ID
    check_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{uid}/{quest_id}"
    resp = await asyncio.to_thread(rest_session.get, check_url)
    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail="Quest not found")
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{quest_id}"
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
    return await generate_quest(
        city=city, moods=moods, time_limit=time_limit, token=token, lat=lat, lng=lng
    )


@app.post("/get-directions")
async def get_directions(payload: dict = Body(...)):
    print("Received /get-directions payload:", payload)
    try:
        places = payload.get("places", [])
        if not places or len(places) < 2:
            return {"error": "At least two valid places required"}

        origin = f"{places[0]['lat']},{places[0]['lng']}"
        destination = f"{places[-1]['lat']},{places[-1]['lng']}"
        waypoints = [f"{p['lat']},{p['lng']}" for p in places[1:-1]]

        directions_result = gmaps.directions(
            origin=origin,
            destination=destination,
            waypoints=waypoints,
            mode="walking",
            optimize_waypoints=True,
        )

        if not directions_result:
            return {"error": "No route found"}

        route = directions_result[0]
        return {
            "polyline": route.get("overview_polyline", {}).get("points", ""),
            "legs": route.get("legs", []),
        }
    except Exception as e:
        print("Error fetching directions:", str(e))
        return {"error": str(e)}


@app.post("/create-group-quest")
async def create_group_quest(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Create a shared group quest and set user active state."""
    user_id = payload.get("userId")
    quest_id = payload.get("questId")
    display_name = payload.get("displayName")
    if not user_id or not quest_id or uid != user_id:
        return {"error": "userId and questId required"}
    await check_not_banned(uid)

    # ----- Ownership check -----
    project_id = PROJECT_ID
    cust_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    resp = await asyncio.to_thread(rest_session.get, cust_url)
    allowed = False
    if resp.status_code == 200:
        data = _decode_document(resp.json())
        if data.get("creatorId") == uid or data.get("createdBy") == uid:
            allowed = True
    if not allowed:
        user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{uid}/{quest_id}"
        uresp = await asyncio.to_thread(rest_session.get, user_url)
        if uresp.status_code == 200:
            allowed = True
    if not allowed:
        raise HTTPException(status_code=403, detail="You do not own this resource.")

    project_id = PROJECT_ID
    active_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/"
        f"databases/(default)/documents/user_active_quest/{user_id}"
    )
    active_resp = await asyncio.to_thread(rest_session.get, active_url)
    if active_resp.status_code == 200:
        active_fields = _decode_document(active_resp.json())
        if active_fields.get("status") != "completed":
            return {"error": "active quest already"}

    group_id, _ = await create_group_document(user_id, quest_id, display_name)

    active_doc = {
        "groupId": group_id,
        "questId": quest_id,
        "status": "active",
        "visitedStops": [],
        "startedAt": datetime.utcnow().isoformat(),
    }
    active_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_active_quest/{user_id}"
    active_body = {"fields": _encode_fields(active_doc)}
    rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, active_url, json=active_body)

    return {"groupId": group_id}


@app.post("/join-group")
async def join_group(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Add a user to an existing group quest."""
    user_id = payload.get("userId")
    group_id = payload.get("groupId")
    display_name = payload.get("displayName")
    if not user_id or not group_id or uid != user_id:
        return {"error": "userId and groupId required"}
    await check_not_banned(uid)

    # Validate session availability early
    rest_session = get_rest_session()
    if not rest_session:
        return JSONResponse(
            status_code=503, content={"error": "Service temporarily unavailable"}
        )

    project_id = PROJECT_ID
    active_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_active_quest/{user_id}"
    active_resp = await asyncio.to_thread(rest_session.get, active_url)
    if active_resp.status_code == 200:
        active_fields = _decode_document(active_resp.json())
        if active_fields.get("status") != "completed" and active_fields.get(
            "groupId"
        ) not in (None, group_id):
            return {"error": "active quest already"}

    try:
        group_doc = await add_user_to_group(user_id, group_id, display_name)
    except RuntimeError as exc:
        return {"error": str(exc)}

    active_doc = {
        "groupId": group_id,
        "questId": group_doc.get("questId"),
        "status": "active",
        "visitedStops": group_doc.get("progress", {}).get(user_id, []),
        "startedAt": datetime.utcnow().isoformat(),
    }
    active_body = {"fields": _encode_fields(active_doc)}
    rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, active_url, json=active_body)

    return {"status": "joined", "questId": group_doc.get("questId")}


@app.post("/track-stop-visit")
async def track_stop_visit(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Track a stop visit for a group quest."""
    # Validate session availability early
    rest_session = get_rest_session()
    if not rest_session:
        return JSONResponse(
            status_code=503, content={"error": "Service temporarily unavailable"}
        )

    group_id = payload.get("groupId")
    user_id = payload.get("userId")
    place_index = payload.get("placeIndex")
    if group_id is None or user_id is None or place_index is None:
        return {"error": "groupId, userId and placeIndex required"}
    if uid != user_id:
        raise HTTPException(status_code=403, detail="You do not own this resource.")
    await check_not_banned(uid)

    project_id = PROJECT_ID
    group_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/"
        f"databases/(default)/documents/group_quests/{group_id}"
    )
    resp = await asyncio.to_thread(rest_session.get, group_url)
    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail="Group not found")
    fields = _decode_document(resp.json())
    if fields.get("completed"):
        raise HTTPException(status_code=400, detail="Group completed")
    if not any(m.get("userId") == user_id for m in fields.get("members", [])):
        raise HTTPException(status_code=403, detail="You do not own this resource.")

    progress = fields.get("progress", {})
    user_progress = progress.get(user_id, [])
    new_visit = place_index not in user_progress
    if new_visit:
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
    active_fields.update(
        {
            "groupId": group_id,
            "questId": fields.get("questId"),
            "status": "active",
            "visitedStops": user_progress,
        }
    )
    active_body = {"fields": _encode_fields(active_fields)}
    await asyncio.to_thread(rest_session.patch, active_url, json=active_body)

    # ----- XP & Badges -----
    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, user_url)
    user_data = {}
    if resp.status_code == 200:
        user_data = _decode_document(resp.json())

    total_xp = user_data.get("totalXP", 0)
    level = user_data.get("level", 1)
    stats = user_data.get("stats", {})
    badges = user_data.get("badges", {})

    if new_visit:
        total_xp += 10
        level = get_level_from_xp(total_xp)
        stats["totalStopsVisited"] = stats.get("totalStopsVisited", 0) + 1
        stats["totalXP"] = total_xp

    new_badges = []
    if stats.get("totalStopsVisited", 0) >= 10:
        new_badges.append("adventurer")
    if stats.get("totalQuestsCompleted", 0) >= 5:
        new_badges.append("explorer")
    badge_list = user_data.get("badgesUnlocked", [])
    unlocked_now = compute_badge_unlocks(stats, level, badge_list)
    new_badges.extend([b for b in unlocked_now if b not in new_badges])
    for b in new_badges:
        badges[b] = True
        if b not in badge_list:
            badge_list.append(b)

    user_body = {
        "fields": _encode_fields(
            {
                "totalXP": total_xp,
                "level": level,
                "stats": stats,
                "badges": badges,
                "badgesUnlocked": badge_list,
            }
        )
    }
    rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, user_url, json=user_body)

    return {
        "visitedStops": user_progress,
        "totalXP": total_xp,
        "level": level,
        "badges": badges,
    }


@app.post("/complete-group-quest")
async def complete_group_quest(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Mark a group quest as completed by a user."""
    # Validate session availability early
    rest_session = get_rest_session()
    if not rest_session:
        return JSONResponse(
            status_code=503, content={"error": "Service temporarily unavailable"}
        )

    group_id = payload.get("groupId")
    user_id = payload.get("userId")
    if not group_id or not user_id:
        return {"error": "groupId and userId required"}
    if uid != user_id:
        raise HTTPException(status_code=403, detail="You do not own this resource.")
    await check_not_banned(uid)

    project_id = PROJECT_ID
    group_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/"
        f"databases/(default)/documents/group_quests/{group_id}"
    )
    resp = await asyncio.to_thread(rest_session.get, group_url)
    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail="Group not found")
    fields = _decode_document(resp.json())
    if fields.get("completed"):
        raise HTTPException(status_code=400, detail="Group already completed")
    if not any(m.get("userId") == user_id for m in fields.get("members", [])):
        raise HTTPException(status_code=403, detail="You do not own this resource.")
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
    # Validate session availability early
    rest_session = get_rest_session()
    if not rest_session:
        return JSONResponse(
            status_code=503, content={"error": "Service temporarily unavailable"}
        )

    project_id = PROJECT_ID
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
        gurl = (
            f"https://firestore.googleapis.com/v1/projects/{project_id}/"
            f"databases/(default)/documents/group_quests/{active['groupId']}"
        )
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


@app.get("/user-xp/{user_id}")
async def get_user_xp(user_id: str):
    """Return XP and level for the given user."""
    # Validate session availability early
    rest_session = get_rest_session()
    if not rest_session:
        return JSONResponse(
            status_code=503, content={"error": "Service temporarily unavailable"}
        )

    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        data = {}
    else:
        data = _decode_document(resp.json())
    xp = data.get("xp")
    if xp is None:
        xp = data.get("totalXP", 0)
    level = data.get("level")
    if level is None:
        level = get_level_from_xp(xp)
    return {
        "xp": xp,
        "totalXP": xp,
        "level": level,
        "streakCount": data.get("streakCount", 0),
        "badgesUnlocked": data.get("badgesUnlocked", []),
        "showRoamioWatermark": data.get("showRoamioWatermark", True),
        "skipSharePrompt": data.get("skipSharePrompt", False),
        "publicSharingOptIn": data.get("publicSharingOptIn", False),
        "showUsernameOnShare": data.get("showUsernameOnShare", True),
        "showCityOnShare": data.get("showCityOnShare", True),
        "showOnLeaderboard": data.get("showOnLeaderboard", True),
        "nickname": data.get("nickname"),
    }


@app.get("/user-badges/{user_id}")
async def get_user_badges(user_id: str):
    """Return list of badges with metadata for the user."""
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}/badges"
    resp = await asyncio.to_thread(rest_session.get, url)
    badges = []
    if resp.status_code == 200:
        data = resp.json().get("documents", [])
        for doc in data:
            obj = _decode_document(doc)
            obj["id"] = doc["name"].split("/")[-1]
            badges.append(obj)
    return {"badges": badges}


@app.get("/leaderboard")
async def get_leaderboard(
    field: str = Query("xp"),
    limit: int = Query(50),
    city: str | None = Query(None),
    timeframe: str = Query("all"),
):
    """Return leaderboard entries sorted by the chosen field."""
    project_id = PROJECT_ID
    filters = [
        {
            "fieldFilter": {
                "field": {"fieldPath": "showOnLeaderboard"},
                "op": "EQUAL",
                "value": {"booleanValue": True},
            }
        }
    ]
    if city:
        filters.append(
            {
                "fieldFilter": {
                    "field": {"fieldPath": "city"},
                    "op": "EQUAL",
                    "value": {"stringValue": city},
                }
            }
        )
    if timeframe == "week":
        since = (datetime.utcnow() - timedelta(days=7)).isoformat()
        filters.append(
            {
                "fieldFilter": {
                    "field": {"fieldPath": "lastCompleted"},
                    "op": "GREATER_THAN_OR_EQUAL",
                    "value": {"stringValue": since},
                }
            }
        )
    if len(filters) == 1:
        where = filters[0]
    else:
        where = {"compositeFilter": {"op": "AND", "filters": filters}}
    query = {
        "structuredQuery": {
            "from": [{"collectionId": "users"}],
            "where": where,
            "orderBy": [{"field": {"fieldPath": field}, "direction": "DESCENDING"}],
            "limit": limit,
        }
    }
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents:runQuery"
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
    return {"users": results}


@app.post("/leave-group")
async def leave_group(payload: dict = Body(...)):
    """Remove a user from a group and clear their active quest."""
    # Validate session availability early
    rest_session = get_rest_session()
    if not rest_session:
        return JSONResponse(
            status_code=503, content={"error": "Service temporarily unavailable"}
        )

    user_id = payload.get("userId")
    group_id = payload.get("groupId")
    if not user_id or not group_id:
        return {"error": "userId and groupId required"}

    project_id = PROJECT_ID
    group_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/"
        f"databases/(default)/documents/group_quests/{group_id}"
    )
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


@app.get("/group-quest/{group_id}")
async def get_group_quest(group_id: str):
    """Fetch a group quest document via Firestore REST."""
    # Validate session availability early
    rest_session = get_rest_session()
    if not rest_session:
        return JSONResponse(
            status_code=503, content={"error": "Service temporarily unavailable"}
        )

    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/group_quests/{group_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return resp.json()


@app.post("/report-quest")
async def report_quest(payload: dict = Body(...)):
    """Receive a quest report and store in Firestore."""
    # Validate session availability early
    rest_session = get_rest_session()
    if not rest_session:
        return JSONResponse(
            status_code=503, content={"error": "Service temporarily unavailable"}
        )

    user_id = payload.get("userId")
    quest_id = payload.get("questId")
    reason = payload.get("reason")
    if not user_id or not quest_id or not reason:
        return {"error": "userId, questId and reason required"}

    project_id = PROJECT_ID
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
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quest_reports:runQuery"
    query = {
        "structuredQuery": {
            "from": [{"collectionId": "quest_reports"}],
            "orderBy": [
                {"field": {"fieldPath": "timestamp"}, "direction": "DESCENDING"}
            ],
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

    project_id = PROJECT_ID
    doc_id = f"{quest_id}_{user_id}"
    url = f"https://firestore.googleapis.com/v1/projects/real-world-quest-app/databases/(default)/documents:runQuery"
    body = {"fields": _encode_fields({"visible": visible})}
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return {"status": "updated"}


@app.post("/ugc-submit")
async def ugc_submit(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Record a user's social media submission for the weekly tag."""
    if uid != payload.get("uid"):
        return JSONResponse(status_code=401, content={"error": "unauthorized"})
    await check_not_banned(uid)
    tag = payload.get("tag")
    platform = payload.get("platform")
    image_url = payload.get("imageUrl")
    if not tag or not platform:
        return {"error": "tag and platform required"}
    project_id = PROJECT_ID
    cfg_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/config/ugcWeeklyTag"
    cfg_resp = await asyncio.to_thread(rest_session.get, cfg_url)
    cfg = _decode_document(cfg_resp.json()) if cfg_resp.status_code == 200 else {}
    active_tag = cfg.get("activeTag")
    if tag != active_tag:
        return {"error": "invalidTag"}
    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{uid}"
    uresp = await asyncio.to_thread(rest_session.get, user_url)
    ufields = _decode_document(uresp.json()) if uresp.status_code == 200 else {}
    used = ufields.get("ugcTagsUsed", [])
    if active_tag in used:
        return {"error": "duplicate"}
    doc_id = hashlib.sha1(f"{uid}-{tag}".encode()).hexdigest()[:16]
    sub_doc = {
        "uid": uid,
        "tag": tag,
        "platform": platform,
        "timestamp": datetime.utcnow().isoformat(),
    }
    if image_url:
        sub_doc["imageUrl"] = image_url
    sub_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/ugc_submissions/{doc_id}"
    await asyncio.to_thread(
        rest_session.patch, sub_url, json={"fields": _encode_fields(sub_doc)}
    )
    used.append(active_tag)
    ufields.update(
        {
            "lastUGCSubmission": datetime.utcnow().isoformat(),
            "ugcBoostActive": True,
            "ugcTagsUsed": used,
        }
    )
    await asyncio.to_thread(
        rest_session.patch, user_url, json={"fields": _encode_fields(ufields)}
    )
    return {"status": "ok", "xpMultiplier": cfg.get("xpMultiplier", 1.0)}


@app.get("/config/ugcWeeklyTag")
async def get_weekly_tag():
    """Return current UGC weekly tag configuration."""
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/config/ugcWeeklyTag"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        return {}
    return _decode_document(resp.json())


@app.get("/get-community-quests")
async def get_community_quests() -> dict[str, list[dict[str, Any]]]:
    """
    Fetches the latest public community quests from Firestore.
    Uses Firestore's REST API with a structuredQuery sorted by completedAt.
    """
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents:runQuery"

    query = {
        "structuredQuery": {
            "from": [{"collectionId": "community_quests"}],
            "orderBy": [
                {"field": {"fieldPath": "completedAt"}, "direction": "DESCENDING"}
            ],
            "limit": 20,
        }
    }

    try:
        print(f"[📡] Sending Firestore request to {url}")
        resp = await asyncio.to_thread(rest_session.post, url, json=query)
        resp.raise_for_status()
        print("[✅] Firestore query successful")
    except requests.RequestException as e:
        error_msg = e.response.text if e.response else str(e)
        print("🔥 Firestore REST error:", error_msg)
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to fetch community quests", "details": error_msg},
        )

    try:
        raw_results = resp.json()
    except Exception as e:
        print("🔥 Failed to parse Firestore response JSON:", str(e))
        return JSONResponse(
            status_code=500, content={"error": "Invalid Firestore JSON response"}
        )

    quests = []

    for entry in raw_results:
        doc = entry.get("document")
        if not doc:
            print("⚠️ Skipping result: missing 'document' field")
            continue

        try:
            data = _decode_document(doc)
        except Exception as e:
            print(f"⚠️ Failed to decode Firestore document: {e}")
            continue

        if data.get("visible") is False:
            continue

        data["id"] = doc["name"].split("/")[-1]
        quests.append(data)

    print(f"[🎯] Returning {len(quests)} community quests")
    return {"quests": quests}


@app.get("/ugc-feed")
async def get_ugc_feed(mood: str | None = Query(None), city: str | None = Query(None)):
    """Return public UGC feed entries with optional filters."""
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/ugc_feed:runQuery"
    filters = []
    if mood:
        filters.append(
            {
                "fieldFilter": {
                    "field": {"fieldPath": "mood"},
                    "op": "EQUAL",
                    "value": {"stringValue": mood},
                }
            }
        )
    if city:
        filters.append(
            {
                "fieldFilter": {
                    "field": {"fieldPath": "city"},
                    "op": "EQUAL",
                    "value": {"stringValue": city},
                }
            }
        )
    query = {
        "structuredQuery": {
            "from": [{"collectionId": "ugc_feed"}],
            "orderBy": [
                {"field": {"fieldPath": "timestamp"}, "direction": "DESCENDING"}
            ],
            "limit": 20,
        }
    }
    if filters:
        where = (
            filters[0]
            if len(filters) == 1
            else {"compositeFilter": {"op": "AND", "filters": filters}}
        )
        query["structuredQuery"]["where"] = where
    resp = await asyncio.to_thread(rest_session.post, url, json=query)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    raw = resp.json()
    posts = []
    for item in raw:
        doc = item.get("document")
        if not doc:
            continue
        obj = _decode_document(doc)
        if obj.get("isFlagged"):
            continue
        obj["id"] = doc["name"].split("/")[-1]
        posts.append(obj)
    return {"posts": posts}


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
            session = await create_subscription_session(user_id, email, success, cancel)
            return {"url": session.url}
        except Exception as e:
            print("Stripe error", e)
            return {"error": "stripe failed"}
    # Fallback mock URL
    return {"url": success.replace("{CHECKOUT_SESSION_ID}", "mock")}


@app.get("/validate-premium/{user_id}")
async def validate_premium(user_id: str, session_id: str | None = Query(None)):
    """Check premium flag and optionally verify checkout session."""
    # Validate session availability early
    rest_session = get_rest_session()
    if not rest_session:
        return JSONResponse(
            status_code=503, content={"error": "Service temporarily unavailable"}
        )

    project_id = PROJECT_ID
    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, user_url)
    fields = {}
    if resp.status_code == 200:
        fields = _decode_document(resp.json())
    premium = fields.get("isPremium") is True

    if not premium and session_id:
        stripe_key = os.getenv("STRIPE_SECRET_KEY")
        if stripe_key and session_id != "mock":
            try:
                import stripe

                stripe.api_key = stripe_key
                sess = await asyncio.to_thread(
                    stripe.checkout.Session.retrieve, session_id
                )
                premium = sess.get("payment_status") == "paid"
            except Exception as e:
                print("Stripe verify error", e)
                premium = False
        elif session_id == "mock":
            premium = True
        if premium:
            fields["isPremium"] = True
            body = {"fields": _encode_fields(fields)}
            rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, user_url, json=body)

    return {"isPremium": premium}


@app.post("/validate-premium")
async def validate_premium_token(uid: str = Depends(require_user)):
    """Return premium status for the authenticated user."""
    # Validate session availability early
    rest_session = get_rest_session()
    if not rest_session:
        return JSONResponse(
            status_code=503, content={"error": "Service temporarily unavailable"}
        )

    await check_not_banned(uid)
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{uid}"
    resp = await asyncio.to_thread(rest_session.get, url)
    fields = _decode_document(resp.json()) if resp.status_code == 200 else {}
    premium = fields.get("isPremium") is True
    return {"isPremium": premium}


@app.post("/api/stripe-webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not stripe_key or not webhook_secret:
        return {"status": "disabled"}

    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = verify_webhook(payload, sig)
    except Exception as e:
        print("Webhook verify error", e)
        return JSONResponse(status_code=400, content={"error": "invalid"})

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        email = session.get("customer_details", {}).get("email") or session.get(
            "customer_email"
        )
        if email:
            try:
                user = await asyncio.to_thread(fb_auth.get_user_by_email, email)
                uid = user.uid
                project_id = PROJECT_ID
                url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{uid}"
                rest_session = get_rest_session()
                resp = await asyncio.to_thread(rest_session.get, url)
                fields = (
                    _decode_document(resp.json()) if resp.status_code == 200 else {}
                )
                if not fields.get("isPremium"):
                    fields["isPremium"] = True
                    body = {"fields": _encode_fields(fields)}
                    rest_session = get_rest_session()
                    await asyncio.to_thread(rest_session.patch, url, json=body)
                    await log_admin_event(
                        "stripe_checkout", {"uid": uid, "session": session.get("id")}
                    )
            except Exception as e:
                print("User email lookup failed", e)
        else:
            print("No email on session")

    return {"received": True}


@app.post("/update-active-quest")
async def update_active_quest(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Patch the user's active quest document with extra data."""
    user_id = payload.get("userId")
    data = payload.get("data")
    if not user_id or not isinstance(data, dict):
        return {"error": "userId and data required"}
    if uid != user_id:
        raise HTTPException(status_code=403, detail="You do not own this resource.")
    await check_not_banned(uid)

    project_id = PROJECT_ID
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
async def create_custom_quest(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Create a custom quest for the authenticated premium user."""
    await check_not_banned(uid)
    if not await is_premium_user(uid):
        return JSONResponse(status_code=403, content={"error": "Premium required"})

    location_list = payload.get("locationList", [])
    if len(location_list) < 2:
        return JSONResponse(
            status_code=400,
            content={"error": "locationList must have at least 2 entries"},
        )

    data = {
        "title": payload.get("title") or "Custom Quest",
        "questText": payload.get("questText", ""),
        "locationList": location_list,
        "mood": payload.get("mood", []),
        "isPublic": payload.get("isPublic", False),
    }
    if payload.get("remixedFrom"):
        data["remixedFrom"] = payload["remixedFrom"]

    try:
        quest_id = await write_custom_quest(data, uid)
        return {"questId": quest_id}
    except Exception as e:
        print("create_custom_quest error", e)
        return JSONResponse(
            status_code=500, content={"error": "Failed to save custom quest"}
        )


@app.post("/update-custom-quest")
async def update_custom_quest(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Update an existing custom quest for the authenticated user."""
    quest_id = payload.get("quest_id")
    if not quest_id:
        return {"error": "quest_id required"}
    await check_not_banned(uid)

    project_id = PROJECT_ID
    own_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    resp = await asyncio.to_thread(rest_session.get, own_url)
    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail="Quest not found")
    doc = _decode_document(resp.json())
    if doc.get("creatorId") != uid and doc.get("createdBy") != uid:
        raise HTTPException(status_code=403, detail="You do not own this resource.")

    data = payload.get("data", {})
    data["updatedAt"] = datetime.utcnow().isoformat()
    project_id = PROJECT_ID
    body = {"fields": _encode_fields(data)}

    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{uid}/{quest_id}"
    global_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    for url in (user_url, global_url):
        resp = await asyncio.to_thread(rest_session.patch, url, json=body)
        if resp.status_code != 200:
            print("Firestore REST error", resp.text)
            resp.raise_for_status()

    return {"status": "updated"}


@app.get("/custom-quests/{quest_id}")
async def get_custom_quest_endpoint(quest_id: str):
    """Publicly fetch a custom quest by its ID."""
    quest = await fs_get_custom_quest(quest_id)
    if not quest:
        return JSONResponse(status_code=404, content={"error": "not found"})
    quest["id"] = quest_id
    return quest


@app.get("/custom-quests")
async def list_custom_quests(
    creatorId: str = Query(...), publicOnly: bool = Query(False)
):
    """Return custom quests filtered by creator ID."""
    quests = await query_custom_quests_by_creator(creatorId, public_only=publicOnly)
    return {"quests": quests}


@app.post("/publish-custom-quest")
async def publish_custom_quest(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Mark a custom quest as public and published."""
    user_id = payload.get("user_id")
    quest_id = payload.get("quest_id")
    if not user_id or not quest_id:
        return {"error": "user_id and quest_id required"}
    if uid != user_id:
        raise HTTPException(status_code=403, detail="You do not own this resource.")
    await check_not_banned(uid)

    project_id = PROJECT_ID
    own_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    resp = await asyncio.to_thread(rest_session.get, own_url)
    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail="Quest not found")
    data = _decode_document(resp.json())
    if data.get("creatorId") != uid and data.get("createdBy") != uid:
        raise HTTPException(status_code=403, detail="You do not own this resource.")

    patch_fields = {
        "status": "published",
        "public": True,
        "publishedAt": datetime.utcnow().isoformat(),
    }
    body = {"fields": _encode_fields(patch_fields)}

    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{quest_id}"
    global_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    for url in (user_url, global_url):
        resp = await asyncio.to_thread(rest_session.patch, url, json=body)
        if resp.status_code != 200:
            print("Firestore REST error", resp.text)
            resp.raise_for_status()

    return {"status": "published"}


@app.post("/unpublish-custom-quest")
async def unpublish_custom_quest(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Mark a custom quest as draft and private."""
    user_id = payload.get("user_id")
    quest_id = payload.get("quest_id")
    if not user_id or not quest_id:
        return {"error": "user_id and quest_id required"}
    if uid != user_id:
        raise HTTPException(status_code=403, detail="You do not own this resource.")
    await check_not_banned(uid)

    project_id = PROJECT_ID
    own_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    resp = await asyncio.to_thread(rest_session.get, own_url)
    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail="Quest not found")
    data = _decode_document(resp.json())
    if data.get("creatorId") != uid and data.get("createdBy") != uid:
        raise HTTPException(status_code=403, detail="You do not own this resource.")
    patch_fields = {
        "status": "draft",
        "public": False,
    }
    body = {"fields": _encode_fields(patch_fields)}

    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{quest_id}"
    global_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    for url in (user_url, global_url):
        resp = await asyncio.to_thread(rest_session.patch, url, json=body)
        if resp.status_code != 200:
            print("Firestore REST error", resp.text)
            resp.raise_for_status()

    return {"status": "unpublished"}


@app.post("/like-quest")
async def like_quest(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Record a quest like and increment counter."""
    user_id = payload.get("user_id")
    quest_id = payload.get("quest_id")
    if not user_id or not quest_id or uid != user_id:
        return {"error": "user_id and quest_id required"}
    await check_not_banned(uid)
    # TODO: enforce one like per user in Firestore security rules  # 🔒 MANUAL FIX NEEDED

    project_id = PROJECT_ID
    like_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quest_likes/{quest_id}/{user_id}"
    body = {"fields": _encode_fields({"timestamp": datetime.utcnow().isoformat()})}
    resp = await asyncio.to_thread(rest_session.patch, like_url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    quest_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    qresp = await asyncio.to_thread(rest_session.get, quest_url)
    if qresp.status_code == 200:
        data = _decode_document(qresp.json())
        count = data.get("likesCount", 0) + 1
        patch = {"fields": _encode_fields({"likesCount": count})}
        rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, quest_url, json=patch)

    return {"status": "liked"}


@app.post("/view-quest")
async def view_quest(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Record a unique quest view."""
    user_id = payload.get("user_id")
    quest_id = payload.get("quest_id")
    if not user_id or not quest_id or uid != user_id:
        return {"error": "user_id and quest_id required"}
    await check_not_banned(uid)

    project_id = PROJECT_ID
    view_doc = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quest_views/{quest_id}/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, view_doc)
    if resp.status_code == 404:
        body = {"fields": _encode_fields({"timestamp": datetime.utcnow().isoformat()})}
        rest_session = get_rest_session()
        await asyncio.to_thread(rest_session.patch, view_doc, json=body)

        quest_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
        qresp = await asyncio.to_thread(rest_session.get, quest_url)
        if qresp.status_code == 200:
            data = _decode_document(qresp.json())
            count = data.get("viewsCount", 0) + 1
            patch = {"fields": _encode_fields({"viewsCount": count})}
            rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, quest_url, json=patch)

    return {"status": "viewed"}


@app.post("/replay-quest")
async def replay_quest(payload: dict = Body(...)):
    """Increment replay counter for a quest."""
    quest_id = payload.get("quest_id")
    if not quest_id:
        return {"error": "quest_id required"}

    project_id = PROJECT_ID
    quest_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    qresp = await asyncio.to_thread(rest_session.get, quest_url)
    if qresp.status_code == 200:
        data = _decode_document(qresp.json())
        count = data.get("replaysCount", 0) + 1
        patch = {"fields": _encode_fields({"replaysCount": count})}
        rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, quest_url, json=patch)

    return {"status": "replayed"}


@app.post("/create-community-group")
async def create_community_group(payload: dict = Body(...)):
    """Create a new community group."""
    name = payload.get("name")
    creator = payload.get("creator")
    if not name or not creator:
        return {"error": "name and creator required"}

    project_id = PROJECT_ID
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
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/community_groups/{group_id}"
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

    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/community_groups/{group_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        return {"error": "group not found"}
    data = _decode_document(resp.json())
    members = data.get("members", [])
    if user_id not in members:
        members.append(user_id)
        data["members"] = members
        body = {"fields": _encode_fields(data)}
        rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, url, json=body)
    return {"status": "joined"}


@app.post("/link-quest-to-group")
async def link_quest_to_group(payload: dict = Body(...)):
    group_id = payload.get("group_id")
    quest_id = payload.get("quest_id")
    upcoming = payload.get("upcoming", False)
    if not group_id or not quest_id:
        return {"error": "group_id and quest_id required"}

    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/community_groups/{group_id}"
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
    rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, url, json=body)
    return {"status": "linked"}


@app.get("/audit-quest-cache")
async def audit_quest_cache():
    """Return quests with overly long or malformed text."""
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests:runQuery"
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
        candidates.append(
            {
                "name": name,
                "type": pl.get("types", ["Unknown"])[0],
                "lat": float(loc["lat"]),
                "lng": float(loc["lng"]),
                "tags": tags,
                "rating": pl.get("rating", 0),
            }
        )

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

    ordered = [selected[0]] + [selected[i + 1] for i in order] + [selected[-1]]

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
    project_id = PROJECT_ID
    results = {"public": [], "custom": [], "user": []}

    def _matches(obj: dict) -> bool:
        hay = " ".join(
            [
                str(obj.get("city", "")),
                str(obj.get("mood", "")),
                " ".join(obj.get("tags", [])),
                str(obj.get("title", "")),
            ]
        ).lower()
        return any(tok in hay for tok in tokens)

    # community quests
    # Run query against the community_quests collection
    cq_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents:runQuery"
    cq_query = {
        "structuredQuery": {
            "from": [{"collectionId": "community_quests"}],
            "orderBy": [
                {"field": {"fieldPath": "completedAt"}, "direction": "DESCENDING"}
            ],
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
    # Published custom quests
    cust_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents:runQuery"
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
        uq_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}:runQuery"
        uq_query = {
            "structuredQuery": {"from": [{"collectionId": "quests"}], "limit": 20}
        }
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

    project_id = PROJECT_ID
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
        rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, quest_url, json=patch)

    new_id = hashlib.sha1(
        f"{user_id}-{datetime.utcnow()}-{quest_id}".encode()
    ).hexdigest()[:12]
    user_doc = {
        "questIdRef": quest_id,
        "generatedAt": datetime.utcnow().isoformat(),
        "questData": quest_data,
    }
    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{new_id}"
    body = {"fields": _encode_fields(user_doc)}
    rest_session = get_rest_session()
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

    rebuilt = await rebuild_quest_cache(
        {"city": location, "mood": mood, "tagOverride": tags}
    )
    quest = rebuilt.get("quest")
    quest_id = rebuilt.get("hash")

    user_doc = {
        "questIdRef": quest_id,
        "generatedAt": datetime.utcnow().isoformat(),
        "questData": quest,
    }
    project_id = PROJECT_ID
    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/user_quests/{user_id}/{quest_id}"
    body = {"fields": _encode_fields(user_doc)}
    rest_session = get_rest_session()
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

    community_id = hashlib.sha1(
        f"{owner_id}-{name}-{datetime.utcnow()}".encode()
    ).hexdigest()[:12]
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
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/communities/{community_id}"
    body = {"fields": _encode_fields(doc)}
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{owner_id}/joinedCommunities/{community_id}"
    join_doc = {"communityId": community_id, "joinedAt": created_at}
    join_body = {"fields": _encode_fields(join_doc)}
    rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, user_url, json=join_body)

    return {"communityId": community_id}


@app.post("/join-community")
async def join_community(payload: dict = Body(...)):
    user_id = payload.get("userId")
    community_id = payload.get("communityId")
    if not user_id or not community_id:
        return {"error": "userId and communityId required"}

    project_id = PROJECT_ID
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
        rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, url, json=body)

    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}/joinedCommunities/{community_id}"
    join_doc = {"communityId": community_id, "joinedAt": datetime.utcnow().isoformat()}
    join_body = {"fields": _encode_fields(join_doc)}
    rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, user_url, json=join_body)

    return {"status": "joined"}


@app.post("/publish-to-community")
async def publish_to_community(payload: dict = Body(...)):
    community_id = payload.get("communityId")
    quest_id = payload.get("questId")
    if not community_id or not quest_id:
        return {"error": "communityId and questId required"}

    project_id = PROJECT_ID
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
        rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, url, json=body)

    return {"status": "published"}


@app.get("/community/{community_id}")
async def get_community(community_id: str):
    project_id = PROJECT_ID
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
    project_id = PROJECT_ID
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
            "orderBy": [
                {"field": {"fieldPath": "followerCount"}, "direction": "DESCENDING"}
            ],
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
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code == 200:
        data = _decode_document(resp.json())
        return data.get("isAdmin") is True
    return False


async def _verify_creator(user_id: str) -> bool:
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/creators/{user_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code == 200:
        data = _decode_document(resp.json())
        return data.get("isApproved", True) is True
    return False


@app.get("/admin/dashboard")
async def admin_dashboard(userId: str = Query(...)):
    if not await _verify_admin(userId):
        return JSONResponse(status_code=403, content={"error": "Access denied"})

    project_id = PROJECT_ID
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
    all_users = await asyncio.to_thread(
        rest_session.post,
        users_url,
        json={"structuredQuery": {"from": [{"collectionId": "users"}]}},
    )
    total_users = sum(1 for i in all_users.json() if i.get("document"))

    # top cities
    quests_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/quests:runQuery"
    q_resp = await asyncio.to_thread(
        rest_session.post,
        quests_url,
        json={"structuredQuery": {"from": [{"collectionId": "quests"}]}},
    )
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
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/reports/{report_id}"
    patch = {"fields": _encode_fields({"resolved": True})}
    rest_session = get_rest_session()
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
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/{'custom_quests' if qtype=='custom' else 'quests'}/{quest_id}"
    rest_session = get_rest_session()
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
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{target_id}"
    patch = {"fields": _encode_fields({"banned": True})}
    rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, url, json=patch)
    return {"status": "banned"}


@app.get("/admin/ugc-analytics")
async def admin_ugc_analytics(userId: str = Query(...), week: str = Query(None)):
    if not await _verify_admin(userId):
        return JSONResponse(status_code=403, content={"error": "Access denied"})
    if not week:
        week = datetime.utcnow().strftime("%Y-%W")
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/ugc_analytics/{week}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        return {}
    return _decode_document(resp.json())


@app.get("/admin/analytics")
async def admin_analytics(userId: str = Query(...), days: int = Query(30)):
    """Return aggregate product metrics for admins."""
    if not await _verify_admin(userId):
        return JSONResponse(status_code=403, content={"error": "Access denied"})

    days = int(days or 0)
    start = None
    if days > 0:
        start = (datetime.utcnow() - timedelta(days=days - 1)).strftime("%Y-%m-%d")

    project_id = PROJECT_ID
    run_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents:runQuery"

    # ===== Users =====
    users_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users:runQuery"
    all_users = await asyncio.to_thread(
        rest_session.post,
        users_url,
        json={"structuredQuery": {"from": [{"collectionId": "users"}]}},
    )
    total_users = sum(1 for i in all_users.json() if i.get("document"))

    growth = {}
    if start:
        new_query = {
            "structuredQuery": {
                "from": [{"collectionId": "users"}],
                "where": {
                    "fieldFilter": {
                        "field": {"fieldPath": "createdAt"},
                        "op": "GREATER_THAN_OR_EQUAL",
                        "value": {"stringValue": start},
                    }
                },
            }
        }
        new_resp = await asyncio.to_thread(rest_session.post, users_url, json=new_query)
        for item in new_resp.json():
            doc = item.get("document")
            if not doc:
                continue
            data = _decode_document(doc)
            day = data.get("createdAt", "")[:10]
            growth[day] = growth.get(day, 0) + 1
        new_users = sum(growth.values())
    else:
        new_users = total_users

    # ===== Quests Generated =====
    q_query = {
        "structuredQuery": {
            "from": [{"collectionId": "user_quests", "allDescendants": True}]
        }
    }
    if start:
        q_query["structuredQuery"]["where"] = {
            "fieldFilter": {
                "field": {"fieldPath": "generatedAt"},
                "op": "GREATER_THAN_OR_EQUAL",
                "value": {"stringValue": start},
            }
        }
    q_resp = await asyncio.to_thread(rest_session.post, run_url, json=q_query)
    quest_docs = [i for i in q_resp.json() if i.get("document")]
    quests_count = len(quest_docs)

    moods = {}
    diff = {}
    for item in quest_docs:
        data = _decode_document(item["document"])
        m = data.get("mood")
        d = data.get("difficulty")
        if m:
            for mpart in str(m).split(","):
                moods[mpart] = moods.get(mpart, 0) + 1
        if d:
            diff[d] = diff.get(d, 0) + 1

    # ===== Completed Quests =====
    comp_query = {
        "structuredQuery": {
            "from": [{"collectionId": "user_quests", "allDescendants": True}],
            "where": {
                "fieldFilter": {
                    "field": {"fieldPath": "completedAt"},
                    "op": "GREATER_THAN_OR_EQUAL",
                    "value": {"stringValue": start or "1970-01-01"},
                }
            },
        }
    }
    if not start:
        comp_query["structuredQuery"]["where"] = {
            "unaryFilter": {"field": {"fieldPath": "completedAt"}, "op": "IS_NOT_NULL"}
        }
    comp_resp = await asyncio.to_thread(rest_session.post, run_url, json=comp_query)
    completed_count = sum(1 for i in comp_resp.json() if i.get("document"))
    completion_rate = (completed_count / quests_count) if quests_count else 0

    # ===== Group Quests =====
    group_query = {"structuredQuery": {"from": [{"collectionId": "group_quests"}]}}
    if start:
        group_query["structuredQuery"]["where"] = {
            "fieldFilter": {
                "field": {"fieldPath": "createdAt"},
                "op": "GREATER_THAN_OR_EQUAL",
                "value": {"stringValue": start},
            }
        }
    g_resp = await asyncio.to_thread(rest_session.post, run_url, json=group_query)
    group_total = 0
    member_total = 0
    for item in g_resp.json():
        doc = item.get("document")
        if not doc:
            continue
        data = _decode_document(doc)
        group_total += 1
        member_total += len(data.get("members", []))
    avg_group_size = (member_total / group_total) if group_total else 0

    # ===== Promo Codes =====
    promo_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/promo_codes:runQuery"
    promo_resp = await asyncio.to_thread(
        rest_session.post,
        promo_url,
        json={"structuredQuery": {"from": [{"collectionId": "promo_codes"}]}},
    )
    promo_counts = {}
    for item in promo_resp.json():
        doc = item.get("document")
        if not doc:
            continue
        data = _decode_document(doc)
        key = data.get("code", doc["name"].split("/")[-1])
        promo_counts[key] = data.get("usageCount", 0)

    top_promo = (
        max(promo_counts.items(), key=lambda x: x[1]) if promo_counts else (None, 0)
    )

    return {
        "totalUsers": total_users,
        "newUsers": new_users,
        "userGrowth": growth,
        "questsGenerated": quests_count,
        "moodBreakdown": moods,
        "difficultyBreakdown": diff,
        "completedQuests": completed_count,
        "completionRate": completion_rate,
        "groupQuests": group_total,
        "avgGroupSize": avg_group_size,
        "promoUsage": promo_counts,
        "topPromo": list(top_promo),
    }


@app.post("/submit-featured-quest")
async def submit_featured_quest(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Allow approved creators to submit a featured quest draft."""
    if uid != payload.get("uid"):
        return JSONResponse(status_code=401, content={"error": "unauthorized"})
    await check_not_banned(uid)
    if not await _verify_creator(uid):
        return JSONResponse(status_code=403, content={"error": "not_creator"})

    project_id = PROJECT_ID
    quest_id = hashlib.sha1(f"{uid}-{datetime.utcnow()}".encode()).hexdigest()[:16]
    quest_doc = {
        "title": payload.get("title") or "Untitled Quest",
        "questText": payload.get("questText", ""),
        "locationList": payload.get("locationList", []),
        "mood": payload.get("mood", ""),
        "imageUrl": payload.get("imageUrl"),
        "submittedBy": uid,
        "createdAt": datetime.utcnow().isoformat(),
        "isApproved": False,
        "adminReviewed": False,
        "tags": payload.get("tags", []),
        "remixable": bool(payload.get("remixable", True)),
        "stats": {"completions": 0, "remixes": 0},
    }
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/featured_quests/{quest_id}"
    body = {"fields": _encode_fields(quest_doc)}
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()

    creator_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/creators/{uid}"
    cresp = await asyncio.to_thread(rest_session.get, creator_url)
    if cresp.status_code == 200:
        data = _decode_document(cresp.json())
        ids = data.get("featuredQuestIds", [])
        if quest_id not in ids:
            ids.append(quest_id)
            patch = {"fields": _encode_fields({"featuredQuestIds": ids})}
            rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, creator_url, json=patch)

    return {"questId": quest_id}


@app.get("/featured-quests")
async def get_featured_quests(approved: bool = Query(True)):
    """Return featured quests optionally filtered by approval."""
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/featured_quests:runQuery"
    query = {
        "structuredQuery": {
            "from": [{"collectionId": "featured_quests"}],
            "orderBy": [
                {"field": {"fieldPath": "createdAt"}, "direction": "DESCENDING"}
            ],
        }
    }
    if approved is not None:
        query["structuredQuery"]["where"] = {
            "fieldFilter": {
                "field": {"fieldPath": "isApproved"},
                "op": "EQUAL",
                "value": {"booleanValue": approved},
            }
        }
    resp = await asyncio.to_thread(rest_session.post, url, json=query)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    raw = resp.json()
    quests = []
    for item in raw:
        doc = item.get("document")
        if not doc:
            continue
        obj = _decode_document(doc)
        obj["id"] = doc["name"].split("/")[-1]
        quests.append(obj)
    return {"quests": quests}


@app.get("/admin/featured-pending")
async def admin_featured_pending(userId: str = Query(...)):
    if not await _verify_admin(userId):
        return JSONResponse(status_code=403, content={"error": "Access denied"})
    return await get_featured_quests(approved=False)


@app.post("/admin/review-featured-quest")
async def admin_review_featured(payload: dict = Body(...)):
    user_id = payload.get("userId")
    quest_id = payload.get("questId")
    approved = payload.get("approved", True)
    if not await _verify_admin(user_id):
        return JSONResponse(status_code=403, content={"error": "Access denied"})
    if not quest_id:
        return {"error": "questId required"}
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/featured_quests/{quest_id}"
    patch = {
        "fields": _encode_fields({"isApproved": bool(approved), "adminReviewed": True})
    }
    resp = await asyncio.to_thread(rest_session.patch, url, json=patch)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return {"status": "updated"}


@app.post("/create-promo-code")
async def create_promo_code(payload: dict = Body(...)):
    """Create a new promo code (admin only)."""
    user_id = payload.get("userId")
    code = str(payload.get("code", "")).strip()
    ptype = payload.get("type")
    if not await _verify_admin(user_id):
        return JSONResponse(status_code=403, content={"error": "Access denied"})
    if not code or ptype not in ("premium", "xp"):
        return {"error": "invalid"}
    data = {
        "type": ptype,
        "createdAt": datetime.utcnow().isoformat(),
        "isActive": True,
        "usageCount": 0,
    }
    if payload.get("expiresAt"):
        data["expiresAt"] = payload["expiresAt"]
    if payload.get("maxUses") is not None:
        data["maxUses"] = int(payload["maxUses"])
    if payload.get("xpAmount") is not None:
        data["xpAmount"] = int(payload["xpAmount"])
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/promo_codes/{code}"
    body = {"fields": _encode_fields(data)}
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    await log_admin_event("create_promo", {"code": code, "admin": user_id})
    return {"status": "created"}


@app.post("/redeem-promo-code")
async def redeem_promo_code(
    payload: dict = Body(...),
    uid: str = Depends(require_user),
):
    """Redeem a promo code for the authenticated user."""
    if uid != payload.get("uid"):
        return JSONResponse(status_code=401, content={"error": "unauthorized"})
    await check_not_banned(uid)
    code = str(payload.get("code", "")).strip()
    if not code:
        return {"error": "code required"}

    project_id = PROJECT_ID
    code_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/promo_codes/{code}"
    resp = await asyncio.to_thread(rest_session.get, code_url)
    if resp.status_code != 200:
        return JSONResponse(status_code=404, content={"error": "invalid_code"})
    code_data = _decode_document(resp.json())
    if not code_data.get("isActive", True):
        return JSONResponse(status_code=400, content={"error": "inactive"})
    if code_data.get("expiresAt"):
        try:
            if datetime.fromisoformat(code_data["expiresAt"]) < datetime.utcnow():
                return JSONResponse(status_code=400, content={"error": "expired"})
        except Exception:
            pass
    if code_data.get("maxUses") is not None and code_data.get("usageCount", 0) >= int(
        code_data.get("maxUses")
    ):
        return JSONResponse(status_code=400, content={"error": "maxed"})

    user_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{uid}"
    uresp = await asyncio.to_thread(rest_session.get, user_url)
    user_fields = _decode_document(uresp.json()) if uresp.status_code == 200 else {}
    redeemed = user_fields.get("redeemedCodes", [])
    if code in redeemed:
        return JSONResponse(status_code=400, content={"error": "duplicate"})
    redeemed.append(code)
    updates = {"redeemedCodes": redeemed}
    effects = {}
    if code_data.get("type") == "premium":
        if not user_fields.get("isPremium"):
            updates["isPremium"] = True
            effects["isPremium"] = True
    elif code_data.get("type") == "xp":
        amt = int(code_data.get("xpAmount", 0))
        total_xp = user_fields.get("totalXP", 0) + amt
        level = get_level_from_xp(total_xp)
        stats = user_fields.get("stats", {})
        stats["totalXP"] = total_xp
        updates.update({"totalXP": total_xp, "level": level, "stats": stats})
        effects["xpAdded"] = amt
    body = {"fields": _encode_fields(updates)}
    presp = await asyncio.to_thread(rest_session.patch, user_url, json=body)
    if presp.status_code != 200:
        print("Firestore REST error", presp.text)
        presp.raise_for_status()
    code_data["usageCount"] = code_data.get("usageCount", 0) + 1
    await asyncio.to_thread(
        rest_session.patch, code_url, json={"fields": _encode_fields(code_data)}
    )
    return {"status": "redeemed", **effects}


@app.post("/admin/create-custom-quest")
async def admin_create_custom_quest(payload: dict = Body(...)):
    user_id = payload.get("userId")
    quest = payload.get("quest")
    if not await _verify_admin(user_id):
        return JSONResponse(status_code=403, content={"error": "Access denied"})
    if not isinstance(quest, dict):
        return {"error": "quest required"}
    try:
        quest_id = await write_custom_quest(quest, user_id)
        await log_admin_event(
            "admin_create_custom", {"admin": user_id, "questId": quest_id}
        )
        return {"questId": quest_id}
    except Exception as e:
        print("admin_create_custom_quest", e)
        return JSONResponse(status_code=500, content={"error": "failed"})


@app.patch("/admin/edit-custom-quest")
async def admin_edit_custom_quest(payload: dict = Body(...)):
    user_id = payload.get("userId")
    quest_id = payload.get("questId")
    data = payload.get("data", {})
    if not await _verify_admin(user_id):
        return JSONResponse(status_code=403, content={"error": "Access denied"})
    if not quest_id:
        return {"error": "questId required"}
    data["updatedAt"] = datetime.utcnow().isoformat()
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{quest_id}"
    body = {"fields": _encode_fields(data)}
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    await log_admin_event("admin_edit_custom", {"admin": user_id, "questId": quest_id})
    return {"status": "updated"}


@app.delete("/admin/delete-custom-quest")
async def admin_delete_custom_quest(
    userId: str = Query(...), questId: str = Query(...)
):
    if not await _verify_admin(userId):
        return JSONResponse(status_code=403, content={"error": "Access denied"})
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/custom_quests/{questId}"
    rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.delete, url)
    await log_admin_event("admin_delete_custom", {"admin": userId, "questId": questId})
    return {"status": "deleted"}


@app.get("/leaderboard-snapshot/{doc_id}")
async def get_leaderboard_snapshot(doc_id: str):
    """Return cached leaderboard document."""
    project_id = PROJECT_ID
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/leaderboards/{doc_id}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        return {}
    return _decode_document(resp.json())


@app.post("/refresh-leaderboards")
async def refresh_leaderboards():
    """Recompute leaderboard snapshots and cache them."""
    project_id = PROJECT_ID
    now = datetime.utcnow().isoformat()
    run_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents:runQuery"

    leaderboard_fields = {
        "xp": "xp",
        "streaks": "streakCount",
        "groupCompletions": "groupCompletions",
        "cityQuestCount": "cityQuestCount",
    }

    async def query_users(field, since):
        filters = [
            {
                "fieldFilter": {
                    "field": {"fieldPath": "showOnLeaderboard"},
                    "op": "EQUAL",
                    "value": {"booleanValue": True},
                }
            }
        ]
        if since:
            filters.append(
                {
                    "fieldFilter": {
                        "field": {"fieldPath": "lastCompleted"},
                        "op": "GREATER_THAN_OR_EQUAL",
                        "value": {"stringValue": since},
                    }
                }
            )
        where = (
            filters[0]
            if len(filters) == 1
            else {"compositeFilter": {"op": "AND", "filters": filters}}
        )
        body = {
            "structuredQuery": {
                "from": [{"collectionId": "users"}],
                "where": where,
                "orderBy": [{"field": {"fieldPath": field}, "direction": "DESCENDING"}],
                "limit": 100,
            }
        }
        resp = await asyncio.to_thread(rest_session.post, run_url, json=body)
        if resp.status_code != 200:
            return []
        results = []
        rank = 1
        for item in resp.json():
            doc = item.get("document")
            if not doc:
                continue
            data = _decode_document(doc)
            results.append(
                {
                    "rank": rank,
                    "uid": doc["name"].split("/")[-1],
                    "displayName": data.get("nickname") or data.get("displayName"),
                    "xp": data.get("xp", 0),
                    "streakCount": data.get("streakCount", 0),
                    "groupCompletions": data.get("groupCompletions", 0),
                    "cityQuestCount": data.get("cityQuestCount", 0),
                    "city": data.get("city"),
                    "avatar": data.get("avatar"),
                }
            )
            rank += 1
        return results

    for lb_type, field_path in leaderboard_fields.items():
        for period, days in {"allTime": None, "weekly": 7}.items():
            since = (
                (datetime.utcnow() - timedelta(days=days)).isoformat() if days else None
            )
            entries = await query_users(field_path, since)
            doc_id = f"{lb_type}_{period}"
            doc_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/leaderboards/{doc_id}"
            body = {"fields": _encode_fields({"lastUpdated": now, "entries": entries})}
            rest_session = get_rest_session()
    await asyncio.to_thread(rest_session.patch, doc_url, json=body)

    return {"status": "ok"}


@app.get("/status")
@app.get("/healthz")
def simple_health_check():
    """Simple health check for basic monitoring."""
    return {"status": "ok"}


# Session Management API Endpoints
@app.get("/admin/sessions/metrics")
async def get_session_metrics():
    """Get session management metrics for monitoring."""
    try:
        metrics = session_manager.get_metrics()
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": metrics,
        }
    except Exception as e:
        logger.error(f"Error getting session metrics: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to get session metrics", "detail": str(e)},
        )


@app.get("/admin/sessions/{session_id}")
async def get_session_details(session_id: str):
    """Get detailed information about a specific session."""
    try:
        # Validate session ID format
        validator = InputValidator()
        validated_session_id = validator.sanitize_string(session_id, max_length=64)

        session_info = session_manager.get_session_info(validated_session_id)
        if not session_info:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Session not found",
                    "session_id": validated_session_id,
                },
            )

        return {"status": "success", "session": session_info}
    except Exception as e:
        logger.error(f"Error getting session details: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to get session details", "detail": str(e)},
        )


@app.post("/admin/sessions/{session_id}/invalidate")
async def invalidate_session(session_id: str):
    """Invalidate a specific session."""
    try:
        # Validate session ID format
        validator = InputValidator()
        validated_session_id = validator.sanitize_string(session_id, max_length=64)

        session_manager.remove_session(validated_session_id)
        return {
            "status": "success",
            "message": f"Session {validated_session_id} invalidated",
        }
    except Exception as e:
        logger.error(f"Error invalidating session: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to invalidate session", "detail": str(e)},
        )


@app.post("/admin/sessions/cleanup")
async def force_session_cleanup():
    """Force cleanup of expired sessions."""
    try:
        initial_count = session_manager.get_metrics()["active_sessions"]
        session_manager._cleanup_expired_sessions()
        final_count = session_manager.get_metrics()["active_sessions"]

        return {
            "status": "success",
            "message": "Session cleanup completed",
            "sessions_before": initial_count,
            "sessions_after": final_count,
            "sessions_cleaned": initial_count - final_count,
        }
    except Exception as e:
        logger.error(f"Error during session cleanup: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to cleanup sessions", "detail": str(e)},
        )


@app.get("/session/info")
async def get_current_session_info(request: Request):
    """Get information about the current session."""
    try:
        session_id = request.headers.get("x-session-id")
        if not session_id:
            return JSONResponse(
                status_code=400, content={"error": "No session ID provided in headers"}
            )

        # Validate session ID format
        validator = InputValidator()
        validated_session_id = validator.sanitize_string(session_id, max_length=64)

        session_info = session_manager.get_session_info(validated_session_id)
        if not session_info:
            return JSONResponse(
                status_code=404, content={"error": "Session not found or expired"}
            )

        return {"status": "success", "session": session_info}
    except Exception as e:
        logger.error(f"Error getting current session info: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to get session info", "detail": str(e)},
        )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"🚀 Starting server on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
