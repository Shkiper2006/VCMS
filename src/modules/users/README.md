# Users module

Минимальная реализация находится в `src/main.ts`:

- роли: `admin`, `editor`, `author`, `guest`;
- матрица прав: `ROLE_PERMISSIONS`;
- проверка прав: `AuthorizationService`;
- создание пользователей, список пользователей и вход: `InMemoryUserService`.

План развития: заменить in-memory-хранилище PostgreSQL-репозиторием, добавить безопасное хэширование паролей, refresh-токены и аудит действий.
