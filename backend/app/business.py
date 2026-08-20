from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo

from .models import Booking, BookingCreate, SlotsList

GRID_MINUTES = 30
BOOKING_WINDOW_DAYS = 14


class BookingError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _spec_day_of_week(py_weekday: int) -> int:
    # Python: Monday=0 .. Sunday=6. Spec DayOfWeek: 0=Sunday .. 6=Saturday.
    return (py_weekday + 1) % 7


def _hz_to_time(value: str) -> time:
    hh, mm = value.split(":", 1)
    return time(int(hh), int(mm))


def _assign(naive: datetime, tz) -> datetime:
    return naive.replace(tzinfo=tz).astimezone(timezone.utc)


def _day_bounds(day: date, tz: ZoneInfo) -> datetime:
    """UTC instant of the start of the calendar day `day` observed in `tz`."""
    return _assign(datetime.combine(day, time(0)), tz)


def list_slots(storage, event_type, timezone_name, date_from: str | None, date_to: str | None) -> SlotsList:
    try:
        owner_tz = ZoneInfo(storage.get_profile().timezone)
        guest_tz = ZoneInfo(timezone_name)
    except Exception:
        raise BookingError(f"Неизвестный часовой пояс: {timezone_name}", 400)

    today = datetime.now(guest_tz).date()
    window_limit = today + timedelta(days=BOOKING_WINDOW_DAYS)

    try:
        start_date = date.fromisoformat(date_from) if date_from else today
        end_date = date.fromisoformat(date_to) if date_to else window_limit
    except ValueError:
        raise BookingError("Параметры dateFrom/dateTo должны быть в формате YYYY-MM-DD.", 400)

    if start_date > end_date:
        start_date, end_date = end_date, start_date
    # The booking window is today .. today+14; clamp out-of-range filters.
    start_date = max(start_date, today)
    end_date = min(end_date, window_limit)
    if start_date > end_date:
        return SlotsList(items=[], timezone=timezone_name)

    # Guest-visible window in UTC: midnight of the first day .. midnight after the last.
    window_start = _day_bounds(start_date, guest_tz)
    window_end = _day_bounds(end_date + timedelta(days=1), guest_tz)

    by_day = {e.dayOfWeek: e for e in storage.get_working_hours().entries}
    duration = timedelta(minutes=event_type.durationInMinutes)
    now = datetime.now(timezone.utc)

    # Working hours are anchored to the owner's calendar: iterate owner-local days
    # (which may straddle guest days across timezone boundaries) and yield slots
    # aligned to the owner's 30-minute grid inside the guest's window.
    owner_first = window_start.astimezone(owner_tz).date()
    owner_last = (window_end - timedelta(seconds=1)).astimezone(owner_tz).date()

    items = []
    cur = owner_first
    while cur <= owner_last:
        entry = by_day.get(_spec_day_of_week(cur.weekday()))
        if entry is not None and entry.isAvailable and entry.startTime < entry.endTime:
            w_start = _assign(datetime.combine(cur, _hz_to_time(entry.startTime)), owner_tz)
            w_end = _assign(datetime.combine(cur, _hz_to_time(entry.endTime)), owner_tz)
            lo = max(w_start, window_start)
            hi = min(w_end, window_end)
            candidate = w_start
            while candidate < lo:
                candidate += timedelta(minutes=GRID_MINUTES)
            while candidate + duration <= hi:
                slot_start = candidate.astimezone(timezone.utc)
                slot_end = slot_start + duration
                in_future = slot_end > now
                free = in_future and not storage.overlaps(slot_start, slot_end)
                if free:
                    items.append({"startTime": slot_start, "endTime": slot_end})
                candidate += timedelta(minutes=GRID_MINUTES)
        cur += timedelta(days=1)

    return SlotsList(items=items, timezone=timezone_name)


def create_booking(storage, event_type, body: BookingCreate) -> Booking:
    """Returns a booking, or raises BookingError on validation failure."""
    start = body.startTime
    duration = timedelta(minutes=event_type.durationInMinutes)
    end = start + duration

    if start.minute % GRID_MINUTES != 0:
        raise BookingError("Время должно быть кратно 30 минутам (:00 или :30).", 400)

    try:
        tz = ZoneInfo(body.guestTimezone)
    except Exception:
        raise BookingError(f"Неизвестный часовой пояс: {body.guestTimezone}", 400)

    today = datetime.now(tz).date()
    window_end = today + timedelta(days=BOOKING_WINDOW_DAYS)

    local_start = start.astimezone(tz)
    local_date = local_start.date()

    if local_date < today or local_date > window_end:
        raise BookingError("Время должно быть в пределах окна сегодня + 14 дней.", 400)

    # Working hours are anchored to the owner's calendar.
    owner_tz = ZoneInfo(storage.get_profile().timezone)
    owner_day = start.astimezone(owner_tz).date()
    by_day = {e.dayOfWeek: e for e in storage.get_working_hours().entries}
    entry = by_day.get(_spec_day_of_week(owner_day.weekday()))
    if entry is None or not entry.isAvailable:
        raise BookingError("В этот день владелец не принимает.", 400)

    w_start = _assign(datetime.combine(owner_day, _hz_to_time(entry.startTime)), owner_tz)
    w_end = _assign(datetime.combine(owner_day, _hz_to_time(entry.endTime)), owner_tz)
    if start < w_start or end > w_end:
        raise BookingError("Встреча выходит за пределы рабочего времени.", 400)

    booking = Booking(
        id=str(uuid4()),
        eventTypeId=event_type.id,
        startTime=start.astimezone(timezone.utc),
        endTime=end.astimezone(timezone.utc),
        guestName=body.guestName,
        guestEmail=body.guestEmail,
        guestPhone=body.guestPhone,
        guestTimezone=body.guestTimezone,
        createdAt=datetime.now(timezone.utc),
    )
    if not storage.try_add_booking(start, end, booking):
        raise BookingError("Это время уже занято.", 409)

    return booking