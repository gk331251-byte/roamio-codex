import os
import asyncio
import hashlib
from typing import List, Optional
from datetime import datetime

# Use centralized session from auth_utils
try:
    from backend.auth_utils import get_rest_session, PROJECT_ID
    print("✅ Firestore utils using centralized session")
except Exception as e:
    print(f"⚠️ Firestore utils import failed: {e}")
    # Fallback for testing
    get_rest_session = lambda: None
    PROJECT_ID = "real-world-quest-app"


def _to_value(val):
    if val is None:
        return {"nullValue": None}
    if isinstance(val, bool):
        return {"booleanValue": val}
    if isinstance(val, int):
        return {"integerValue": val}
    if isinstance(val, float):
        return {"doubleValue": val}
    if isinstance(val, str):
        return {"stringValue": val}
    if isinstance(val, list):
        return {"arrayValue": {"values": [_to_value(v) for v in val]}}
    if isinstance(val, dict):
        return {"mapValue": {"fields": {k: _to_value(v) for k, v in val.items()}}}
    return {"stringValue": str(val)}


def _encode_fields(data: dict) -> dict:
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
        return [_from_value(v) for v in val.get("arrayValue", {}).get("values", [])]
    if "mapValue" in val:
        return {
            k: _from_value(v)
            for k, v in val.get("mapValue", {}).get("fields", {}).items()
        }
    return val


def _decode_document(doc: dict) -> dict:
    return {k: _from_value(v) for k, v in doc.get("fields", {}).items()}


async def write_custom_quest(data: dict, uid: str) -> str:
    """Write a custom quest document and return generated ID."""
    rest_session = get_rest_session()
    if not rest_session:
        print("⚠️ No REST session available - cannot write custom quest")
        raise RuntimeError("Firestore not available - missing credentials")
    
    try:
        quest_id = hashlib.sha1(f"{uid}-{os.urandom(8).hex()}".encode()).hexdigest()[:12]
        data = dict(data)
        data["creatorId"] = uid
        data["createdAt"] = datetime.utcnow().isoformat()
        body = {"fields": _encode_fields(data)}
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/custom_quests/{quest_id}"
        resp = await asyncio.to_thread(rest_session.patch, url, json=body)
        if resp.status_code != 200:
            raise RuntimeError(f"Firestore error {resp.text}")
        return quest_id
    except Exception as e:
        print(f"⚠️ Error writing custom quest: {e}")
        raise RuntimeError(f"Failed to write custom quest: {str(e)}")


async def get_custom_quest(quest_id: str) -> Optional[dict]:
    """Get a custom quest by ID."""
    rest_session = get_rest_session()
    if not rest_session:
        print("⚠️ No REST session available - cannot get custom quest")
        return None
    
    try:
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/custom_quests/{quest_id}"
        resp = await asyncio.to_thread(rest_session.get, url)
        if resp.status_code != 200:
            return None
        return _decode_document(resp.json())
    except Exception as e:
        print(f"⚠️ Error getting custom quest: {e}")
        return None


async def query_custom_quests_by_creator(uid: str, public_only: bool = False) -> List[dict]:
    """Query custom quests by creator ID."""
    rest_session = get_rest_session()
    if not rest_session:
        print("⚠️ No REST session available - cannot query custom quests")
        return []
    
    try:
        query = {
            "structuredQuery": {
                "from": [{"collectionId": "custom_quests"}],
                "where": {
                    "fieldFilter": {
                        "field": {"fieldPath": "creatorId"},
                        "op": "EQUAL",
                        "value": {"stringValue": uid},
                    }
                },
            }
        }
        if public_only:
            query["structuredQuery"]["where"] = {
                "compositeFilter": {
                    "op": "AND",
                    "filters": [
                        {
                            "fieldFilter": {
                                "field": {"fieldPath": "creatorId"},
                                "op": "EQUAL",
                                "value": {"stringValue": uid},
                            }
                        },
                        {
                            "fieldFilter": {
                                "field": {"fieldPath": "isPublic"},
                                "op": "EQUAL",
                                "value": {"booleanValue": True},
                            }
                        },
                    ]
                }
            }
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:runQuery"
        resp = await asyncio.to_thread(rest_session.post, url, json=query)
        if resp.status_code != 200:
            raise RuntimeError(f"Firestore error {resp.text}")
        results = []
        for item in resp.json():
            doc = item.get("document")
            if doc:
                obj = _decode_document(doc)
                obj["id"] = doc["name"].split("/")[-1]
                results.append(obj)
        return results
    except Exception as e:
        print(f"⚠️ Error querying custom quests: {e}")
        return []