# VCMS

VCMS — минимальное ядро собственного CMS-движка с описанными доменными функциями, публичными маршрутами, административными маршрутами и точками расширения.

## Выбранный стек

- **Backend:** Node.js + NestJS (ядро сейчас вынесено в framework-agnostic TypeScript-модуль)
- **Frontend/admin:** React
- **База данных:** PostgreSQL

## Реализованный минимальный набор функций

### 1. Пользователи и роли

В `src/main.ts` описаны роли `admin`, `editor`, `author`, `guest`, матрица прав и сервис авторизации:

- **администратор** — полный доступ к админке, контенту, страницам и пользователям;
- **редактор** — управление контентом и страницами без управления пользователями;
- **автор** — создание и редактирование собственных материалов;
- **гость** — просмотр публичного сайта.

`InMemoryUserService` предоставляет создание пользователей, список пользователей для администратора и минимальный вход по email/passwordHash.

### 2. Контент

`ContentRepository` реализует базовые операции для:

- страниц (`type: "page"`);
- записей/постов (`type: "post"`);
- категорий;
- тегов;
- черновиков (`status: "draft"`);
- публикации по расписанию (`status: "scheduled"`, `scheduledFor`, метод `publishDue`).

Постоянная модель данных описана в `database/migrations/0001_create_initial_schema.sql`.

### 3. Админ-панель

Минимальные административные маршруты объявлены в `ADMIN_ROUTES`:

- `POST /admin/login` — вход;
- `GET /admin` — dashboard;
- `GET /admin/posts` — список записей;
- `POST /admin/posts` — редактор записи/создание черновика;
- `GET /admin/pages` — управление страницами;
- `GET /admin/users` — управление пользователями.

React-приложение админки пока остается отдельной заготовкой в `frontend/admin/` и должно подключиться к этим маршрутам после добавления NestJS API.

### 4. Публичный сайт

Минимальные публичные маршруты объявлены в `PUBLIC_ROUTES`:

- `GET /` — главная страница;
- `GET /posts/:slug` — страница записи;
- `GET /category/:slug` — страница категории;
- `GET /search` — поиск.

Для публичной части доступны методы `listPublished`, `findBySlug`, `findByCategory` и `search`.

### 5. Расширяемость

В ядре добавлены базовые точки расширения:

- `ThemeRegistry` — активация и получение текущей темы;
- `PluginManager` — регистрация плагинов и их setup-функций;
- `HookBus` — подписка на события и последовательная обработка хуков.

Поддерживаемые события: `cms.boot`, `user.login`, `content.beforeSave`, `content.afterSave`, `content.beforePublish`, `content.afterPublish`, `public.beforeRender`.

## Структура проекта

```text
src/                    Основная логика CMS-движка
  modules/              Доменные модули движка и README по областям
public/                 Публичная точка входа сайта
frontend/admin/         Административная панель
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
const draft = cms.content.saveDraft({
  type: 'post',
  title: 'Первый пост',
  slug: 'first-post',
  body: 'Текст публикации',
  authorId: admin.id,
  categoryIds: [category.id],
  tagIds: [],
}, admin);

cms.content.publish(draft.id, admin);
```

## Конфигурация

- `config/app.json` — базовая конфигурация проекта и выбранного стека.
- `.env.example` — пример переменных окружения для локального запуска.

Скопируйте файл окружения перед запуском:

```bash
cp .env.example .env
```

Затем при необходимости измените параметры подключения к PostgreSQL.

## Локальный запуск

1. Установите Node.js 20+ и PostgreSQL.
2. Скопируйте файл окружения:

   ```bash
   cp .env.example .env
   ```

3. Установите зависимости после добавления реальных пакетов backend/admin:

   ```bash
   npm install
   ```

4. Запустите проект в режиме разработки:

   ```bash
   npm run dev
   ```

5. Выполните миграции после подключения миграционного инструмента:

   ```bash
   npm run migrate
   ```

## Дальнейшие шаги

- Подключить `createCmsKernel()` к NestJS-контроллерам и PostgreSQL-репозиториям.
- Реализовать React-экраны админки для объявленных административных маршрутов.
- Добавить runner для миграций и seed-данные.
- Расширить формат манифестов для тем и плагинов.
