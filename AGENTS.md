# Calendar Booking App

Аналог cal.com с ограниченным функционалом. Две роли: владелец календаря (без
регистрации/авторизации) и гость (без аккаунта).

## API-контракт

Тип спецификации: TypeSpec
Файл: `spec/api.tsp`

Компиляция в OpenAPI (требует `@typespec/compiler`):
```
npm run spec:compile
# или: tsp compile spec/api.tsp
```
Результат: `spec/openapi.yaml` (см. `tspconfig.yaml` — emitter `@typespec/openapi3`).

Запуск Prism-мока (для разработки фронтенда без бэкенда):
```
npm run spec:mock
# → http://localhost:4000
```

## Ключевые правила

- На одно время нельзя создать две записи (даже разные типы событий).
- Окно записи: сегодня + 14 дней.
- Шаг сетки слотов: 30 минут.
- Рабочее время настраивается владельцем (по дням недели).
- Гость передаёт часовой пояс (IANA).
- guestName — обязателен; guestEmail, guestPhone — опциональны.

## Стек

### Frontend (`frontend/`)
- TypeScript + Vite + React
- shadcn/ui (Radix), Tailwind CSS v4, `@tanstack/react-query`, `react-router-dom`
- Node установлен нативно для Linux через nvm (`$HOME/.nvm`, LTS 24.x).
  НЕ запускать через Windows `node.exe` — под Linux-NPM ставится своя
  подборка нативных биндингов (rolldown). После переключения платформы Vite
  может не стартовать с ошибкой `Cannot find native binding` — тогда
  переустановить зависимости:
  ```
  rm -rf node_modules package-lock.json && npm install
  ```
- Сборка/разработка (запускать из `frontend/`, Linux-node через nvm):
  ```
  npm install
  npm run dev      # http://localhost:5173
  npm run build    # tsc -b && vite build
  ```
- API base URL: `VITE_API_BASE_URL` в `frontend/.env.local` (файл в `.gitignore`).
  Для работы с настоящим бэкендом: `VITE_API_BASE_URL=http://localhost:8000`.
  По умолчанию (без `.env.local`) — `http://localhost:4000` (Prism-мок;
  см. `frontend/.env.example`).
- Роуты: `/` — гость (выбор типа → слоты → форма брони), `/owner` —
  панель владельца (типы событий, брони, рабочие часы, профиль).

### Backend (`backend/`)
- Python + FastAPI, хранение в памяти.
- Запуск (venv уже есть в `backend/.venv`):
  ```
  cd backend
  .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```
- Health-check: `GET http://localhost:8000/health`.
- Тесты: `cd backend && .venv/bin/pytest`
- CORS разрешён для `http://localhost:5173`.

## Запуск (проверено 09.08.2026)

- **Бэкенд** (запускать из `backend/`):
  ```
  .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```
  Проверка: `GET http://localhost:8000/health` → `{"status":"ok"}`. Если порт
  8000 занят — уже работает экземпляр, второй не стартует; перезапуск бэкенда
  сбрасывает in-memory хранилище.
- **Фронтенд** (запускать из `frontend/`): `npm run dev` → `http://localhost:5173`.
  - Если порт 5173 занят старым Vite-процессом, Vite поднимется на 5174 и т.п.
    Сначала убить старые Vite-процессы, чтобы фронт встал именно на 5173 —
    бэкенд разрешает CORS только для `localhost:5173`. Рестарт uvicorn при этом
    не нужен.
  - Найти процессы: `ps aux | grep -E "uvicorn|vite"`.
- CORS бэкенда допускает только `http://localhost:5173` / `127.0.0.1:5173`
  (см. `backend/app/main.py`). Фронт на другом порту получит
  `400 Disallowed CORS origin`, и приложение покажет «API недоступен».
- После старта обоих проверить end-to-end: `OPTIONS /event-types` с Origin
  `http://localhost:5173` → 200.

- Запуск e2e (Playwright, реальная связка frontend+backend, из `frontend/`):
  ```
  npx playwright install chromium   # один раз
  npm run test:e2e                  # сам поднимает backend (:8000) и frontend (:5173)
  npm run test:e2e:ui               # Playwright UI
  npm run test:e2e:report           # HTML-отчёт
  ```
  Сценарии и изоляция тестовых данных — `docs/user-scenarios.md`.

## Требования к реализации

### Frontend
- Фронтенд — отдельная часть приложения.
- Фронтенд получает данные и выполняет действия только через API по контракту.
- Интерфейс должен корректно работать с отдельно запущенным бэкендом.

### Backend
- Бэкенд предоставляет API по спецификации контракта из шага проектирования.
- API бэкенда предназначен для отдельного фронтенд-клиента.
- Основные бизнес-правила бронирования реализуются на стороне бэкенда.
- На данном этапе отдельная база данных не нужна. Достаточно простого
  хранилища в памяти: после перезапуска сервиса данные могут сбрасываться.

## Git: коммиты и PR

- Коммиты и заголовки PR — в стиле Conventional Commits:
  `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`,
  `build`, `revert` (+ optional scope, например `feat(backend):`).
- Формат: `<type>(<scope>): <описание>` — описание в повелительном наклонении,
  строчными буквами, без точки в конце.
- Тело коммита при необходимости — после пустой строки.
- Заголовок PR = conventional-коммит; тип и scope в зависимости от изменения.
