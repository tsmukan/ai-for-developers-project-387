### Hexlet tests and linter status:
[![Actions Status](https://github.com/tsmukan/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/tsmukan/ai-for-developers-project-387/actions)

# Calendar Booking App

Аналог cal.com с ограниченным функционалом. Владелец календаря настраивает
типы событий, рабочие часы и профиль; гость выбирает тип, свободный слот
в окне «сегодня + 14 дней» и оставляет заявку — без регистрации.

## Стек

- **Backend** (`backend/`): Python + FastAPI, in-memory хранилище, тесты pytest.
- **Frontend** (`frontend/`): TypeScript + Vite + React, shadcn/ui, Tailwind CSS v4,
  `@tanstack/react-query`, `react-router` (v8), тесты vitest + Playwright e2e.
- **Контракт**: TypeSpec (`spec/api.tsp`) → OpenAPI (`spec/openapi.yaml`).

## Запуск

```bash
# Бэкенд (из backend/)
python3 -m venv .venv
.venv/bin/pip install -e '.[dev]'
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000

# Фронтенд (из frontend/)
npm install
npm run dev   # http://localhost:5173
```

Без бэкенда фронтенд можно поднять на Prism-моке контракта:

```bash
npm run spec:mock   # http://localhost:4000
```

Подробности по запуску, отладке и e2e — в [AGENTS.md](AGENTS.md), сценарии
тестирования — в `docs/user-scenarios.md`.