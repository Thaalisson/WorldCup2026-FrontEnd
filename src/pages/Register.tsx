import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { apiPost, setStoredToken } from '../services/api';
import { setLanguage, getLanguage } from '../i18n';

type Props = { onGoToLogin: () => void };

export function Register({ onGoToLogin }: Props) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [lang, setLang] = useState<'pt' | 'en'>(getLanguage);

  function toggleLang() {
    const next = lang === 'pt' ? 'en' : 'pt';
    setLanguage(next);
    setLang(next);
  }
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError(t('auth.passwordTooShort')); return; }
    setLoading(true);
    try {
      const data = await apiPost<{ userId: string; name: string; email: string; isAdmin: boolean; token: string }>(
        '/auth/register', { name, email, password }
      );
      setStoredToken(data.token);
      login({ id: data.userId, name: data.name, email: data.email, isAdmin: data.isAdmin ?? false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg.includes('409') ? t('auth.emailExists') : t('auth.registerError'));
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
      {/* Language toggle — fixed top-right */}
      <button
        onClick={toggleLang}
        title={lang === 'pt' ? 'Switch to English' : 'Mudar para Português'}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 50,
          background: '#FFFFFF', border: '1px solid #E5E7EB',
          borderRadius: 8, padding: '6px 12px',
          fontSize: 12, fontWeight: 800, color: '#374151',
          cursor: 'pointer', letterSpacing: '0.05em',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          transition: 'border-color 0.15s, color 0.15s, box-shadow 0.15s',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
        onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#F97316'; b.style.color = '#F97316'; b.style.boxShadow = '0 2px 8px rgba(249,115,22,0.2)'; }}
        onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#E5E7EB'; b.style.color = '#374151'; b.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}
      >
        <img
          src={`https://flagcdn.com/w20/${lang === 'pt' ? 'ca' : 'br'}.png`}
          width={18} height={13}
          style={{ borderRadius: 2, objectFit: 'cover', display: 'block', flexShrink: 0 }}
          alt=""
        />
        {lang === 'pt' ? 'EN' : 'PT'}
      </button>

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
            {t('auth.registerSubtitle')}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            <input type="text" placeholder={t('auth.namePlaceholder')} value={name} onChange={e => setName(e.target.value)} required className="input-field" />
            <input type="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} required className="input-field" />
            <input type="password" placeholder={t('auth.passwordMinPlaceholder')} value={password} onChange={e => setPassword(e.target.value)} required className="input-field" />
            {error && <p style={{ color: '#EF4444', fontSize: 13, margin: 0, textAlign: 'center' }}>⚠ {error}</p>}
            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
              {loading ? t('auth.registering') : t('auth.registerButton')}
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 13, color: '#6B7280' }}>
            {t('auth.hasAccount')}{' '}
            <button onClick={onGoToLogin} style={{ background: 'none', border: 'none', color: '#F97316', cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: 13 }}>
              {t('auth.login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
