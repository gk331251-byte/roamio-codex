import os
import json
import asyncio
import re
from fastapi import Depends, HTTPException, Request
from google.auth.transport.requests import AuthorizedSession
import requests
from google.oauth2 import service_account
from google.auth import default
import firebase_admin
from firebase_admin import auth as fb_auth


def get_authorized_session():
    """Return an AuthorizedSession using credentials from Cloud Run secrets or default."""
    
    # First, try to read from Cloud Run mounted secret
    secret_path = "/secrets/firestore/key"
    if os.path.exists(secret_path):
        print("✅ Using Cloud Run mounted secret for credentials")
        try:
            with open(secret_path, 'r') as f:
                secret_data = json.load(f)
            
            creds = service_account.Credentials.from_service_account_info(
                secret_data,
                scopes=["https://www.googleapis.com/auth/datastore"],
            )
            print("✅ Google credentials loaded from Cloud Run secret")
            return AuthorizedSession(creds)
        except Exception as e:
            print(f"⚠️ Failed to load Cloud Run secret: {e}")
    
    # Fallback to environment variable path
    secret_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if secret_path and os.path.exists(secret_path):
        print("✅ Using environment variable path for credentials")
        try:
            creds = service_account.Credentials.from_service_account_file(
                secret_path,
                scopes=["https://www.googleapis.com/auth/datastore"],
            )
            print("✅ Google credentials loaded from file")
            return AuthorizedSession(creds)
        except Exception as e:
            print(f"⚠️ Failed to load credentials from file: {e}")
    
    # Fallback to default credentials (for Cloud Run with service account)
    try:
        print("⚠️ Trying default credentials")
        creds, project = default(scopes=["https://www.googleapis.com/auth/datastore"])
        print("✅ Using default Google credentials")
        return AuthorizedSession(creds)
    except Exception as e:
        print(f"⚠️ Failed to load default credentials: {e}")
        print("⚠️ Falling back to unauthenticated session")
        return requests.Session()


def load_secret_from_file(secret_path: str, env_var_name: str) -> str | None:
    """Load a secret from a mounted file or environment variable."""
    # Try Cloud Run mounted secret first
    if os.path.exists(secret_path):
        try:
            with open(secret_path, 'r') as f:
                return f.read().strip()
        except Exception as e:
            print(f"⚠️ Failed to read secret from {secret_path}: {e}")
    
    # Fallback to environment variable
    return os.environ.get(env_var_name)


# Load API keys from secrets or environment
def load_api_keys():
    """Load API keys from Cloud Run secrets or environment variables."""
    google_maps_key = load_secret_from_file("/secrets/places/key", "GOOGLE_MAPS_API_KEY")
    openai_key = load_secret_from_file("/secrets/openai/key", "OPENAI_API_KEY")
    
    if google_maps_key:
        os.environ["GOOGLE_MAPS_API_KEY"] = google_maps_key
        print("✅ Google Maps API key loaded")
    else:
        print("⚠️ Google Maps API key not found")
    
    if openai_key:
        os.environ["OPENAI_API_KEY"] = openai_key
        print("✅ OpenAI API key loaded")
    else:
        print("⚠️ OpenAI API key not found")


# Centralized session management
_rest_session = None
_session_initialized = False

def get_rest_session():
    """Get the global REST session, initializing it if necessary."""
    global _rest_session, _session_initialized
    
    if not _session_initialized:
        try:
            # Load API keys first
            load_api_keys()
            
            # Initialize session
            _rest_session = get_authorized_session()
            if _rest_session:
                print("✅ REST session initialized (centralized)")
            else:
                print("⚠️ REST session is None - some features will be disabled")
        except Exception as e:
            print(f"⚠️ REST session initialization failed: {e}")
            _rest_session = None
        finally:
            _session_initialized = True
    
    return _rest_session

# Backward compatibility - initialize on import
# auth_utils.py
_rest_session = None
_session_initialized = False

def get_rest_session():
    global _rest_session, _session_initialized
    if not _session_initialized:
        try:
            load_api_keys()
            _rest_session = get_authorized_session()
            _session_initialized = True
            print("✅ Lazy REST session initialized")
        except Exception as e:
            print(f"❌ REST session error: {e}")
    return _rest_session

# DO NOT do this:
# rest_session = get_rest_session()

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT") or "real-world-quest-app"

# Initialize Firebase Admin if not already - with error handling
try:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
        print("✅ Firebase Admin initialized in auth_utils")
except Exception as e:
    print(f"⚠️ Firebase Admin initialization failed in auth_utils: {e}")


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
        return [_from_value(v) for v in val.get("arrayValue", {}).get("values", [])]
    if "mapValue" in val:
        return {
            k: _from_value(v)
            for k, v in val.get("mapValue", {}).get("fields", {}).items()
        }
    return val


def _decode_document(doc: dict) -> dict:
    return {k: _from_value(v) for k, v in doc.get("fields", {}).items()}


async def is_premium_user(uid: str) -> bool:
    """Check the user's premium status from Firestore."""
    if not rest_session:
        print("⚠️ No REST session available - cannot check premium status")
        return False
    
    try:
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/users/{uid}"
        resp = await asyncio.to_thread(rest_session.get, url)
        if resp.status_code == 200:
            data = _decode_document(resp.json())
            return data.get("isPremium") is True
        return False
    except Exception as e:
        print(f"⚠️ Error checking premium status: {e}")
        return False


async def verify_token(auth_header: str | None) -> str | None:
    """Validate Firebase token and return UID."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        # Check if Firebase Admin is available
        if not firebase_admin._apps:
            print("⚠️ Firebase Admin not initialized - cannot verify token")
            return None
            
        decoded = await asyncio.to_thread(fb_auth.verify_id_token, token)
        return decoded.get("uid")
    except Exception as e:
        print("verify_token error", e)
        return None


async def verify_token_info(auth_header: str | None) -> tuple[str | None, bool]:
    """Return UID and whether the token represents an anonymous user."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return None, False
    token = auth_header.split(" ", 1)[1]
    try:
        # Check if Firebase Admin is available
        if not firebase_admin._apps:
            print("⚠️ Firebase Admin not initialized - cannot verify token info")
            return None, False
            
        decoded = await asyncio.to_thread(fb_auth.verify_id_token, token)
        provider = decoded.get("firebase", {}).get("sign_in_provider")
        return decoded.get("uid"), provider == "anonymous"
    except Exception as e:
        print("verify_token_info error", e)
        return None, False


async def _get_user_doc(uid: str) -> dict | None:
    if not rest_session:
        print("⚠️ No REST session available - cannot get user doc")
        return None
    
    try:
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/users/{uid}"
        resp = await asyncio.to_thread(rest_session.get, url)
        if resp.status_code == 200:
            return _decode_document(resp.json())
        return None
    except Exception as e:
        print(f"⚠️ Error getting user doc: {e}")
        return None


async def require_user(request: Request) -> str:
    uid = await verify_token(request.headers.get("Authorization"))
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return uid


async def require_admin(uid: str = Depends(require_user)) -> str:
    doc = await _get_user_doc(uid)
    if not doc or not doc.get("isAdmin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return uid


async def check_not_banned(uid: str = Depends(require_user)) -> str:
    doc = await _get_user_doc(uid)
    if doc and doc.get("banned"):
        raise HTTPException(status_code=403, detail="User banned")
    return uid


def sanitize_input(text: str) -> str:
    if not text:
        return ""
    sanitized = re.sub(r"[<>]", "", text)
    sanitized = sanitized.replace("\n", " ").strip()
    return sanitized