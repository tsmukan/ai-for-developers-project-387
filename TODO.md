Проблемы и улучшения

Backend (backend/)
Баги (высокий приоритет):
1. Race condition при бронировании — storage.overlaps() и add_booking() — две отдельные блокировки (business.py:125-139, storage.py:103-112). Два одновременных запроса на один слот создадут дубль. Нужен атомарный try_add_booking.
2. GET /slots → 500 вместо 400 при невалидной IANA-таймзоне или кривых dateFrom/dateTo (business.py:42,45-46) — контракт нарушен, ZoneInfo/ValueError не ловятся.
3. 422 не маппятся в ErrorBody — main.py:19-26 перехватывает только HTTPException; валидационные ошибки Pydantic возвращают дефолтный {"detail": [...]}.
4. list_slots не обрезает окно до today+14 при переданном dateTo — слоты показываются, но бронь их отклоняет.
5. Рабочие часы не валидируются (формат "25:99", несовпадение с 30-минутной сеткой 09:15) → 500-ы и «мёртвые» слоты, которые показываются, но не бронируются.
6. DST-край: итерация по сетке += 30 min — wall-clock, в DST-зонах владельца даёт дубли/пропуски.
7. _day_bounds второй элемент неверен на DST и не используется (мёртвый код), self.now в storage.py:63 не используется.
Качество кода:
- Брони хранятся как dict, а не Booking — непоследовательная типизация (storage.py:96-112).
- Mis-typed сигнатуры: create_event_type(data: dict) получает Pydantic-модель (storage.py:75,81).
- Дублирование: маппинг дня недели (2 раза), dict-компрессия working hours, слот-вычисления, паттерн 404.
- Геттеры возвращают живые изменяемые объекты после снятия блокировки — можно мутировать в обход лока.
- Брони прошлых дат никогда не чистятся — память растёт.
- Удаление event type оставляет «осиротевшие» брони.
- Непоследовательные статус-коды: литералы в public.py vs status.* в owner.py.
- pyproject.toml:17 — httpx2 в dev-зависимостях (спорно), requirements.txt дублирует и расходится.
- version="0.0.0" в main.py:14 против 0.1.0 в pyproject.
- Нет тестов: DST, битые таймзоны в /slots, фильтры дат, валидация рабочих часов, 422-форма, concurrency.

Frontend (frontend/)
Проблемы:
 1. shadcn CLI в dependencies вместо devDependencies (package.json:30).
 2. next-themes без ThemeProvider — тёмная тема полунастроена (sonner.tsx), dark: классы и CSS-переменные мёртвые.
 3. Нет Error Boundary — любой runtime-throw затирает приложение. Нет 404-роута — пустая страница.
 4. BookingForm.tsx:107 — фрагментный разбор строки split(', ')[1] вместо formatTime.
 5. GuestPage.tsx:34 — guessTimezone() вызывается дважды (должно быть todayInTz(timezone)).
 6. Неинвалидируется ['owner','bookings'] после гостевой брони; изменения владельца не инвалидируют гостевые слоты.
 7. retry: 1 ретраит и 4xx.
 8. Мёртвый код: ownerApi.getEventType, ErrorBody, badge.tsx, карточки, TableFooter/Caption, chart/sidebar CSS-переменные.
 9. Пустые <input type="time"> проходят валидацию → 500 на бэкенде.
10. request() не прокидывает AbortSignal — отмена запросов не работает.
11. Форматирование не унифицировано (нет formatter), нет typecheck-скрипта.
12. Нет обработки ошибок eventTypesQuery/profileQuery в BookingsTable.
13. Комментарий-нереализованность в GuestPage.tsx:97.

Инструменты / инфраструктура
1. spec:mock сломан: prism не в зависимостях + дефолтный порт Prism — 4010, не 4000.
2. CI пропускает: юнит-тесты фронта (vitest), pytest бэкенда, spec:compile (устаревший openapi.yaml не проверяется). Только lint+build+e2e.
3. backend/calendar_booking_backend.egg-info/ закоммичен в git; .gitignore не покрывает *.egg-info.
4. OpenAPI: ErrorBody задокументирован как HTTP 200 (anyOf), а не как 4xx/5xx — нужно @statusCode.
5. @typespec/rest импортирован, но не используется.
6. Dockerfile: root-user, unpinned базовые образы.
7. release-please: package-name "calendar-booking" vs фактический "frontend"; changelog уедет в frontend/CHANGELOG.md.
8. AGENTS.md устарел: react-router-dom → react-router v8; backend/.venv не существует; spec:mock не работает.
9. README.md — почти пустой (2 строки).

## Новые фичи (план)

- Отмена брони + статус: referenceCode у гостя, POST /bookings/{referenceCode}/cancel и POST /owner/bookings/{bookingId}/cancel, Booking.status confirmed/cancelled, отменённые не блокируют слоты.
- Buffer и minimum notice: bufferBeforeMinutes/bufferAfterMinutes на тип события, глобальный minimumNoticeMinutes через GET/PUT /owner/settings/booking.
- Исключения из расписания: overrides (дата, доступность, время) в WorkingHoursConfig, приоритетнее рабочих часов.
- Location: поле «где встреча» на типе события, показ в подтверждении и панели.
- SQLite вместо in-memory: переписать Storage на sqlite3 (интерфейс сохранить), сид идемпотентный, тесты/e2e на свежем файле.
- Деплой на Railway: через MCP, готовый Dockerfile, health-check /health, домен, при желании volume для data.db.
- Дэшборд статистики: GET /owner/stats (всего/активные/отменённые, по типам событий, по дням) + вкладка в панели владельца.

Сначала контракт (spec/api.tsp + npm run spec:compile + frontend/types.ts), затем backend + pytest, затем frontend + build + e2e, в конце — SQLite и Railway.