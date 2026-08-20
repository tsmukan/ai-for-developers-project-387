# Проблемы и улучшения

Выполненные пункты удаляются по мере закрытия. Крупные задачи заводятся как
issues на GitHub.

## Закрыто (PR #название)

Backend:
- Брони хранятся как `Booking`, а не `dict`; сигнатуры
  `create_event_type`/`update_event_type` типизированы; геттеры возвращают
  копии (нельзя мутировать в обход лока).
- Обновлены тесты под типизацию броней.

Frontend:
- `request()` прокидывает AbortSignal из React Query — отмена запросов работает.
- `BookingsTable` показывает предупреждение при сбое eventTypesQuery/profileQuery
  вместо молчаливых «—»/UTC.
- Добавлен `npm run typecheck` (e2e-workflow использует его вместо `npm run build`).

Инфраструктура:
- Dockerfile: не-root пользователь и закреплённые базовые образы
  (`node:24.19.0-bookworm-slim`, `python:3.12.14-slim`).

## Открытые задачи → issues

Backend:
- DST-край в `list_slots` (дубли/пропуски слотов при переходе на летнее время) — #33.
- Удаление типа события оставляет «осиротевшие» брони — #34.
- Дублирование бизнес-кода (дни недели, working hours, слоты, 404) — #36.
- react-query живёт в feature-компонентах owner — #30.

Frontend:
- Тёмная тема полунастроена (next-themes без ThemeProvider, нет `.dark`-палитры) — #9.
- Нет единого formatter-модуля — #37.

Инструменты / инфраструктура:
- OpenAPI: ErrorBody задокументирован как HTTP 200 (anyOf), а не 4xx/5xx —
  нужен `@statusCode` — #38.
- CI: добавить vitest, pytest и проверку свежести `spec/openapi.yaml` — #14.

## Новые фичи (issues)

- Отмена брони + статус — #40.
- Buffer и minimum notice — #41.
- Исключения из расписания (overrides) — #42.
- Location — «где встреча» — #43.
- SQLite вместо in-memory — #44.
- Деплой на Railway — #45.
- Дэшборд статистики владельца — #46.

Порядок реализации фич: сначала контракт (spec/api.tsp + `npm run spec:compile`
+ frontend/types.ts), затем backend + pytest, затем frontend + build + e2e,
в конце — SQLite и Railway.