import os
import asyncio
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession

# Initialize Firestore REST session
creds = service_account.Credentials.from_service_account_file(
    os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "firestore-key.json"),
    scopes=["https://www.googleapis.com/auth/datastore"],
)
rest_session = AuthorizedSession(creds)
PROJECT_ID = creds.project_id


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
