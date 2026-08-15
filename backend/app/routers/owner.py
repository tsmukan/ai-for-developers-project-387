from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ..deps import get_storage
from ..models import (
    BookingsList,
    ErrorBody,
    EventType,
    EventTypeCreate,
    EventTypesList,
    EventTypeUpdate,
    OwnerProfile,
    WorkingHoursConfig,
)
from ..storage import Storage

router = APIRouter(prefix="/owner", tags=["owner"])

_DAY_LABELS = {
    0: "воскресенье",
    1: "понедельник",
    2: "вторник",
    3: "среда",
    4: "четверг",
    5: "пятница",
    6: "суббота",
}


def _missing(detail: str = "Тип события не найден."):
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _validate_time_string(value: str, day: int) -> None:
    hh, _, mm = value.partition(":")
    valid = (
        hh.isdigit()
        and mm.isdigit()
        and 0 <= int(hh) <= 23
        and 0 <= int(mm) <= 59
        and value == f"{int(hh):02d}:{int(mm):02d}"
    )
    if not valid:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Время «{value}» в {_DAY_LABELS[day]} должно быть в формате HH:MM.",
        )
    if int(mm) % 30 != 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Время «{value}» в {_DAY_LABELS[day]} должно быть кратно 30 минутам.",
        )


def _validate_working_hours(config: WorkingHoursConfig) -> None:
    seen: set[int] = set()
    for entry in config.entries:
        if entry.dayOfWeek in seen:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"День {_DAY_LABELS[entry.dayOfWeek]} указан дважды.",
            )
        seen.add(entry.dayOfWeek)
        if not entry.isAvailable:
            continue
        for value in (entry.startTime, entry.endTime):
            _validate_time_string(value, entry.dayOfWeek)
        if entry.startTime >= entry.endTime:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"В {_DAY_LABELS[entry.dayOfWeek]} начало должно быть раньше конца.",
            )


# ── Event Types ────────────────────────────────────────────────────────────


@router.get("/event-types", response_model=EventTypesList)
def list_event_types(storage: Storage = Depends(get_storage)):
    return EventTypesList(items=storage.list_event_types())


@router.get(
    "/event-types/{event_type_id}",
    response_model=EventType,
    responses={404: {"model": ErrorBody}},
)
def get_event_type(event_type_id: str, storage: Storage = Depends(get_storage)):
    event_type = storage.get_event_type(event_type_id)
    if event_type is None:
        raise _missing()
    return event_type


@router.post(
    "/event-types",
    response_model=EventType,
    status_code=status.HTTP_201_CREATED,
)
def create_event_type(body: EventTypeCreate, storage: Storage = Depends(get_storage)):
    return storage.create_event_type(body)


@router.put(
    "/event-types/{event_type_id}",
    response_model=EventType,
    responses={404: {"model": ErrorBody}},
)
def update_event_type(
    event_type_id: str,
    body: EventTypeUpdate,
    storage: Storage = Depends(get_storage),
):
    event_type = storage.update_event_type(event_type_id, body)
    if event_type is None:
        raise _missing()
    return event_type


@router.delete(
    "/event-types/{event_type_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"model": ErrorBody}},
)
def delete_event_type(event_type_id: str, storage: Storage = Depends(get_storage)):
    if not storage.delete_event_type(event_type_id):
        raise _missing()
    return


# ── Bookings ───────────────────────────────────────────────────────────────


@router.get("/bookings", response_model=BookingsList)
def list_bookings(storage: Storage = Depends(get_storage)):
    items = storage.list_bookings()
    return BookingsList(items=items, total=len(items))


# ── Working Hours ──────────────────────────────────────────────────────────


@router.get("/settings/working-hours", response_model=WorkingHoursConfig)
def get_working_hours(storage: Storage = Depends(get_storage)):
    return storage.get_working_hours()


@router.put("/settings/working-hours", response_model=WorkingHoursConfig)
def update_working_hours(
    body: WorkingHoursConfig,
    storage: Storage = Depends(get_storage),
):
    _validate_working_hours(body)
    return storage.set_working_hours(body)


# ── Profile ────────────────────────────────────────────────────────────────


@router.get("/profile", response_model=OwnerProfile)
def get_profile(storage: Storage = Depends(get_storage)):
    return storage.get_profile()