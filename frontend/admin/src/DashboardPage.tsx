import { NavLink } from 'react-router-dom';
import { adminNavItems } from './AdminLayout';

const dashboardCards = [
  { title: 'Контент', metric: 'posts · pages', text: 'Быстро переходите к спискам записей и страниц или создавайте новый материал.', to: '/admin/posts' },
  { title: 'Медиа', metric: '/api/media', text: 'Проверьте последние загрузки и добавьте изображения для блочного редактора.', to: '/admin/media' },
  { title: 'Внешний вид', metric: 'themes', text: 'Управляйте темами и открывайте визуальный редактор активного шаблона.', to: '/admin/themes' },
  { title: 'Расширения', metric: 'plugins', text: 'Смотрите подключенные плагины, hooks, блоки и схемы, которые они добавляют.', to: '/admin/plugins' },
];

export function DashboardPage(): JSX.Element {
  return (
    <section className="dashboard">
      <div className="dashboard__hero">
        <p className="dashboard__eyebrow">Dashboard</p>
        <h2>Добро пожаловать в VCMS</h2>
        <p>Админка объединяет контент, медиатеку, темы, плагины, пользователей и схемы типов в интерфейсе, визуально близком к WordPress.</p>
        <div className="dashboard__actions">
          <NavLink to="/editor/new/post">Создать запись</NavLink>
          <NavLink to="/editor/new/page">Создать страницу</NavLink>
          <NavLink to="/admin/media">Открыть медиатеку</NavLink>
          <NavLink to="/admin/themes/editor">Редактор темы</NavLink>
        </div>
      </div>

      <div className="dashboard__grid dashboard__grid--primary">
        {dashboardCards.map((card) => (
          <article key={card.title} className="dashboard-card">
            <span>{card.metric}</span>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <NavLink to={card.to}>Открыть</NavLink>
          </article>
        ))}
      </div>

      <section className="wp-panel">
        <div className="wp-panel__header">
          <div>
            <p className="dashboard__eyebrow">Разделы админки</p>
            <h2>Навигация как в WordPress</h2>
          </div>
        </div>
        <div className="dashboard__grid">
          {adminNavItems.filter((item) => item.path !== '/admin').map((item) => (
            <article key={item.path} className="dashboard-card dashboard-card--compact">
              <span>{item.icon}</span>
              <h3>{item.label}</h3>
              <p>{item.description}</p>
              <NavLink to={item.path}>Перейти</NavLink>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
