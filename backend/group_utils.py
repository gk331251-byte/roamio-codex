import os
import hashlib
from datetime import datetime
from typing import Tuple
import asyncio

from backend.auth_utils import get_rest_session, PROJECT_ID
from backend.firestore_utils import _encode_fields, _decode_document

async def create_group_document(user_id: str, quest_id: str, display_name: str) -> Tuple[str, dict]:
    """Helper to create group quest and return groupId and document body."""
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
    url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/group_quests/{group_id}"
    body = {"fields": _encode_fields(group_doc)}
    rest_session = get_rest_session()
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return group_id, group_doc

async def add_user_to_group(user_id: str, group_id: str, display_name: str) -> dict:
    """Add a user to an existing group quest. Returns updated document."""
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/"
        f"databases/(default)/documents/group_quests/{group_id}"
    )
    rest_session = get_rest_session()
    resp = await asyncio.to_thread(rest_session.get, url)
    if resp.status_code != 200:
        raise RuntimeError("Group not found")
    doc = _decode_document(resp.json())
    if doc.get("completed"):
        raise RuntimeError("Group completed")

    members = doc.get("members", [])
    if not any(m.get("userId") == user_id for m in members):
        members.append({"userId": user_id, "displayName": display_name or user_id})
    progress = doc.get("progress", {})
    if user_id not in progress:
        progress[user_id] = []
    doc.update({"members": members, "progress": progress})
    body = {"fields": _encode_fields(doc)}
    patch_resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if patch_resp.status_code != 200:
        raise RuntimeError("Failed to update group")
    return doc
