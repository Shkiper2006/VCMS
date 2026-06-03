import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { ContentDetailPage, ContentListPage } from './ContentAdminPages';
import { ContentEditor } from './ContentEditor';
import { DashboardPage } from './DashboardPage';
import { LoginPage } from './LoginPage';
import { MediaPage } from './MediaPage';
import { CommentsPage, ContentTypesPage, PluginsPage, SettingsPage, ThemesPage, UsersPage } from './SystemPages';
import { ThemeEditor } from './ThemeEditor';
import { useAuth } from './auth';

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/posts" element={<ContentListPage type="post" />} />
        <Route path="/admin/posts/:id" element={<ContentDetailPage type="post" />} />
        <Route path="/admin/pages" element={<ContentListPage type="page" />} />
        <Route path="/admin/pages/:id" element={<ContentDetailPage type="page" />} />
        <Route path="/admin/media" element={<MediaPage />} />
        <Route path="/admin/comments" element={<CommentsPage />} />
        <Route path="/admin/themes" element={<ThemesPage />} />
        <Route path="/admin/themes/editor" element={<ThemeEditor />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/plugins" element={<PluginsPage />} />
        <Route path="/admin/content-types" element={<ContentTypesPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="/editor/new/:type" element={<ContentEditor />} />
        <Route path="/editor/:type/:id" element={<ContentEditor />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <main className="admin-auth-loading">Проверяем сессию…</main>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return children;
}
