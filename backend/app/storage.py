from __future__ import annotations

import threading
from datetime import datetime, timezone
from uuid import uuid4

from .models import Booking, EventType, EventTypeCreate, EventTypeUpdate, OwnerProfile, WorkingHoursConfig

DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]  # monday..sunday ordering for defaults


def _default_working_hours() -> WorkingHoursConfig:
    working = {1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri"}
    return WorkingHoursConfig(
        entries=[
            {
                "dayOfWeek": day,
                "startTime": "09:00",
                "endTime": "18:00",
                "isAvailable": day in working,
            }
            for day in DAY_ORDER
        ]
    )


def _default_event_types() -> list[EventType]:
    return [
        EventType(
            id=str(uuid4()),
            title="Пятнадцатиминутка",
            description="Быстрая встреча на 15 минут.",
            durationInMinutes=15,
        ),
        EventType(
            id=str(uuid4()),
            title="Полчаса",
            description="Стандартная встреча на 30 минут.",
            durationInMinutes=30,
        ),
        EventType(
            id=str(uuid4()),
            title="Обзор проекта",
            description="Развёрнутая консультация на час.",
            durationInMinutes=60,
        ),
    ]


class Storage:
    """Thread-safe in-memory store. Data resets on restart (per project rules)."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.event_types: dict[str, EventType] = {et.id: et for et in _default_event_types()}
        self.bookings: list[Booking] = []
        self.working_hours: WorkingHoursConfig = _default_working_hours()
        self.profile: OwnerProfile = OwnerProfile(
            name="Алексей",
            email="lex@example.com",
            timezone="Europe/Moscow",
        )

    # ── Event types ────────────────────────────────────────────────────────

    def list_event_types(self) -> list[EventType]:
        with self._lock:
            return [et.model_copy(deep=True) for et in self.event_types.values()]

    def get_event_type(self, event_type_id: str) -> EventType | None:
        with self._lock:
            et = self.event_types.get(event_type_id)
            return et.model_copy(deep=True) if et is not None else None

    def create_event_type(self, data: EventTypeCreate) -> EventType:
        et = EventType(id=str(uuid4()), **data.model_dump())
        with self._lock:
            self.event_types[et.id] = et
            return et

    def update_event_type(self, event_type_id: str, data: EventTypeUpdate) -> EventType | None:
        with self._lock:
            et = self.event_types.get(event_type_id)
            if et is None:
                return None
            merged = et.model_copy(update=data.model_dump(exclude_unset=True))
            self.event_types[event_type_id] = merged
            return merged.model_copy(deep=True)

    def delete_event_type(self, event_type_id: str) -> bool:
        with self._lock:
            return self.event_types.pop(event_type_id, None) is not None

    # ── Bookings ───────────────────────────────────────────────────────────

    def _prune_expired(self) -> None:
        now = self._now()
        self.bookings = [b for b in self.bookings if b.endTime > now]

    def list_bookings(self) -> list[Booking]:
        with self._lock:
            self._prune_expired()
            upcoming = [b.model_copy(deep=True) for b in self.bookings]
            upcoming.sort(key=lambda b: b.startTime)
            return upcoming

    def try_add_booking(self, start: datetime, end: datetime, booking: Booking) -> bool:
        with self._lock:
            self._prune_expired()
            for b in self.bookings:
                if start < b.endTime and end > b.startTime:
                    return False
            self.bookings.append(booking)
            return True

    def overlaps(self, start: datetime, end: datetime) -> bool:
        with self._lock:
            self._prune_expired()
            return any(
                start < b.endTime and end > b.startTime for b in self.bookings
            )

    # ── Working hours ──────────────────────────────────────────────────────

    def get_working_hours(self) -> WorkingHoursConfig:
        with self._lock:
            return self.working_hours.model_copy(deep=True)

    def set_working_hours(self, config: WorkingHoursConfig) -> WorkingHoursConfig:
        with self._lock:
            self.working_hours = config
            return config.model_copy(deep=True)

    # ── Profile ────────────────────────────────────────────────────────────

    def get_profile(self) -> OwnerProfile:
        with self._lock:
            return self.profile.model_copy(deep=True)

    # ── helpers ────────────────────────────────────────────────────────────

    @property
    def _now(self):
        return self._now_impl

    @staticmethod
    def _now_impl() -> datetime:
        return datetime.now(timezone.utc)