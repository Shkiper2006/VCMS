# Plugins

Place CMS plugins in this directory. Each plugin should include a manifest and isolated source files.

Минимальный manifest плагина:

```json
{
  "name": "example-plugin",
  "version": "0.1.0",
  "description": "Adds behavior through VCMS hooks.",
  "hooks": ["content.afterPublish"]
}
```

Плагины подключаются через `PluginManager.register()` и могут подписываться на события `HookBus`.
