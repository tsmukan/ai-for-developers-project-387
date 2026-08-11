# Соглашение о сообщениях коммитов (Conventional Commits)

Все коммиты в репозитории следуют формату:

```
<type>(<optional-scope>): <description>
```

`<type>` — один из разрешённых ниже; `<scope>` — область изменения (необязательно),
`<description>` — краткое описание в инфинитиве, на английском (или русском), без точки.

## Типы

- `feat` — новая функциональность;
- `fix` — исправление пользовательского дефекта;
- `test` — добавление или изменение тестов;
- `docs` — документация;
- `ci` — GitHub Actions и CI;
- `build` — зависимости, сборка, инструменты;
- `refactor` — изменение кода без смены поведения;
- `chore` — служебные изменения.

## Примеры

```
feat(booking): add booking confirmation page
fix(availability): prevent selecting an occupied time slot
test(e2e): cover successful booking flow
ci(e2e): run Playwright checks on pull requests
docs: add commit message convention
```

## Несовместимые изменения

Помечайте breaking change явно:

```
feat!: remove legacy booking endpoint
```

или через footer:

```
feat(booking): switch to slot-based booking

BREAKING CHANGE: the legacy `book` endpoint is removed
```

## Release

Релизный PR (release-please) формируется автоматически на основе этих типов:
`feat` повышают minor, `fix`/`test`/`docs`/`ci`/`chore` — patch, `!`/`BREAKING
CHANGE` — major. CHANGELOG собирается из сообщений коммитов автоматически.