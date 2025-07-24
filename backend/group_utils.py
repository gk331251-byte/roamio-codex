import os
import hashlib
from datetime import datetime
from typing import Tuple
import asyncio

from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

from .firestore_utils import _encode_fields, _decode_document

creds = service_account.Credentials.from_service_account_file(
    os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "firestore-key.json"),
    scopes=["https://www.googleapis.com/auth/datastore"],
)
rest_session = AuthorizedSession(creds)
PROJECT_ID = creds.project_id

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
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code != 200:
        print("Firestore REST error", resp.text)
        resp.raise_for_status()
    return group_id, group_doc
