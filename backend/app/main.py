from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .business import BookingError
from .routers import owner, public

app = FastAPI(title="Calendar Booking", version="0.1.0")


# Contract says errors look like: {"message": ..., "details"?: ...}.
# FastAPI defaults to {"detail": ...}, so map it to the agreed shape.
@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    payload = (
        {"message": exc.detail}
        if isinstance(exc.detail, str)
        else {"message": "Ошибка запроса", "details": exc.detail}
    )
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(BookingError)
async def booking_error_handler(_: Request, exc: BookingError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"message": exc.message})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    details = json.dumps(exc.errors(), ensure_ascii=False, default=str)
    return JSONResponse(
        status_code=422,
        content={"message": "Некорректные данные запроса", "details": details},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router)
app.include_router(owner.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


def _find_frontend_dist() -> Path | None:
    candidates = [
        Path(os.environ["FRONTEND_DIST"]) if os.environ.get("FRONTEND_DIST") else None,
        Path(__file__).resolve().parents[1] / "frontend" / "dist",
        Path(__file__).resolve().parents[2] / "frontend" / "dist",
    ]
    return next((candidate for candidate in candidates if candidate and candidate.is_dir()), None)


def _mount_frontend(dist: Path) -> None:
    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> FileResponse:
        target = (dist / full_path).resolve()
        if full_path and target.is_file() and target.is_relative_to(dist.resolve()):
            return FileResponse(target)
        return FileResponse(dist / "index.html")


_frontend_dist = _find_frontend_dist()
if _frontend_dist is not None:
    _mount_frontend(_frontend_dist)


__all__ = ["app"]