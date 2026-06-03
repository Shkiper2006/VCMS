# VCMS Admin

React-based administrative panel for managing content, content type schemas, blocks, media, themes, users, and plugins.

Админ-панель проектируется как отдельный клиент, а не как server-rendered часть backend. После добавления NestJS transport layer она должна работать через API ядра:

- вход: `POST /admin/login` или будущий `POST /api/auth/login`;
- dashboard: `GET /admin`;
- список записей: `GET /api/content/post`;
- блочный редактор: `GET /editor/new/:type`, `GET /editor/:type/:id`, `GET /editor/preview/:type/:id`;
- создание и сохранение черновика: `POST /api/content/:type/drafts`, `PATCH /api/content/:type/:id`;
- операции с блоками: `POST /api/content/:type/:id/blocks`, `PATCH /api/content/:type/:id/blocks/:blockId`, `DELETE /api/content/:type/:id/blocks/:blockId`, `PATCH /api/content/:type/:id/blocks/order`;
- предпросмотр и публикация: `GET /api/content/:type/:id/preview`, `POST /api/content/:type/:id/publish`;
- управление страницами: `GET /api/content/page`;
- схемы типов контента: `GET /api/content-types`;
- доступные блоки: `GET /api/blocks`;
- медиатека: `GET /api/media`, `POST /api/media`;
- управление пользователями: `GET /api/users/me` и будущие admin endpoints;
- плагины: `GET /api/plugins`;
- GraphQL-клиент: `POST /graphql`.

Права доступа определяются ролями из `ROLE_PERMISSIONS` в `src/main.ts`. Headless-режим включен в `DEFAULT_HEADLESS_CONFIG`, поэтому внешний frontend может использовать те же API endpoints, что и админ-панель.


## Visual theme editor

`frontend/admin/src/ThemeEditor.tsx` содержит React-экран визуального редактора активной темы. Экран проектируется для маршрута `/admin/themes/editor` и включает:

- canvas/preview-область с переключением шаблонов `home`, `page`, `post` и breakpoint-режимов `desktop`, `tablet`, `mobile`;
- palette для drag-and-drop добавления блоков (`text`, `image`, `gallery`, `form`, `content`);
- выделение блоков на canvas, resize handle-индикаторы и inspector для координат, размеров, порядка, margin и padding;
- preview-режим, который сохраняет черновую раскладку без публикации;
- публикацию layout активной темы через API.

### Theme editor API endpoints

- `GET /admin/themes` — административный раздел управления темами, требует `themes:manage`;
- `GET /admin/themes/editor` — экран визуального редактора активной темы, требует `themes:manage`;
- `GET /api/themes` — список доступных тем и их manifest-метаданных, требует `themes:manage`;
- `GET /api/themes/active/layout?template=home&preview=true` — чтение layout активной темы для выбранного шаблона; `preview=true` возвращает preview-черновик, если он есть;
- `PATCH /api/themes/active/layout?template=home&preview=true` — сохранение preview layout без публикации;
- `PATCH /api/themes/active/layout?template=home&preview=false` — публикация layout активной темы и сброс соответствующего preview-черновика.

Права доступа для редактора тем добавлены как `themes:manage` и выдаются ролям, которым разрешено изменять внешний вид сайта. Layout сохраняется в будущей PostgreSQL-таблице `theme_layouts`, а manifest темы может поставлять начальные `regions` и `editableTemplates` для bootstrap-состояния.


## Block content editor

`frontend/admin/src/ContentEditor.tsx` содержит экран блочного редактора материала для маршрутов `/editor/new/page`, `/editor/new/post`, `/editor/page/:id` и `/editor/post/:id`.

Основной flow автора:

1. В списке страниц или записей нажать кнопку **«Добавить»**.
2. Для страницы перейти на `/editor/new/page`, для записи — на `/editor/new/post`.
3. Создать черновик через `POST /api/content/:type/drafts`.
4. Собрать материал блоками в preview активной темы: текст редактируется inline, изображения выбираются/загружаются через медиатеку, видео вставляется по URL, блоки можно удалять и менять местами.
5. Нажимать **«Сохранить черновик»**, чтобы сохранить изменения без немедленного появления на публичном сайте.
6. Открыть `/editor/preview/:type/:id`, чтобы проверить черновик в том же rendering/theme слое, который используется после публикации.
7. Нажать **«Опубликовать»**, чтобы вызвать `POST /api/content/:type/:id/publish` и сделать материал доступным публично.

Редактор использует overlay активной темы: кнопку **«Добавить»**, панель блоков, inline-редактирование текста, выбор/загрузку изображения, вставку видео и удаление блока. Такой подход позволяет автору видеть страницу почти в том же виде, в котором она появится после публикации.
