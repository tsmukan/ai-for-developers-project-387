from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from unittest.mock import patch
from zoneinfo import ZoneInfo

import app.business as business
from app.models import Booking
from conftest import first_event_type, first_slot

TZ = "Europe/Moscow"

# Monday 2026-08-10 05:00 UTC: well before the Moscow workday, so the first
# available slot is exactly 09:00 in the owner zone regardless of when the
# test suite runs.
FIXED_NOW = datetime(2026, 8, 10, 5, 0, tzinfo=timezone.utc)


class _FrozenDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return FIXED_NOW.astimezone(tz) if tz is not None else FIXED_NOW


def _freeze_time():
    return patch.object(business, "datetime", _FrozenDatetime)


def test_list_event_types(client):
    res = client.get("/event-types")
    assert res.status_code == 200
    items = res.json()["items"]
    assert items and all({"id", "title", "durationInMinutes"} <= set(i) for i in items)


def test_slots_whole_window_by_default(client):
    et = first_event_type(client)
    res = client.get(f"/event-types/{et['id']}/slots", params={"timezone": TZ})
    assert res.status_code == 200
    body = res.json()
    assert body["timezone"] == TZ
    slots = body["items"]
    assert slots

    # all slots: UTC ISO format, on the 30-minute grid
    today = datetime.now(ZoneInfo(TZ)).date()
    for s in slots:
        start = datetime.fromisoformat(s["startTime"])
        assert s["startTime"].endswith("Z") or s["startTime"].endswith("+00:00")
        assert start.minute in (0, 30)
        assert start.astimezone(ZoneInfo(TZ)).date() >= today

    # dates span the booking window: exactly today .. today+14 (no leaking owner day)
    zone = ZoneInfo(TZ)
    today = datetime.now(zone).date()
    dates = {datetime.fromisoformat(s["startTime"]).astimezone(zone).date() for s in slots}
    assert dates
    assert min(dates) >= today
    assert max(dates) <= today + timedelta(days=14)


def test_slots_reanchor_to_owner_work_hours_per_guest_zone(client):
    """Working hours live in the owner's zone; guest-zone changes shift the grid."""
    with _freeze_time():
        et = first_event_type(client)

        def first_local(tz: str) -> tuple[datetime, datetime]:
            res = client.get(
                f"/event-types/{et['id']}/slots", params={"timezone": tz}
            ).json()["items"]
            assert res, "expected available slots"
            start = datetime.fromisoformat(res[0]["startTime"])
            return start, start.astimezone(ZoneInfo(tz))

        msk_utc, msk_local = first_local("Europe/Moscow")
        # owner default workday starts at 09:00 in the owner zone
        assert msk_local.hour == 9

        # every guest zone receives the SAME absolute instants …
        for tz in ("Asia/Tokyo", "America/New_York", "Europe/London"):
            utc, local = first_local(tz)
            assert utc == msk_utc

        # … but renders them at a different local hour: the grid shifted.
        tokyo_utc, tokyo_local = first_local("Asia/Tokyo")
        assert tokyo_local.hour != msk_local.hour
        assert tokyo_utc == msk_utc


def test_slots_fit_guest_window_for_far_zones(client):
    """Every slot must fall inside today..today+14 in the guest's OWN zone."""
    et = first_event_type(client)

    for tz in ("Europe/Moscow", "Asia/Tokyo", "America/New_York", "Pacific/Kiritimati", "Etc/GMT+12"):
        res = client.get(f"/event-types/{et['id']}/slots", params={"timezone": tz})
        assert res.status_code == 200
        body = res.json()
        assert body["timezone"] == tz
        assert body["items"], f"expected slots for {tz}"

        zone = ZoneInfo(tz)
        today = datetime.now(zone).date()
        window_end = today + timedelta(days=14)
        for s in body["items"]:
            start = datetime.fromisoformat(s["startTime"])
            assert s["startTime"].endswith("Z") or s["startTime"].endswith("+00:00")
            assert start.minute in (0, 30)
            assert today <= start.astimezone(zone).date() <= window_end


def test_same_instant_renders_at_different_local_time_per_zone(client):
    """Changing the guest zone shifts the grid/car dates for the same UTC instant."""
    et = first_event_type(client)
    slots = client.get(f"/event-types/{et['id']}/slots", params={"timezone": "UTC"}).json()["items"]
    assert slots
    start = datetime.fromisoformat(slots[0]["startTime"])

    local_dates = set()
    local_hours = set()
    for tz in ("Pacific/Kiritimati", "Etc/GMT+12"):
        local = start.astimezone(ZoneInfo(tz))
        local_dates.add(local.date())
        local_hours.add(local.hour)

    # +14 vs -12 offset -> the same instant is a different calendar day and hour.
    assert len(local_dates) == 2
    assert len(local_hours) == 2


def test_booking_from_far_guest_zone_accepted(client):
    """A slot produced for a far-east guest zone is bookable from that zone."""
    et = first_event_type(client)
    slots = client.get(
        f"/event-types/{et['id']}/slots", params={"timezone": "Pacific/Kiritimati"}
    ).json()["items"]
    assert slots
    res = client.post(
        f"/event-types/{et['id']}/bookings",
        json={
            "startTime": slots[0]["startTime"],
            "guestName": "Иван",
            "guestTimezone": "Pacific/Kiritimati",
        },
    )
    assert res.status_code == 201
    assert res.json()["guestTimezone"] == "Pacific/Kiritimati"


def test_booking_from_foreign_guest_zone_accepted(client):
    """A slot inside the owner's working day is valid from any guest zone."""
    et = first_event_type(client)
    start = first_slot(client, et["id"])
    res = client.post(
        f"/event-types/{et['id']}/bookings",
        json={"startTime": start, "guestName": "Иван", "guestTimezone": "America/New_York"},
    )
    assert res.status_code == 201


def test_booking_on_owner_day_off_rejected(client):
    """Owner weekend (working hours off) must be rejected from any guest zone."""
    et = first_event_type(client)
    today = datetime.now(ZoneInfo(TZ)).date()
    day_off = next(
        d
        for d in (today + timedelta(days=i) for i in range(1, 15))
        if (d.weekday() + 1) % 7 in (0, 6)
    )
    start = datetime.combine(day_off, time(9, 0), tzinfo=ZoneInfo(TZ)).astimezone(ZoneInfo("UTC"))
    res = client.post(
        f"/event-types/{et['id']}/bookings",
        json={"startTime": start.isoformat(), "guestName": "Иван", "guestTimezone": TZ},
    )
    assert res.status_code == 400


def test_create_booking_and_conflict_409(client):
    et = first_event_type(client)
    slot = first_slot(client, et["id"])

    body = {"startTime": slot, "guestName": "Иван", "guestTimezone": TZ}
    created = client.post(f"/event-types/{et['id']}/bookings", json=body)
    assert created.status_code == 201
    booking = created.json()
    assert booking["guestName"] == "Иван"
    assert booking["eventTypeId"] == et["id"]

    start = datetime.fromisoformat(slot)
    duration = et["durationInMinutes"]
    assert (datetime.fromisoformat(booking["endTime"]) - start).total_seconds() == duration * 60

    # same slot again -> 409 with message shape {message}
    conflict = client.post(
        f"/event-types/{et['id']}/bookings", json={**body, "guestName": "Пётр"}
    )
    assert conflict.status_code == 409
    assert conflict.json().get("message")


def test_overlap_ignores_event_type(client):
    et = first_event_type(client)
    other = client.post(
        "/owner/event-types",
        json={"title": "Другое", "description": "d", "durationInMinutes": 20},
    ).json()
    slot = first_slot(client, et["id"])

    client.post(
        f"/event-types/{et['id']}/bookings",
        json={"startTime": slot, "guestName": "A", "guestTimezone": TZ},
    )
    # same range via a different event type must also conflict
    conflict = client.post(
        f"/event-types/{other['id']}/bookings",
        json={"startTime": slot, "guestName": "B", "guestTimezone": TZ},
    )
    assert conflict.status_code == 409


def test_off_grid_start_rejected(client):
    et = first_event_type(client)
    slot = first_slot(client, et["id"])
    start = datetime.fromisoformat(slot)
    off_grid = start.replace(minute=15).isoformat()
    res = client.post(
        f"/event-types/{et['id']}/bookings",
        json={"startTime": off_grid, "guestName": "A", "guestTimezone": TZ},
    )
    assert res.status_code == 400


def test_outside_window_rejected(client):
    et = first_event_type(client)
    slot = first_slot(client, et["id"])
    start = datetime.fromisoformat(slot)
    res = client.post(
        f"/event-types/{et['id']}/bookings",
        json={
            "startTime": (start.replace(year=2031)).isoformat(),
            "guestName": "A",
            "guestTimezone": TZ,
        },
    )
    assert res.status_code == 400


def test_unknown_event_type_404(client):
    assert client.get("/event-types/nope/slots", params={"timezone": "UTC"}).status_code == 404
    res = client.post(
        "/event-types/nope/bookings",
        json={"startTime": "2030-01-01T09:00:00Z", "guestName": "A", "guestTimezone": "UTC"},
    )
    assert res.status_code == 404


def test_expired_bookings_pruned_from_storage(client):
    """Bookings whose endTime has passed are dropped, not just hidden from the API."""
    from datetime import timedelta, timezone

    from app.deps import storage

    now = datetime.now(timezone.utc)
    storage.bookings.append(
        Booking(
            id="past-1",
            eventTypeId="x",
            startTime=now - timedelta(days=2),
            endTime=now - timedelta(days=1),
            guestName="Старый",
            guestTimezone=TZ,
            createdAt=now - timedelta(days=2),
        )
    )
    assert len(storage.bookings) == 1

    assert storage.list_bookings() == []
    assert storage.bookings == []


def test_pruned_booking_does_not_block_new_booking(client):
    """A past booking is gone from the store, so the same slot is bookable again."""
    from datetime import timedelta, timezone

    from app.deps import storage

    et = first_event_type(client)
    slot = first_slot(client, et["id"])

    client.post(
        f"/event-types/{et['id']}/bookings",
        json={"startTime": slot, "guestName": "Иван", "guestTimezone": TZ},
    )

    now = datetime.now(timezone.utc)
    for b in storage.bookings:
        b.startTime = now - timedelta(days=2)
        b.endTime = now - timedelta(days=1)

    res = client.post(
        f"/event-types/{et['id']}/bookings",
        json={"startTime": slot, "guestName": "Пётр", "guestTimezone": TZ},
    )
    assert res.status_code == 201


def test_concurrent_booking_same_slot_creates_exactly_one(client):
    """Parallel requests for one slot must yield a single booking (no duplicates)."""
    from concurrent.futures import ThreadPoolExecutor

    et = first_event_type(client)
    slot = first_slot(client, et["id"])
    body = {"startTime": slot, "guestName": "Иван", "guestTimezone": TZ}

    def book(i: int):
        return client.post(
            f"/event-types/{et['id']}/bookings",
            json={**body, "guestName": f"Гость-{i}"},
        )

    with ThreadPoolExecutor(max_workers=8) as pool:
        responses = list(pool.map(book, range(8)))

    codes = [res.status_code for res in responses]
    assert codes.count(201) == 1
    assert all(code == 409 for code in codes if code != 201)
