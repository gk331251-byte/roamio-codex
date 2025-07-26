import os
import asyncio
import re
from fastapi import Depends, HTTPException, Request
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession
import firebase_admin
from firebase_admin import auth as fb_auth
from dotenv import load_dotenv
load_dotenv()

# Initialize Firestore REST session
creds = service_account.Credentials.from_service_account_file(
    os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"),
    scopes=["https://www.googleapis.com/auth/datastore"],
)
rest_session = AuthorizedSession(creds)
PROJECT_ID = creds.project_id

# Initialize Firebase Admin if not already
if not firebase_admin._apps:
    firebase_admin.initialize_app()


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
    url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/users/{uid}"
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code == 200:
        data = _decode_document(resp.json())
        return data.get("isPremium") is True
    return False


async def verify_token(auth_header: str | None) -> str | None:
    """Validate Firebase token and return UID."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        decoded = await asyncio.to_thread(fb_auth.verify_id_token, token)
        return decoded.get("uid")
    except Exception as e:
        print("verify_token error", e)
        return None


async def _get_user_doc(uid: str) -> dict | None:
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/users/{uid}"
    )
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code == 200:
        return _decode_document(resp.json())
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

