from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Mirror of spec/api.tsp (compiled to spec/openapi.yaml).

Timezone = str  # IANA, e.g. "Europe/Moscow"
TimeString = str  # "HH:mm", e.g. "09:00"
Uuid = str


class ErrorBody(BaseModel):
    message: str
    details: str | None = None


# ── EventType ───────────────────────────────────────────────────────────────


class EventType(BaseModel):
    id: Uuid
    title: str
    description: str
    durationInMinutes: int


class EventTypeCreate(BaseModel):
    title: str
    description: str
    durationInMinutes: int = Field(ge=1)


class EventTypeUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    durationInMinutes: int | None = Field(default=None, ge=1)


# ── WorkingHours ──────────────────────────────────────────────────────────


DayOfWeek = Literal[0, 1, 2, 3, 4, 5, 6]


class WorkingHoursEntry(BaseModel):
    dayOfWeek: DayOfWeek
    startTime: TimeString
    endTime: TimeString
    isAvailable: bool


class WorkingHoursConfig(BaseModel):
    entries: list[WorkingHoursEntry]


# ── Owner Profile ─────────────────────────────────────────────────────────


class OwnerProfile(BaseModel):
    name: str
    email: str
    timezone: Timezone


# ── Booking ───────────────────────────────────────────────────────────────


class Booking(BaseModel):
    id: Uuid
    eventTypeId: Uuid
    startTime: datetime
    endTime: datetime
    guestName: str
    guestEmail: str | None = None
    guestPhone: str | None = None
    guestTimezone: Timezone
    createdAt: datetime


class BookingCreate(BaseModel):
    startTime: datetime
    guestName: str
    guestEmail: str | None = None
    guestPhone: str | None = None
    guestTimezone: Timezone


# ── Slot ──────────────────────────────────────────────────────────────────


class Slot(BaseModel):
    startTime: datetime
    endTime: datetime


# ── Responses ─────────────────────────────────────────────────────────────


class BookingsList(BaseModel):
    items: list[Booking]
    total: int


class EventTypesList(BaseModel):
    items: list[EventType]


class SlotsList(BaseModel):
    items: list[Slot]
    timezone: Timezone