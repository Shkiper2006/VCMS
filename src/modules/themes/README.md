# Themes module

Модуль `themes` отвечает за темы и server-side rendering, если VCMS используется не только как headless backend.

Минимальная реализация находится в `ThemeRegistry` в `src/main.ts`.

Реестр хранит активную тему и ее manifest. Тема по умолчанию описана в `themes/default/theme.json`. В headless-режиме тема может не использоваться, а внешний frontend получает данные через REST или GraphQL API.

План развития: загрузка шаблонов из темы, asset pipeline, preview темы, настройка layout-областей и гибридный режим theme/headless.
