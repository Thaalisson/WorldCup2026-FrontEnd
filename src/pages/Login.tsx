import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiPost, setStoredToken } from '../services/api';

type Props = { onGoToRegister: () => void };

export function Login({ onGoToRegister }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiPost<{ userId: string; name: string; email: string; isAdmin: boolean; token: string }>(
        '/auth/login', { email, password }
      );
      setStoredToken(data.token);
      login({ id: data.userId, name: data.name, email: data.email, isAdmin: data.isAdmin ?? false });
    } catch {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9FAFB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -120, left: -120, width: 400, height: 400, background: 'radial-gradient(circle, #F9731622 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -120, right: -120, width: 400, height: 400, background: 'radial-gradient(circle, #F9731614 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 20,
          padding: 'clamp(24px, 6vw, 40px) clamp(20px, 5vw, 36px)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
            margin: '0 auto 20px',
            transform: 'rotate(45deg)',
            boxShadow: '0 0 40px #F9731640',
          }}>
            <span style={{ transform: 'rotate(-45deg)' }}>⚽</span>
          </div>

          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#111827', fontStyle: 'italic' }}>BOLÃO </span>
            <span style={{ color: '#F97316', fontStyle: 'italic' }}>2026</span>
          </h1>
          <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 28px', lineHeight: 1.5 }}>
            Sua jornada épica rumo ao<br />campeonato mundial começa aqui.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="input-field"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="input-field"
            />
            {error && (
              <p style={{ color: '#EF4444', fontSize: 13, margin: 0, textAlign: 'center' }}>
                ⚠ {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
              {loading ? 'ENTRANDO...' : 'ENTRAR NO BOLÃO'}
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 13, color: '#6B7280' }}>
            Não tem conta?{' '}
            <button
              onClick={onGoToRegister}
              style={{ background: 'none', border: 'none', color: '#F97316', cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: 13 }}
            >
              Criar conta
            </button>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#E5E7EB', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          FIFA World Cup 2026 · Jun 11 – Jul 19
        </p>
      </div>
    </div>
  );
}
