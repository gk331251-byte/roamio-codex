import os
import asyncio
import random
from datetime import datetime
from uuid import uuid4

from backend.auth_utils import get_rest_session, PROJECT_ID

try:
    from faker import Faker

    faker = Faker()
except Exception:
    faker = None

from backend.firestore_utils import _encode_fields

# Initialize REST session using centralized auth utils
rest_session = get_rest_session()
BASE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

NAMES = [
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Eve",
    "Frank",
    "Grace",
    "Heidi",
    "Ivan",
    "Judy",
    "Karl",
    "Liam",
    "Mia",
    "Nina",
    "Oscar",
    "Peggy",
    "Quinn",
    "Ruth",
    "Sybil",
    "Trent",
    "Uma",
    "Victor",
    "Wendy",
    "Xander",
    "Yara",
    "Zack",
]
CITIES = [
    "New York",
    "Los Angeles",
    "Chicago",
    "Houston",
    "Phoenix",
    "Seattle",
    "Austin",
    "Denver",
    "Boston",
    "Miami",
    "San Francisco",
    "Portland",
]
MOODS = ["romantic", "eerie", "nostalgic", "adventurous", "relaxed", "mysterious"]
BADGES = [
    "first-quest",
    "quest-10",
    "streak-7",
    "hardcore",
    "explorer-5",
    "squad-player",
]
TAGS = ["food", "hiking", "history", "culture", "nature", "nightlife", "family", "arts"]

random.seed()


async def write_doc(path: str, data: dict):
    url = f"{BASE_URL}/{path}"
    body = {"fields": _encode_fields(data)}
    resp = await asyncio.to_thread(rest_session.patch, url, json=body)
    if resp.status_code not in (200, 201):
        print("Error writing", path, resp.text)
    else:
        print("Wrote", path)
    await asyncio.sleep(0.1)


async def seed_users(n=25):
    users = []
    for _ in range(n):
        uid = uuid4().hex[:8]
        name = faker.name() if faker else random.choice(NAMES)
        user_doc = {
            "displayName": name,
            "xp": random.randint(0, 2000),
            "isAdmin": random.random() < 0.05,
            "isPremium": random.random() < 0.4,
            "banned": random.random() < 0.1,
            "stats": {
                "questsCompleted": random.randint(0, 20),
                "streak": random.randint(0, 7),
            },
            "badges": random.sample(BADGES, random.randint(0, 3)),
        }
        await write_doc(f"users/{uid}", user_doc)
        users.append((uid, name))
    return users


async def seed_user_quests(users):
    for uid, _ in users:
        for _ in range(random.randint(2, 3)):
            qid = uuid4().hex[:10]
            city = random.choice(CITIES)
            quest = {
                "title": f"Adventure in {city}",
                "city": city,
                "mood": random.choice(MOODS),
                "difficulty": random.choice(["Easy", "Medium", "Hard"]),
                "questText": f"Explore the sights of {city}.",
                "completed": True,
                "completedAt": datetime.utcnow().isoformat(),
                "xpEarned": random.randint(50, 300),
            }
            await write_doc(f"user_quests/{uid}/quests/{qid}", quest)


async def seed_custom_quests(users, count=12):
    quests = []
    for _ in range(count):
        qid = uuid4().hex[:12]
        creator, _ = random.choice(users)
        city = random.choice(CITIES)
        doc = {
            "title": f"{random.choice(MOODS).title()} Quest",
            "questText": f"A thrilling adventure in {city}.",
            "locationList": [{"name": city}],
            "mood": [random.choice(MOODS)],
            "city": city,
            "isPublic": random.random() < 0.6,
            "creatorId": creator,
            "createdAt": datetime.utcnow().isoformat(),
        }
        await write_doc(f"custom_quests/{qid}", doc)
        quests.append(qid)
    return quests


async def seed_groups(users, quests):
    for _ in range(random.randint(5, 10)):
        gid = uuid4().hex[:8]
        quest_id = random.choice(quests)
        members = random.sample(users, random.randint(2, 4))
        doc = {
            "questId": quest_id,
            "members": [{"userId": uid, "displayName": name} for uid, name in members],
            "createdAt": datetime.utcnow().isoformat(),
            "completed": False,
        }
        await write_doc(f"groups/{gid}", doc)


async def seed_communities(users, quests):
    for _ in range(5):
        cid = uuid4().hex[:8]
        owner, _ = random.choice(users)
        doc = {
            "name": f"{random.choice(CITIES)} Explorers",
            "ownerId": owner,
            "description": "Community hub for local adventurers",
            "tags": random.sample(TAGS, 3),
            "isPublic": True,
            "createdAt": datetime.utcnow().isoformat(),
            "memberIds": [owner],
            "questRefs": random.sample(quests, min(3, len(quests))),
        }
        await write_doc(f"communities/{cid}", doc)


async def seed_community_quests(users):
    for _ in range(12):
        doc_id = uuid4().hex[:12]
        uid, _ = random.choice(users)
        city = random.choice(CITIES)
        quest = {
            "uid": uid,
            "questText": f"Share your best memory from {city}",
            "imageUrl": f"https://picsum.photos/seed/{doc_id}/400/300",
            "publishedAt": datetime.utcnow().isoformat(),
            "isVisible": True,
        }
        await write_doc(f"community_quests/{doc_id}", quest)


async def seed_ugc_posts(users, count=8):
    for _ in range(count):
        post_id = uuid4().hex[:12]
        uid, name = random.choice(users)
        post = {
            "text": "This quest was so fun with my friends!",
            "author": name,
            "uid": uid,
            "city": random.choice(CITIES),
            "mood": random.choice(MOODS),
            "timestamp": datetime.utcnow().isoformat(),
        }
        await write_doc(f"ugc_feed/{post_id}", post)


async def seed_likes_views(users, quests):
    for qid in random.sample(quests, min(len(quests), 5)):
        like_users = random.sample(users, random.randint(1, 5))
        view_users = random.sample(
            users, random.randint(len(like_users), len(like_users) + 5)
        )
        for uid, _ in like_users:
            doc_id = f"{qid}_{uid}"
            await write_doc(
                f"quest_likes/{doc_id}", {"timestamp": datetime.utcnow().isoformat()}
            )
        for uid, _ in view_users:
            doc_id = f"{qid}_{uid}"
            await write_doc(
                f"quest_views/{doc_id}", {"timestamp": datetime.utcnow().isoformat()}
            )
        quest_patch = {
            "likesCount": len(like_users),
            "viewsCount": len(view_users),
        }
        await write_doc(f"custom_quests/{qid}", quest_patch)


async def main():
    users = await seed_users()
    await seed_user_quests(users)
    quests = await seed_custom_quests(users, random.randint(10, 15))
    await seed_groups(users, quests)
    await seed_communities(users, quests)
    await seed_community_quests(users)
    await seed_ugc_posts(users)
    await seed_likes_views(users, quests)


if __name__ == "__main__":
    asyncio.run(main())
