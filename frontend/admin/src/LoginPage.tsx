import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function LoginPage(): JSX.Element {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname ?? '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Не удалось войти в админку.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <span className="admin-sidebar__logo">V</span>
        <div>
          <p className="login-card__eyebrow">Secure admin area</p>
          <h1>Вход в VCMS</h1>
        </div>
        <label>
          Email
          <input
            autoComplete="username"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.test"
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="login-card__error" role="alert">{error}</p> : null}
        <button className="login-card__submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </main>
  );
}
