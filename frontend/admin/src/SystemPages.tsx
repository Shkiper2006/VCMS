import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { type ApiRouteInfo, type ContentTypeSchema, type PluginManifest, type ThemeManifest, fetchJson } from './admin-api';
import { adminNavItems } from './AdminLayout';
import { useAuth } from './auth';

type EndpointKind = 'themes' | 'plugins' | 'content-types';

const endpointConfig = {
  themes: { title: 'Внешний вид / Темы', path: '/api/themes', description: 'Реестр тем из Theme registry. Активная тема редактируется в визуальном редакторе.' },
  plugins: { title: 'Плагины', path: '/api/plugins', description: 'Подключенные расширения, их хуки, блоки и дополнительные типы контента.' },
  'content-types': { title: 'Схемы типов контента', path: '/api/content-types', description: 'Схемы post, page и будущих коллекций из декларативного content engine.' },
} as const;

export function ThemesPage(): JSX.Element {
  return <EndpointCardsPage kind="themes" />;
}

export function PluginsPage(): JSX.Element {
  return <EndpointCardsPage kind="plugins" />;
}

export function ContentTypesPage(): JSX.Element {
  return <EndpointCardsPage kind="content-types" />;
}

function EndpointCardsPage({ kind }: { kind: EndpointKind }): JSX.Element {
  const { token } = useAuth();
  const config = endpointConfig[kind];
  const [items, setItems] = useState<Array<ThemeManifest | PluginManifest | ContentTypeSchema>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    fetchJson<Array<ThemeManifest | PluginManifest | ContentTypeSchema>>(config.path, token)
      .then((data) => {
        if (isActive) setItems(data);
      })
      .catch(() => {
        if (isActive) setError(`Не удалось загрузить данные из ${config.path}.`);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [config.path, token]);

  return (
    <section className="wp-panel">
      <div className="wp-panel__header">
        <div>
          <p className="dashboard__eyebrow">{config.path}</p>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        {kind === 'themes' ? <NavLink className="button-primary" to="/admin/themes/editor">Открыть редактор темы</NavLink> : null}
      </div>

      {error ? <div className="notice notice--error">{error}</div> : null}
      {isLoading ? <div className="notice">Загружаем данные…</div> : null}

      <div className="cards-list">
        {items.map((item) => <ResourceCard key={getItemKey(item)} item={item} kind={kind} />)}
        {!isLoading && items.length === 0 ? <div className="notice">Данные пока отсутствуют.</div> : null}
      </div>
    </section>
  );
}

function ResourceCard({ item, kind }: { item: ThemeManifest | PluginManifest | ContentTypeSchema; kind: EndpointKind }): JSX.Element {
  const title = 'title' in item ? item.title : item.name;
  const slug = 'slug' in item ? item.slug : item.name;
  const meta = 'collectionName' in item ? item.collectionName : `v${item.version}`;

  return (
    <article className="resource-card">
      <div>
        <span className="resource-card__meta">{meta}</span>
        <h3>{title}</h3>
        <p>{item.description || 'Описание не указано.'}</p>
      </div>
      {kind === 'content-types' && 'fields' in item ? (
        <ul className="field-list">
          {item.fields.map((field) => <li key={field.name}><code>{field.name}</code> {field.label} · {field.kind}{field.required ? ' · required' : ''}</li>)}
        </ul>
      ) : null}
      {kind === 'plugins' && 'hooks' in item ? <p className="muted">Hooks: {item.hooks?.join(', ') || '—'}</p> : null}
      {kind === 'themes' ? <NavLink to="/admin/themes/editor">Редактировать внешний вид</NavLink> : <span className="muted">{slug}</span>}
    </article>
  );
}

function getItemKey(item: ThemeManifest | PluginManifest | ContentTypeSchema): string {
  return 'slug' in item ? item.slug : item.name;
}

export function UsersPage(): JSX.Element {
  const { user } = useAuth();

  return (
    <section className="wp-panel">
      <div className="wp-panel__header">
        <div>
          <p className="dashboard__eyebrow">/admin/users · /api/users/me</p>
          <h2>Пользователи</h2>
          <p>В README и src/main.ts для админки объявлен раздел пользователей; публичный REST endpoint сейчас возвращает текущий профиль.</p>
        </div>
      </div>
      <div className="wp-table-wrap">
        <table className="wp-table">
          <thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Права</th></tr></thead>
          <tbody>
            {user ? (
              <tr>
                <td><strong>{user.name}</strong><small>{user.id}</small></td>
                <td>{user.email}</td>
                <td><span className="status-badge">{user.role}</span></td>
                <td>{user.permissions.join(', ') || '—'}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CommentsPage(): JSX.Element {
  return <PlaceholderPage title="Комментарии" navPath="/admin/comments" note="Будущий аналог WordPress Comments: модерация обсуждений, отзывов и webhook-событий." />;
}

export function SettingsPage(): JSX.Element {
  const routes = useMemo<ApiRouteInfo[]>(() => [
    { method: 'GET', path: '/api/content/:type', module: 'content', name: 'List content by type', headlessReady: true },
    { method: 'POST', path: '/api/media', module: 'media', name: 'Upload media asset', requiredPermission: 'media:manage', headlessReady: true },
    { method: 'GET', path: '/api/themes', module: 'themes', name: 'List themes', requiredPermission: 'themes:manage', headlessReady: true },
    { method: 'GET', path: '/api/plugins', module: 'plugins', name: 'List plugins', requiredPermission: 'admin:access', headlessReady: true },
    { method: 'GET', path: '/api/content-types', module: 'content', name: 'List content type schemas', headlessReady: true },
    { method: 'POST', path: '/graphql', module: 'content', name: 'GraphQL content API', headlessReady: true },
  ], []);

  return (
    <section className="wp-panel">
      <div className="wp-panel__header">
        <div>
          <p className="dashboard__eyebrow">README · src/main.ts</p>
          <h2>Настройки</h2>
          <p>Краткая карта API-маршрутов, на которых строятся экраны админки.</p>
        </div>
      </div>
      <div className="wp-table-wrap">
        <table className="wp-table">
          <thead><tr><th>Метод</th><th>Маршрут</th><th>Модуль</th><th>Назначение</th><th>Доступ</th></tr></thead>
          <tbody>
            {routes.map((route) => (
              <tr key={`${route.method}-${route.path}`}>
                <td><span className="status-badge">{route.method}</span></td>
                <td><code>{route.path}</code></td>
                <td>{route.module}</td>
                <td>{route.name}</td>
                <td>{route.requiredPermission ?? 'public/admin session'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PlaceholderPage({ title, navPath, note }: { title: string; navPath: string; note: string }): JSX.Element {
  const current = adminNavItems.find((item) => item.path === navPath);
  return (
    <section className="wp-panel">
      <div className="wp-panel__header">
        <div>
          <p className="dashboard__eyebrow">Раздел админки</p>
          <h2>{title}</h2>
          <p>{current?.description ?? note}</p>
        </div>
      </div>
      <div className="notice">{note}</div>
    </section>
  );
}
