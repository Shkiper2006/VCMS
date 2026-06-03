# Users module

Модуль `users` отвечает за пользователей, роли, права и сессии.

Минимальная реализация находится в `src/main.ts`:

- роли: `admin`, `editor`, `author`, `guest`;
- матрица прав: `ROLE_PERMISSIONS`;
- проверка прав: `AuthorizationService`;
- создание пользователей, список пользователей и вход: `InMemoryUserService`.

План развития: заменить in-memory-хранилище MySQL-репозиторием, добавить безопасное хэширование паролей, refresh-токены, API keys для headless-клиентов и аудит действий.
