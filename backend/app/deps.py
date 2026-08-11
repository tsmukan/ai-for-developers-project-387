from __future__ import annotations

from .storage import Storage

storage = Storage()


def get_storage() -> Storage:
    return storage