# VCMS Admin

React-based administrative panel for managing content, content type schemas, blocks, media, themes, users, and plugins.

Админ-панель проектируется как отдельный клиент, а не как server-rendered часть backend. После добавления NestJS transport layer она должна работать через API ядра:

- вход: `POST /admin/login` или будущий `POST /api/auth/login`;
- dashboard: `GET /admin`;
- список записей: `GET /api/content/post`;
- редактор записи: `POST /api/content/:type`, `PATCH /api/content/:type/:id`;
- управление страницами: `GET /api/content/page`;
- схемы типов контента: `GET /api/content-types`;
- доступные блоки: `GET /api/blocks`;
- медиатека: `GET /api/media`, `POST /api/media`;
- управление пользователями: `GET /api/users/me` и будущие admin endpoints;
- плагины: `GET /api/plugins`;
- GraphQL-клиент: `POST /graphql`.

Права доступа определяются ролями из `ROLE_PERMISSIONS` в `src/main.ts`. Headless-режим включен в `DEFAULT_HEADLESS_CONFIG`, поэтому внешний frontend может использовать те же API endpoints, что и админ-панель.
