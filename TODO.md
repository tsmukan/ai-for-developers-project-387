# Проблемы и улучшения

Выполненные пункты удаляются по мере закрытия. Крупные задачи заводятся как
issues на GitHub.

В очереди ничего нет: мелкие баги закрыты PR #32, крупные задачи перенесены в
issues на GitHub:

- Backend: DST-край в слот-сетке (#33), «осиротевшие» брони при удалении типа
  события (#34), брони как Booking вместо dict (#35), дублирование кода (#36).
- Frontend: единый formatter-модуль (#37).
- Инфраструктура: OpenAPI ErrorBody задокументирован как 200 (#38), Dockerfile
  (root + unpinned) (#39).
- Фичи (план): отмена брони и статус (#40), buffer и minimum notice (#41),
  overrides (#42), location (#43), SQLite (#44), деплой на Railway (#45),
  дэшборд статистики (#46).

Порядок реализации фич: сначала контракт (spec/api.tsp + npm run spec:compile +
frontend/types.ts), затем backend + pytest, затем frontend + build + e2e, в
конце — SQLite и Railway.