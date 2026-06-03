# Core module

Модуль `core` отвечает за bootstrap ядра, модульный реестр, маршруты, хуки, API surface и headless-конфигурацию.

Минимальная реализация находится в `src/main.ts`:

- `ModuleRegistry` хранит модули `core`, `content`, `users`, `themes`, `plugins`, `media` и проверяет зависимости;
- `RouteDefinition` описывает public/admin/API маршруты;
- `ApiSurface` разделяет REST и GraphQL endpoints;
- `DEFAULT_HEADLESS_CONFIG` включает режим backend-first для внешних frontend-клиентов.

План развития: вынести каждый модуль в отдельный NestJS module, добавить DI-контейнер, health checks и версионирование API.
