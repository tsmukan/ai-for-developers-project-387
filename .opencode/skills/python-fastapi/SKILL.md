---
name: python-fastapi
description: Use when writing or modifying the Python FastAPI backend in backend/ — endpoints in app/routers, Pydantic models, booking business rules, in-memory storage, or running backend tests. Trigger on keywords: FastAPI, uvicorn, Pydantic, backend, pytest, API routes, slots, bookings.
---

# Python FastAPI Backend

The backend lives in `backend/` and is a standalone FastAPI service. It must
match the API contract compiled from `spec/api.tsp` into `spec/openapi.yaml` —
the frontend consumes only that contract.

## Layout

```
backend/
  app/
    main.py      # FastAPI app: CORS, HTTPException -> {message, details} handler, routers
    routers/
      public.py  # guest-facing: event types, slots, create booking
      owner.py   # owner panel: event types CRUD, bookings, working hours, profile
    models.py    # Pydantic v2 models (mirror of spec/api.tsp)
    business.py  # slot grid + booking validation rules (GRID_MINUTES=30, window=14 days)
    storage.py   # in-memory store; data resets on restart
    deps.py      # get_storage dependency (Storage singleton)
  tests/         # pytest; conftest resets storage.__init__() between tests
```

## Run and test

```bash
cd backend
.venv/bin/python -m pytest -q          # run tests (testpaths = ["tests"])
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Development deps (`pytest`, `httpx2` for `TestClient`) come from
`[project.optional-dependencies].dev`; install with
`pip install -e ".[dev]"`.

## Rules that MUST be honored

- Endpoints and models mirror `spec/api.tsp`. Do not add or rename fields
  without updating the spec.
- Error responses follow the contract shape
  `{"message": str, "details"?: str}` — handled globally in `main.py`, so raise
  `HTTPException(detail=...)` and keep `detail` as a string. Never return
  FastAPI's default `{"detail": ...}` shape yourself.
- Business rules live on the backend in `business.py`:
  - slot grid step is 30 minutes;
  - booking window is today + 14 days (in the guest's timezone);
  - one booking per time slot, even across different event types
    (`storage.overlaps`);
  - working hours are configured per day of week (`WorkingHoursConfig`);
  - guest passes IANA timezone; `guestName` required, `guestEmail`/`guestPhone` optional.
- `startTime` must be ISO 8601 with timezone offset — naive datetimes are
  rejected with 400.

## Conventions

- `from __future__ import annotations` at the top of every module.
- Pydantic v2: `BaseModel`, `Field(ge=...)` for positive ints, `Literal` for
  day-of-week, `str | None = None` for optional fields (Python 3.10+).
- Routers use `Depends(get_storage)` to reach the `Storage` singleton; keep
  validation/domain logic out of routers — delegate to `business.py`/`storage.py`.
- `owner.py` already defines a helper `_missing()` for the common 404
  "Тип события не найден." — reuse the pattern.
- Messages to guests/owner are written in Russian (matches existing code and spec).
- The `app/` package uses relative imports (`from ..models import ...`).
