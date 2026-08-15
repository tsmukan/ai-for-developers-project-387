from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..business import create_booking, list_slots
from ..deps import get_storage
from ..models import Booking, BookingCreate, ErrorBody, EventTypesList, SlotsList
from ..storage import Storage

router = APIRouter(tags=["public"])


@router.get("/event-types", response_model=EventTypesList)
def list_event_types(storage: Storage = Depends(get_storage)):
    return EventTypesList(items=storage.list_event_types())


@router.get(
    "/event-types/{event_type_id}/slots",
    response_model=SlotsList,
    responses={404: {"model": ErrorBody}},
)
def get_slots(
    event_type_id: str,
    timezone: str = Query(...),
    dateFrom: str | None = Query(default=None),
    dateTo: str | None = Query(default=None),
    storage: Storage = Depends(get_storage),
):
    if storage.get_event_type(event_type_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тип события не найден.")
    event_type = storage.get_event_type(event_type_id)
    return list_slots(storage, event_type, timezone, dateFrom, dateTo)


@router.post(
    "/event-types/{event_type_id}/bookings",
    response_model=Booking,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorBody},
        404: {"model": ErrorBody},
        409: {"model": ErrorBody},
    },
)
def create_booking_endpoint(
    event_type_id: str,
    body: BookingCreate,
    storage: Storage = Depends(get_storage),
):
    event_type = storage.get_event_type(event_type_id)
    if event_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тип события не найден.")

    if body.startTime.tzinfo is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Время должно быть задано в ISO 8601 с часовым поясом.",
        )

    return create_booking(storage, event_type, body)