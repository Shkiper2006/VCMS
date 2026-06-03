# VCMS

VCMS — минимальное ядро собственного CMS-движка с акцентом на то, что должно отличать его от WordPress: модульное ядро, декларативные типы контента, API-first, блочная модель страниц и полноценный headless-режим.

## Выбранный стек

- **Backend:** Node.js + NestJS поверх framework-agnostic TypeScript-ядра
- **Frontend/admin:** React как отдельный клиент, который работает через API
- **База данных:** MySQL

## Реализованный минимальный набор функций

### 1. Модульная архитектура ядра

`src/main.ts` описывает реестр модулей `ModuleRegistry` и базовые модули:

- `core` — bootstrap, авторизация, маршруты, хуки, API surface и headless-конфигурация;
- `content` — контент, схемы типов контента, категории, теги и блоки страниц;
- `users` — пользователи, роли, права и сессии;
- `themes` — реестр тем и активная тема;
- `plugins` — плагины, хуки, расширение схем контента и кастомные блоки;
- `media` — медиатека для изображений, галерей и других ассетов.

Модульная модель также отражена в таблице `modules` миграции MySQL.

### 2. Декларативные типы контента

Типы контента больше не зашиты как enum `page | post`. Они описываются декларативными схемами:

- `content-types/page.json`;
- `content-types/post.json`;
- `ContentTypeRegistry` в `src/main.ts`;
- таблица `content_types` в `database/migrations/0001_create_initial_schema.sql`.

Схема задает slug, название коллекции, поля, статус по умолчанию и доступность REST/GraphQL/public read. Плагины могут регистрировать дополнительные схемы через `PluginManifest.contentTypes`.

### 3. API-first подход

В ядре добавлен `ApiSurface`, а в `src/backend/` реализован NestJS HTTP transport layer:

- REST endpoints для типов контента, материалов, блоков, медиа, пользователя и плагинов;
- GraphQL endpoint `POST /graphql` для контентного API;
- `ApiModule` оборачивает доменный слой `createCmsKernel`, `ContentRepository`, `MediaLibrary`, `ThemeRegistry`, `PluginManager` и `InMemoryUserService`, поэтому будущие DB-backed сервисы можно подключать за тем же API-фасадом;
- сериализация материала в API-ресурс через `ContentRepository.toRestResource`;
- пример GraphQL-like выборки через `ContentRepository.queryGraphQlContent`;
- CORS включается в NestJS bootstrap из `DEFAULT_HEADLESS_CONFIG.corsOrigins`.

Админ-панель рассматривается как отдельный клиент в `frontend/admin/`, который подключается к `/api/*`, а не как часть серверного HTML. В dev-режиме Vite проксирует `/api` и `/graphql` на NestJS backend, а в production NestJS может отдавать собранную админку из `frontend/admin/dist` по `/admin/*`.

### 4. Система блоков для страниц

`BlockRegistry` содержит встроенные блоки:

- `text` — текстовый/markdown-фрагмент;
- `image` — изображение из медиатеки;
- `gallery` — галерея медиафайлов;
- `form` — декларативная форма;
- `video` — внешнее видео с подписью;
- `plugin:*` — кастомный блок, зарегистрированный плагином.

Контентный материал может содержать массив `blocks`, а постоянная модель хранит блоки в таблице `content_blocks`.

### 5. Headless-режим

`DEFAULT_HEADLESS_CONFIG` включает headless-режим по умолчанию:

- `enabled: true`;
- `adminClientPath: /admin`;
- `publicRendering: hybrid` — VCMS может отдавать как API для внешнего фронтенда, так и тему для классического сайта;
- `corsOrigins: ['*']` как начальная настройка для интеграций.

В MySQL это отражено таблицей `headless_settings`.


### 6. Блочный редактор с черновиками

Для авторов добавлен отдельный flow блочного редактирования через активную тему:

1. В админке нажать **«Добавить»**.
2. Перейти на `/editor/new/page` для страницы или `/editor/new/post` для записи.
3. Создать черновик и собрать страницу блоками: текст, изображение, галерея, форма или видео.
4. Использовать overlay активной темы: кнопку **«Добавить»**, панель блоков, inline-редактирование текста, загрузку/выбор изображения, вставку видео и удаление блока.
5. Нажимать **«Сохранить черновик»**, чтобы изменения не появлялись на публичном сайте немедленно.
6. Проверить результат на `/editor/preview/:type/:id`.
7. Нажать **«Опубликовать»**, чтобы вызвать `POST /api/content/:type/:id/publish`.

API для редактора включает создание черновика, добавление блока, удаление блока, изменение порядка блоков, обновление данных блока, предпросмотр и публикацию: `POST /api/content/:type/drafts`, `POST /api/content/:type/:id/blocks`, `DELETE /api/content/:type/:id/blocks/:blockId`, `PATCH /api/content/:type/:id/blocks/order`, `PATCH /api/content/:type/:id/blocks/:blockId`, `GET /api/content/:type/:id/preview`, `POST /api/content/:type/:id/publish`.

## Пользователи и роли

В `src/main.ts` описаны роли `admin`, `editor`, `author`, `guest`, матрица прав и сервис авторизации:

- **администратор** — полный доступ к админке, контенту, страницам, медиа и пользователям;
- **редактор** — управление контентом, страницами и медиа без управления пользователями;
- **автор** — создание и редактирование собственных материалов, загрузка медиа;
- **гость** — просмотр публичного сайта.

`InMemoryUserService` предоставляет создание пользователей, список пользователей для администратора и минимальный вход по email/passwordHash.

## Контент

`ContentRepository` реализует базовые операции для страниц, постов и будущих кастомных типов контента:

- категории и теги;
- черновики (`status: "draft"`);
- публикация по расписанию (`status: "scheduled"`, `scheduledFor`, метод `publishDue`);
- публичный REST-ресурс с `links.self` и `links.collection`;
- GraphQL-like выдача опубликованных материалов.

## Админ-панель

Минимальные административные маршруты объявлены в `ADMIN_ROUTES`:

- `POST /admin/login` — вход;
- `GET /admin` — dashboard;
- `GET /admin/posts` — список записей;
- `POST /admin/posts` — редактор записи/создание черновика;
- `GET /admin/pages` — управление страницами;
- `GET /admin/content-types` — схемы типов контента;
- `GET /admin/media` — медиатека;
- `GET /admin/users` — управление пользователями;
- `GET /admin/plugins` — управление плагинами;
- `GET /admin/themes` — управление темами;
- `GET /admin/themes/editor` — визуальный редактор активной темы.

React-приложение админки находится в `frontend/admin/` и запускается как Vite + React + TypeScript workspace. В dev-режиме точка входа в админку: `http://localhost:5173/admin`; экран входа доступен по `http://localhost:5173/admin/login`. Vite dev server проксирует `/api` и `/graphql` на `http://localhost:3000`, а NestJS backend отдает production-сборку админки из `frontend/admin/dist` по `/admin/*`.

## Публичный сайт

Минимальные публичные маршруты объявлены в `PUBLIC_ROUTES`:

- `GET /` — главная страница;
- `GET /posts/:slug` — страница записи;
- `GET /category/:slug` — страница категории;
- `GET /search` — поиск.

В headless-режиме внешний frontend может не использовать эти маршруты и читать контент через `/api/content/*` или `/graphql`.

## Расширяемость

В ядре добавлены базовые точки расширения:

- `ThemeRegistry` — активация и получение текущей темы;
- `PluginManager` — регистрация плагинов, их setup-функций, типов контента и блоков;
- `HookBus` — подписка на события и последовательная обработка хуков.

Поддерживаемые события: `cms.boot`, `user.login`, `content.beforeSave`, `content.afterSave`, `content.beforePublish`, `content.afterPublish`, `public.beforeRender`.

## Структура проекта

```text
src/                    Основная логика CMS-движка
  modules/              Доменные модули движка и README по областям
content-types/          Декларативные JSON-схемы типов контента
public/                 Публичная точка входа сайта
frontend/admin/         Административная панель как отдельный клиент
themes/                 Темы сайта
plugins/                Плагины CMS
config/                 Конфигурация проекта
database/migrations/    Миграции базы данных
```

## Пример использования ядра

```ts
import { createCmsKernel } from './src/main';

const cms = createCmsKernel();
const admin = cms.users.createUser({
  email: 'admin@example.test',
  name: 'Admin',
  role: 'admin',
  passwordHash: 'local-demo-hash',
});

const category = cms.content.createCategory({ slug: 'news', title: 'Новости' }, admin);
const hero = cms.blocks.createBlock('text', { text: 'Добро пожаловать в VCMS' });
const draft = cms.content.saveDraft({
  type: 'post',
  title: 'Первый пост',
  slug: 'first-post',
  body: 'Текст публикации',
  blocks: [hero],
  authorId: admin.id,
  categoryIds: [category.id],
  tagIds: [],
}, admin);

cms.content.publish(draft.id, admin);
console.log(cms.content.toRestResource(draft));
```

## Конфигурация

- `config/app.json` — базовая конфигурация проекта и выбранного стека.
- `.env.example` — пример переменных окружения для локального запуска.
- `install.php` — веб-установщик, который собирает название, описание и URL сайта, проверяет MySQL-подключение, выполняет миграцию `database/migrations/0001_create_initial_schema.sql`, создает администратора и сохраняет настройки в `.env`.

Минимальный ручной сценарий без веб-установщика:

```bash
cp .env.example .env
```

Затем измените параметры `APP_NAME`, `APP_URL`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` и `DB_PASSWORD` под свое окружение MySQL.

При установке через `/install.php` эти значения записываются автоматически. После успешной установки создается флаг `storage/installed.lock`, поэтому повторный запуск установщика будет заблокирован до удаления этого файла вручную.

## Локальный запуск

1. Установите Node.js 20+, PHP с расширением `pdo_mysql` и MySQL.
2. Подготовьте пустую MySQL-базу и пользователя, который может создавать таблицы и внешние ключи.
3. Скопируйте файлы проекта в директорию веб-сервера или запустите встроенный PHP-сервер из корня проекта:

   ```bash
   php -S localhost:8080
   ```

4. Откройте `http://localhost:8080/install.php` и пройдите шаги установки: параметры сайта, данные MySQL, данные администратора и подтверждение запуска миграции.
5. Если вы не используете веб-установщик, скопируйте `.env.example` в `.env`, настройте переменные окружения и выполните SQL из `database/migrations/0001_create_initial_schema.sql` вручную.
6. Установите зависимости проекта и admin workspace:

   ```bash
   npm install
   ```

7. Запустите NestJS backend в dev-режиме:

   ```bash
   npm run dev:backend
   ```

   Backend слушает `http://localhost:3000`, включает CORS из `DEFAULT_HEADLESS_CONFIG` и публикует маршруты `/api/*`, `/graphql` и `/admin/*` для production-сборки админки.

8. В отдельном терминале запустите админ-панель в dev-режиме:

   ```bash
   npm run dev:admin
   ```

   Затем откройте `http://localhost:5173/admin` для dashboard или `http://localhost:5173/admin/login` для экрана входа. Vite проксирует API-запросы на backend.

9. Для production-режима соберите админку и запустите backend:

   ```bash
   npm run build:admin
   npm run dev:backend
   ```

   После сборки NestJS будет отдавать React SPA по `http://localhost:3000/admin`.

10. Запустите проверку TypeScript:

   ```bash
   npm run check
   npm run check:admin
   ```
