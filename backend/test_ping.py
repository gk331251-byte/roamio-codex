import os
from fastapi.testclient import TestClient

os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "test-project")

import main

client = TestClient(main.app)


def test_ping_route():
    resp = client.get("/ping")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"
