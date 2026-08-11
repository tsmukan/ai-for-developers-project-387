from __future__ import annotations

from conftest import first_slot


def test_event_type_crud(client):
    created = client.post(
        "/owner/event-types",
        json={"title": "Zoom", "description": "d", "durationInMinutes": 45},
    )
    assert created.status_code == 201
    et = created.json()
    et_id = et["id"]

    got = client.get(f"/owner/event-types/{et_id}")
    assert got.status_code == 200
    assert got.json()["title"] == "Zoom"

    updated = client.put(f"/owner/event-types/{et_id}", json={"durationInMinutes": 50})
    assert updated.status_code == 200
    assert updated.json()["durationInMinutes"] == 50

    deleted = client.delete(f"/owner/event-types/{et_id}")
    assert deleted.status_code == 204
    assert client.get(f"/owner/event-types/{et_id}").status_code == 404


def test_working_hours_roundtrip(client):
    initial = client.get("/owner/settings/working-hours").json()
    assert len(initial["entries"]) == 7
    initial["entries"][0]["isAvailable"] = True
    initial["entries"][0]["startTime"] = "10:00"
    saved = client.put("/owner/settings/working-hours", json=initial)
    assert saved.status_code == 200
    assert saved.json()["entries"][0]["startTime"] == "10:00"


def test_profile(client):
    res = client.get("/owner/profile")
    assert res.status_code == 200
    assert {"name", "email", "timezone"} <= set(res.json())


def test_bookings_list(client):
    et = client.get("/event-types").json()["items"][0]
    slot = first_slot(client, et["id"])
    client.post(
        f"/event-types/{et['id']}/bookings",
        json={"startTime": slot, "guestName": "Иван", "guestTimezone": "Europe/Moscow"},
    )
    res = client.get("/owner/bookings")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert body["items"][0]["guestName"] == "Иван"
