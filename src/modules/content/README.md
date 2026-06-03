# Content module

Модуль `content` отвечает за материалы, категории, теги, декларативные типы контента и блочную модель страниц.

Минимальная реализация находится в `src/main.ts`:

- `ContentTypeRegistry` хранит схемы типов контента и валидирует `type` перед сохранением;
- `DEFAULT_CONTENT_TYPE_SCHEMAS` синхронизированы с JSON-файлами в `content-types/`;
- `ContentRepository` поддерживает черновики, публикацию, отложенную публикацию, поиск, REST-сериализацию и GraphQL-like выборку;
- `BlockRegistry` предоставляет блоки `text`, `image`, `gallery`, `form` и поддерживает `plugin:*` блоки.

Постоянная модель описана таблицами `content_types`, `content_items`, `content_blocks`, `content_categories` и `content_tags`.

План развития: заменить in-memory-хранилище PostgreSQL-репозиторием, добавить runtime-валидацию полей по схеме, ревизии, локализацию и workflow согласования.
