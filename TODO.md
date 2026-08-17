# Проблемы и улучшения

Выполненные пункты удаляются по мере закрытия. Крупные задачи заводятся как
issues на GitHub.

Backend (backend/)
Баги:
1. DST-край: итерация по сетке `+= 30 min` — wall-clock, в DST-зонах владельца
   даёт дубли/пропуски слотов (business.py `list_slots`).
2. Удаление event type оставляет «осиротевшие» брони.

Качество кода:
- Брони хранятся как dict, а не Booking — непоследовательная типизация
  (storage.py, business.create_booking).
- Дублирование: маппинг дня недели, dict-компрессия working hours,
  слот-вычисления, паттерн 404.

Frontend (frontend/)
Проблемы:
- Нет единого formatter-модуля (форматирование разбросано).

Инструменты / инфраструктура
1. OpenAPI: ErrorBody задокументирован как HTTP 200 (anyOf), а не как 4xx/5xx —
   нужен @statusCode в spec/api.tsp.
2. Dockerfile: root-user, unpinned базовые образы.

## Новые фичи (план)

- Отмена брони + статус: referenceCode у гостя, POST /bookings/{referenceCode}/cancel
  и POST /owner/bookings/{bookingId}/cancel, Booking.status confirmed/cancelled,
  отменённые не блокируют слоты.
- Buffer и minimum notice: bufferBeforeMinutes/bufferAfterMinutes на тип события,
  глобальный minimumNoticeMinutes через GET/PUT /owner/settings/booking.
- Исключения из расписания: overrides (дата, доступность, время) в
  WorkingHoursConfig, приоритетнее рабочих часов.
- Location: поле «где встреча» на типе события, показ в подтверждении и панели.
- SQLite вместо in-memory: переписать Storage на sqlite3 (интерфейс сохранить),
  сид идемпотентный, тесты/e2e на свежем файле.
- Деплой на Railway: через MCP, готовый Dockerfile, health-check /health, домен,
  при желании volume для data.db.
- Дэшборд статистики: GET /owner/stats (всего/активные/отменённые, по типам
  событий, по дням) + вкладка в панели владельца.

Сначала контракт (spec/api.tsp + npm run spec:compile + frontend/types.ts),
затем backend + pytest, затем frontend + build + e2e, в конце — SQLite и Railway.