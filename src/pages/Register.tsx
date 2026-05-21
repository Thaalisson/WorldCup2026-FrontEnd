import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../services/api';

type Props = { onGoToLogin: () => void };

export function Register({ onGoToLogin }: Props) {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    try {
      const data = await apiPost<{ userId: string; name: string; email: string; isAdmin: boolean }>(
        '/auth/register', { name, email, password }
      );
      login({ id: data.userId, name: data.name, email: data.email, isAdmin: data.isAdmin ?? false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg.includes('409') ? 'E-mail já cadastrado.' : 'Erro ao criar conta. Tente novamente.');
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
          <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 28px' }}>
            Crie sua conta e entre na disputa.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            <input type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required className="input-field" />
            <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="input-field" />
            <input type="password" placeholder="Senha (mínimo 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} required className="input-field" />
            {error && <p style={{ color: '#EF4444', fontSize: 13, margin: 0, textAlign: 'center' }}>⚠ {error}</p>}
            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
              {loading ? 'CRIANDO CONTA...' : 'CRIAR CONTA'}
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 13, color: '#6B7280' }}>
            Já tem conta?{' '}
            <button onClick={onGoToLogin} style={{ background: 'none', border: 'none', color: '#F97316', cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: 13 }}>
              Entrar
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
