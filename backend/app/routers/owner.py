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


def _missing(detail: str = "Тип события не найден."):
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


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
    return storage.set_working_hours(body)


# ── Profile ────────────────────────────────────────────────────────────────


@router.get("/profile", response_model=OwnerProfile)
def get_profile(storage: Storage = Depends(get_storage)):
    return storage.get_profile()