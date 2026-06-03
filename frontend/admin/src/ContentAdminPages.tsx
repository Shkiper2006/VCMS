import { useEffect, useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { type ContentResource, fetchJson, formatDate } from './admin-api';
import { useAuth } from './auth';

const contentLabels = {
  post: { plural: 'Записи', singular: 'запись', newPath: '/editor/new/post', apiPath: '/api/content/post' },
  page: { plural: 'Страницы', singular: 'страницу', newPath: '/editor/new/page', apiPath: '/api/content/page' },
} as const;

type ManagedContentType = keyof typeof contentLabels;

export function ContentListPage({ type }: { type: ManagedContentType }): JSX.Element {
  const { token } = useAuth();
  const [items, setItems] = useState<ContentResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const labels = contentLabels[type];

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(undefined);
    fetchJson<ContentResource[]>(labels.apiPath, token)
      .then((data) => {
        if (isActive) setItems(data);
      })
      .catch(() => {
        if (isActive) setError(`Не удалось загрузить ${labels.plural.toLowerCase()} из ${labels.apiPath}.`);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [labels.apiPath, labels.plural, token]);

  return (
    <section className="wp-panel">
      <div className="wp-panel__header">
        <div>
          <p className="dashboard__eyebrow">{labels.apiPath}</p>
          <h2>{labels.plural}</h2>
          <p>Список материалов из REST endpoint ядра с быстрым переходом к деталям и блочному редактору.</p>
        </div>
        <NavLink className="button-primary" to={labels.newPath}>Создать {labels.singular}</NavLink>
      </div>

      {error ? <div className="notice notice--error">{error}</div> : null}
      {isLoading ? <div className="notice">Загружаем данные…</div> : null}

      <div className="table-toolbar">
        <span>{items.length} элементов</span>
        <NavLink to={labels.newPath}>+ Добавить</NavLink>
      </div>

      <div className="wp-table-wrap">
        <table className="wp-table">
          <thead>
            <tr>
              <th>Заголовок</th>
              <th>Slug</th>
              <th>Статус</th>
              <th>Обновлено</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.title}</strong>
                  <small>{item.excerpt || item.body || 'Без описания'}</small>
                </td>
                <td><code>{item.slug}</code></td>
                <td><span className={`status-badge status-badge--${item.status ?? 'draft'}`}>{item.status ?? 'draft'}</span></td>
                <td>{formatDate(item.updatedAt)}</td>
                <td className="row-actions">
                  <NavLink to={`/admin/${type}s/${item.id}`}>Детали</NavLink>
                  <NavLink to={`/editor/${type}/${item.id}`}>Редактировать</NavLink>
                </td>
              </tr>
            ))}
            {!isLoading && items.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">Материалы пока не созданы.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ContentDetailPage({ type }: { type: ManagedContentType }): JSX.Element {
  const { id } = useParams();
  const { token } = useAuth();
  const labels = contentLabels[type];
  const [items, setItems] = useState<ContentResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isActive = true;
    fetchJson<ContentResource[]>(labels.apiPath, token)
      .then((data) => {
        if (isActive) setItems(data);
      })
      .catch(() => {
        if (isActive) setError(`Не удалось загрузить материал из ${labels.apiPath}.`);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [labels.apiPath, token]);

  const item = useMemo(() => items.find((candidate) => candidate.id === id || candidate.slug === id), [id, items]);

  if (isLoading) return <section className="wp-panel"><div className="notice">Загружаем материал…</div></section>;
  if (error) return <section className="wp-panel"><div className="notice notice--error">{error}</div></section>;
  if (!item) return <section className="wp-panel"><div className="notice notice--error">Материал не найден.</div></section>;

  return (
    <section className="wp-panel">
      <div className="wp-panel__header">
        <div>
          <p className="dashboard__eyebrow">{labels.apiPath}/{item.id}</p>
          <h2>{item.title}</h2>
          <p>{item.excerpt || 'Детальная карточка материала с метаданными из content API.'}</p>
        </div>
        <div className="toolbar-actions">
          <NavLink className="button-secondary" to={`/admin/${type}s`}>Назад к списку</NavLink>
          <NavLink className="button-primary" to={`/editor/${type}/${item.id}`}>Открыть редактор</NavLink>
        </div>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>Параметры публикации</h3>
          <dl>
            <dt>ID</dt><dd><code>{item.id}</code></dd>
            <dt>Тип</dt><dd>{item.type}</dd>
            <dt>Slug</dt><dd><code>{item.slug}</code></dd>
            <dt>Статус</dt><dd><span className={`status-badge status-badge--${item.status ?? 'draft'}`}>{item.status ?? 'draft'}</span></dd>
            <dt>Создано</dt><dd>{formatDate(item.createdAt)}</dd>
            <dt>Обновлено</dt><dd>{formatDate(item.updatedAt)}</dd>
          </dl>
        </article>
        <article className="detail-card detail-card--wide">
          <h3>Контент</h3>
          <p>{item.body || item.excerpt || 'Текстовое содержимое не заполнено.'}</p>
          <h4>Блоки</h4>
          <p>{item.blocks?.length ?? 0} блоков в редакторе.</p>
        </article>
      </div>
    </section>
  );
}
