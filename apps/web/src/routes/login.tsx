import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { isAuthenticated, login, setAccessToken } from '../lib/api';

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: async (data) => {
      setAccessToken(data.accessToken);
      await navigate({ to: '/' });
    },
  });

  return (
    <div className="stack">
      <h1 className="title">Entrar</h1>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label className="stack">
          E-mail
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="stack">
          Senha
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        <button className="btn" type="submit" disabled={mutation.isPending}>
          Entrar
        </button>
      </form>
      {mutation.isError ? (
        <p className="error">{(mutation.error as Error).message}</p>
      ) : null}
      <p className="muted">
        Não tem conta? <Link to="/register">Criar conta</Link>
      </p>
    </div>
  );
}
