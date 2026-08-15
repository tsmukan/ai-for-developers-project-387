# Проблемы и улучшения

Выполненные пункты удаляются по мере закрытия. Крупные задачи ведутся как
issues на GitHub и ссылаются отсюда.

## Backend (backend/)

- DST-край: итерация по сетке `+= 30 min` — wall-clock, в DST-зонах владельца
  даёт дубли/пропуски слотов. → [#23](https://github.com/tsmukan/ai-for-developers-project-387/issues/23)
- Брони хранятся как dict, а не Booking — непоследовательная типизация.
  → [#26](https://github.com/tsmukan/ai-for-developers-project-387/issues/26)
- Дублирование: маппинг дня недели, dict-компрессия working hours,
  слот-вычисления, паттерн 404.
  → [#27](https://github.com/tsmukan/ai-for-developers-project-387/issues/27)

## Frontend (frontend/)

- `request()` не прокидывает AbortSignal из React Query — отмена запросов не
  работает. → [#25](https://github.com/tsmukan/ai-for-developers-project-387/issues/25)
- Нет единого formatter-модуля (форматирование разбросано).
  → [#28](https://github.com/tsmukan/ai-for-developers-project-387/issues/28)
- react-query живёт в feature-компонентах owner, а не в `pages/` (нарушение
  AGENTS.md). → [#30](https://github.com/tsmukan/ai-for-developers-project-387/issues/30)

## Инструменты / инфраструктура

- OpenAPI: ErrorBody задокументирован как HTTP 200 (anyOf), а не как 4xx/5xx —
  нужен `@statusCode` в spec/api.tsp.
  → [#24](https://github.com/tsmukan/ai-for-developers-project-387/issues/24)
- Dockerfile: root-user, unpinned базовые образы.
  → [#29](https://github.com/tsmukan/ai-for-developers-project-387/issues/29)

## Новые фичи (план)

- Отмена брони + статус: referenceCode у гостя, POST /bookings/{referenceCode}/cancel
  и POST /owner/bookings/{bookingId}/cancel, Booking.status confirmed/cancelled,
  отменённые не блокируют слоты.
  → [#16](https://github.com/tsmukan/ai-for-developers-project-387/issues/16)
- Buffer и minimum notice: bufferBeforeMinutes/bufferAfterMinutes на тип события,
  глобальный minimumNoticeMinutes через GET/PUT /owner/settings/booking.
  → [#17](https://github.com/tsmukan/ai-for-developers-project-387/issues/17)
- Исключения из расписания: overrides (дата, доступность, время) в
  WorkingHoursConfig, приоритетнее рабочих часов.
  → [#18](https://github.com/tsmukan/ai-for-developers-project-387/issues/18)
- Location: поле «где встреча» на типе события, показ в подтверждении и панели.
  → [#19](https://github.com/tsmukan/ai-for-developers-project-387/issues/19)
- SQLite вместо in-memory: переписать Storage на sqlite3 (интерфейс сохранить),
  сид идемпотентный, тесты/e2e на свежем файле.
  → [#20](https://github.com/tsmukan/ai-for-developers-project-387/issues/20)
- Деплой на Railway: через MCP, готовый Dockerfile, health-check /health, домен,
  при желании volume для data.db.
  → [#21](https://github.com/tsmukan/ai-for-developers-project-387/issues/21)
- Дэшборд статистики: GET /owner/stats (всего/активные/отменённые, по типам
  событий, по дням) + вкладка в панели владельца.
  → [#22](https://github.com/tsmukan/ai-for-developers-project-387/issues/22)

Сначала контракт (spec/api.tsp + npm run spec:compile + frontend/types.ts),
затем backend + pytest, затем frontend + build + e2e, в конце — SQLite и Railway.