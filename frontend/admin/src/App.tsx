import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ContentEditor } from './ContentEditor';
import { ThemeEditor } from './ThemeEditor';

interface AdminRoute {
  path: string;
  label: string;
  description: string;
  metric?: string;
}

const adminSections: AdminRoute[] = [
  { path: '/admin', label: 'Dashboard', description: 'Обзор сайта, быстрые действия и состояние модулей.', metric: '6 модулей' },
  { path: '/admin/posts', label: 'Записи', description: 'Публикации, черновики, рубрики и теги.', metric: '12 черновиков' },
  { path: '/admin/pages', label: 'Страницы', description: 'Иерархия страниц и запуск блочного редактора.', metric: '5 страниц' },
  { path: '/admin/media', label: 'Медиа', description: 'Файлы, изображения, галереи и метаданные.', metric: '128 файлов' },
  { path: '/admin/themes', label: 'Темы', description: 'Активная тема, макеты и визуальные настройки.', metric: 'default' },
  { path: '/admin/users', label: 'Пользователи', description: 'Учетные записи, роли и права доступа.', metric: '4 роли' },
  { path: '/admin/plugins', label: 'Плагины', description: 'Расширения, хуки и дополнительные типы контента.', metric: 'API-ready' },
  { path: '/admin/content-types', label: 'Типы контента', description: 'Декларативные схемы page, post и будущих коллекций.', metric: '2 схемы' },
];

const quickActions = [
  { label: 'Новая запись', href: '/admin/posts' },
  { label: 'Новая страница', href: '/admin/pages' },
  { label: 'Редактор темы', href: '/admin/themes/editor' },
];

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="posts" element={<ContentEditor />} />
        <Route path="pages" element={<ContentEditor />} />
        <Route path="media" element={<SectionPage section="Медиа" />} />
        <Route path="themes" element={<SectionPage section="Темы" />} />
        <Route path="themes/editor" element={<ThemeEditor />} />
        <Route path="users" element={<SectionPage section="Пользователи" />} />
        <Route path="plugins" element={<SectionPage section="Плагины" />} />
        <Route path="content-types" element={<SectionPage section="Типы контента" />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

function AdminLayout(): JSX.Element {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Главное меню админки">
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__logo">V</span>
          <div>
            <strong>VCMS</strong>
            <small>Admin</small>
          </div>
        </div>
        <nav className="admin-sidebar__nav">
          {adminSections.map((section) => (
            <NavLink key={section.path} to={section.path} end={section.path === '/admin'}>
              {section.label}
            </NavLink>
          ))}
          <NavLink to="/admin/themes/editor">Редактор темы</NavLink>
        </nav>
      </aside>

      <div className="admin-shell__body">
        <header className="admin-topbar">
          <div>
            <span className="admin-topbar__eyebrow">WordPress-like workspace</span>
            <h1>Панель управления</h1>
          </div>
          <div className="admin-topbar__actions">
            <a href="/" target="_blank" rel="noreferrer">Открыть сайт</a>
            <NavLink to="/admin/login">Выйти</NavLink>
          </div>
        </header>
        <main className="admin-workspace">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Dashboard(): JSX.Element {
  return (
    <section className="dashboard">
      <div className="dashboard__hero">
        <p className="dashboard__eyebrow">Dashboard</p>
        <h2>Добро пожаловать в VCMS</h2>
        <p>Управляйте контентом, медиа, темами, пользователями и расширениями из единого интерфейса.</p>
        <div className="dashboard__actions">
          {quickActions.map((action) => (
            <NavLink key={action.href} to={action.href}>{action.label}</NavLink>
          ))}
        </div>
      </div>
      <div className="dashboard__grid">
        {adminSections.filter((section) => section.path !== '/admin').map((section) => (
          <article key={section.path} className="dashboard-card">
            <span>{section.metric}</span>
            <h3>{section.label}</h3>
            <p>{section.description}</p>
            <NavLink to={section.path}>Открыть</NavLink>
          </article>
        ))}
      </div>
    </section>
  );
}

function SectionPage({ section }: { section: string }): JSX.Element {
  const current = adminSections.find((item) => item.label === section);

  return (
    <section className="section-page">
      <p className="dashboard__eyebrow">Раздел админки</p>
      <h2>{section}</h2>
      <p>{current?.description ?? 'Минимальная заготовка раздела для будущего подключения к API.'}</p>
      <div className="section-page__panel">
        <strong>Следующий шаг</strong>
        <span>Подключить REST/GraphQL endpoints ядра и заменить mock-метрики реальными данными.</span>
      </div>
    </section>
  );
}

function LoginPage(): JSX.Element {
  return (
    <main className="login-page">
      <form className="login-card">
        <span className="admin-sidebar__logo">V</span>
        <h1>Вход в VCMS</h1>
        <label>
          Email
          <input type="email" placeholder="admin@example.test" />
        </label>
        <label>
          Password
          <input type="password" placeholder="••••••••" />
        </label>
        <NavLink className="login-card__submit" to="/admin">Войти</NavLink>
      </form>
    </main>
  );
}
