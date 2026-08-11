from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.deps import storage
from app.main import app


@pytest.fixture()
def client():
    storage.__init__()  # reset in-memory state between tests
    return TestClient(app)


def first_event_type(client: TestClient) -> dict:
    return client.get("/event-types").json()["items"][0]


def first_slot(client: TestClient, event_type_id: str) -> str:
    slots = client.get(
        f"/event-types/{event_type_id}/slots", params={"timezone": "Europe/Moscow"}
    ).json()["items"]
    assert slots, "expected available slots"
    return slots[0]["startTime"]
