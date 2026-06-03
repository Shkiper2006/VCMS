import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './auth';

interface AdminNavItem {
  path: string;
  label: string;
  icon: string;
  description: string;
}

export const adminNavItems: AdminNavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: '🏠', description: 'Обзор сайта, быстрые действия и состояние ядра.' },
  { path: '/admin/posts', label: 'Записи', icon: '📝', description: 'Публикации, черновики, рубрики и теги.' },
  { path: '/admin/pages', label: 'Страницы', icon: '📄', description: 'Иерархия страниц и запуск блочного редактора.' },
  { path: '/admin/media', label: 'Медиафайлы', icon: '🖼️', description: 'Файлы, изображения, галереи и метаданные.' },
  { path: '/admin/comments', label: 'Комментарии', icon: '💬', description: 'Будущий центр обсуждений, модерации и отзывов.' },
  { path: '/admin/themes', label: 'Внешний вид / Темы', icon: '🎨', description: 'Активная тема, шаблоны и визуальные настройки.' },
  { path: '/admin/plugins', label: 'Плагины', icon: '🔌', description: 'Расширения, хуки и дополнительные блоки.' },
  { path: '/admin/users', label: 'Пользователи', icon: '👥', description: 'Учетные записи, роли и права доступа.' },
  { path: '/admin/content-types', label: 'Схемы типов', icon: '🧩', description: 'Декларативные схемы page, post и будущих коллекций.' },
  { path: '/admin/settings', label: 'Настройки', icon: '⚙️', description: 'Headless API, маршруты и системная конфигурация.' },
];

export function AdminLayout(): JSX.Element {
  return (
    <div className="admin-shell">
      <Sidebar />
      <div className="admin-shell__body">
        <TopBar />
        <main className="admin-workspace">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function Sidebar(): JSX.Element {
  return (
    <aside className="admin-sidebar" aria-label="Главное меню админки">
      <NavLink to="/admin" className="admin-sidebar__brand">
        <span className="admin-sidebar__logo">V</span>
        <span>
          <strong>VCMS</strong>
          <small>WordPress-style Admin</small>
        </span>
      </NavLink>
      <nav className="admin-sidebar__nav">
        {adminNavItems.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === '/admin'} title={item.description}>
            <span className="admin-sidebar__icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="admin-sidebar__footer">
        <span>API-first CMS</span>
        <strong>/api · /graphql</strong>
      </div>
    </aside>
  );
}

export function TopBar(): JSX.Element {
  const { user, logout } = useAuth();

  return (
    <header className="admin-topbar">
      <div>
        <span className="admin-topbar__eyebrow">WordPress-like workspace</span>
        <h1>Панель управления</h1>
      </div>
      <div className="admin-topbar__actions">
        {user ? <span className="admin-topbar__user">{user.name} · {user.role}</span> : null}
        <NavLink to="/editor/new/post">+ Запись</NavLink>
        <NavLink to="/editor/new/page">+ Страница</NavLink>
        <a href="/" target="_blank" rel="noreferrer">Открыть сайт</a>
        <button type="button" onClick={logout}>Выйти</button>
      </div>
    </header>
  );
}
