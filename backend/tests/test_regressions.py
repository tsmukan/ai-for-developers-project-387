from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from conftest import first_event_type

TZ = "Europe/Moscow"


# ── GET /slots: invalid inputs must be 400, not 500 ─────────────────────────


def test_slots_invalid_timezone_returns_400(client):
    et = first_event_type(client)
    res = client.get(
        f"/event-types/{et['id']}/slots", params={"timezone": "Not/AZone"}
    )
    assert res.status_code == 400
    assert res.json().get("message")


def test_slots_invalid_date_filter_returns_400(client):
    et = first_event_type(client)
    for params in (
        {"timezone": TZ, "dateFrom": "not-a-date"},
        {"timezone": TZ, "dateTo": "2026-99-99"},
    ):
        res = client.get(f"/event-types/{et['id']}/slots", params=params)
        assert res.status_code == 400
        assert res.json().get("message")


# ── GET /slots: the window is clamped to today .. today+14 ──────────────────


def test_slots_clamp_date_to_beyond_window(client):
    et = first_event_type(client)
    today = datetime.now(ZoneInfo(TZ)).date()
    res = client.get(
        f"/event-types/{et['id']}/slots",
        params={"timezone": TZ, "dateTo": (today + timedelta(days=30)).isoformat()},
    )
    assert res.status_code == 200
    for slot in res.json()["items"]:
        start = datetime.fromisoformat(slot["startTime"])
        assert start.astimezone(ZoneInfo(TZ)).date() <= today + timedelta(days=14)


def test_slots_empty_when_window_out_of_range(client):
    et = first_event_type(client)
    today = datetime.now(ZoneInfo(TZ)).date()
    res = client.get(
        f"/event-types/{et['id']}/slots",
        params={
            "timezone": TZ,
            "dateFrom": (today + timedelta(days=20)).isoformat(),
            "dateTo": (today + timedelta(days=21)).isoformat(),
        },
    )
    assert res.status_code == 200
    assert res.json()["items"] == []


# ── Working hours validation ─────────────────────────────────────────────────


def _working_hours() -> list[dict]:
    return [
        {
            "dayOfWeek": day,
            "startTime": "09:00",
            "endTime": "18:00",
            "isAvailable": True,
        }
        for day in range(7)
    ]


def test_working_hours_invalid_format_400(client):
    wh = _working_hours()
    wh[0]["startTime"] = "25:99"
    res = client.put("/owner/settings/working-hours", json={"entries": wh})
    assert res.status_code == 400
    assert res.json().get("message")


def test_working_hours_off_grid_400(client):
    wh = _working_hours()
    wh[0]["startTime"] = "09:15"
    res = client.put("/owner/settings/working-hours", json={"entries": wh})
    assert res.status_code == 400
    assert res.json().get("message")


def test_working_hours_start_after_end_400(client):
    wh = _working_hours()
    wh[0]["startTime"] = "18:00"
    wh[0]["endTime"] = "09:00"
    res = client.put("/owner/settings/working-hours", json={"entries": wh})
    assert res.status_code == 400
    assert res.json().get("message")


def test_working_hours_duplicate_day_400(client):
    wh = _working_hours()
    wh[1]["dayOfWeek"] = 0
    res = client.put("/owner/settings/working-hours", json={"entries": wh})
    assert res.status_code == 400


def test_working_hours_disabled_day_skips_time_validation(client):
    wh = _working_hours()
    wh[6]["isAvailable"] = False
    wh[6]["startTime"] = "25:99"
    res = client.put("/owner/settings/working-hours", json={"entries": wh})
    assert res.status_code == 200


# ── 422 validation errors use the ErrorBody shape ───────────────────────────


def test_validation_error_uses_error_body_shape(client):
    res = client.post(
        "/owner/event-types",
        json={"title": "", "description": "d", "durationInMinutes": 0},
    )
    assert res.status_code == 422
    body = res.json()
    assert body.get("message")
    assert "details" in body
