# VCMS Admin

React-based administrative panel for managing content, themes, users, and plugins.

Минимальный набор экранов, который должен быть подключен к API ядра:

- вход: `POST /admin/login`;
- dashboard: `GET /admin`;
- список записей: `GET /admin/posts`;
- редактор записи: `POST /admin/posts`;
- управление страницами: `GET /admin/pages`;
- управление пользователями: `GET /admin/users`.

Права доступа определяются ролями из `ROLE_PERMISSIONS` в `src/main.ts`.
