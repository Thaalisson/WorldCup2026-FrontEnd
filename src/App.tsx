import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Predictions } from './pages/Predictions';
import { ChampionPick } from './pages/ChampionPick';
import { Groups } from './pages/Groups';
import { GroupPredictions } from './pages/GroupPredictions';
import { Ranking } from './pages/Ranking';
import { Stats } from './pages/Stats';
import { Teams } from './pages/Teams';
import { Knockout } from './pages/Knockout';
import { AdminPanel } from './pages/AdminPanel';
import { PoolSettings } from './pages/PoolSettings';
import { apiGet, apiPost } from './services/api';
import type { Pool } from './types';
import { Plus, Hash, X, ChevronDown, Menu, Shield, Copy, Check, Share2, Users } from 'lucide-react';

type Page = 'dashboard' | 'jogos' | 'precopa' | 'grupos' | 'grouppreds' | 'knockout' | 'boloes' | 'ranking' | 'stats' | 'selecoes' | 'admin' | 'settings';

const NAV: { id: Page; label: string; adminOnly?: boolean }[] = [
  { id: 'dashboard',  label: 'DASHBOARD' },
  { id: 'jogos',      label: 'JOGOS' },
  { id: 'precopa',    label: 'PRÉ-COPA' },
  { id: 'grouppreds', label: 'GRUPOS' },
  { id: 'boloes',     label: 'MEUS BOLÕES' },
  { id: 'ranking',    label: 'RANKING' },
  { id: 'stats',      label: 'STATS' },
  { id: 'selecoes',   label: 'SELEÇÕES' },
];

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 32, height: 32,
        background: 'linear-gradient(135deg, #F97316, #EA580C)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: 'rotate(45deg)',
        boxShadow: '0 0 16px #F9731640',
        flexShrink: 0,
      }}>
        <span style={{ transform: 'rotate(-45deg)', fontSize: 14 }}>⚽</span>
      </div>
      <span style={{ fontWeight: 900, fontSize: 16, fontStyle: 'italic', letterSpacing: '-0.3px' }}>
        <span style={{ color: '#111827' }}>BOLÃO </span>
        <span style={{ color: '#F97316' }}>2026</span>
      </span>
    </div>
  );
}

function MainApp() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [pools, setPools] = useState<Pool[]>([]);
  const [activePoolId, setActivePoolId] = useState<string>('');
  const [showCreatePool, setShowCreatePool] = useState(false);
  const [showJoinPool, setShowJoinPool] = useState(false);
  const [poolName, setPoolName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [poolMsg, setPoolMsg] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [createdPool, setCreatedPool] = useState<Pool | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiGet<Pool[]>('/pools')
      .then(data => {
        setPools(data);
        if (data.length > 0 && !activePoolId) setActivePoolId(data[0].id);
      })
      .catch(() => {});
  }, []);

  async function handleCreatePool(e: React.FormEvent) {
    e.preventDefault();
    try {
      const pool = await apiPost<Pool>('/pools', { name: poolName, isPrivate: true });
      setPools(prev => [...prev, pool]);
      setActivePoolId(pool.id);
      setPoolName('');
      setShowCreatePool(false);
      setPoolMsg('');
      setCreatedPool(pool);
    } catch {
      setPoolMsg('Erro ao criar bolão.');
    }
  }

  async function handleJoinPool(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await apiPost<{ id: string; name: string; inviteCode: string }>('/pools/join', { inviteCode });
      const updated = await apiGet<Pool[]>('/pools');
      setPools(updated);
      setActivePoolId(result.id);
      setInviteCode('');
      setShowJoinPool(false);
      setPoolMsg('');
    } catch {
      setPoolMsg('Código inválido ou você já participa desse bolão.');
    }
  }

  const activePool = pools.find(p => p.id === activePoolId);
  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Logo />

        {/* Desktop nav */}
        <nav className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 32, flex: 1, overflowX: 'auto' }}>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`nav-link${page === item.id ? ' active' : ''}`}
            >
              {item.label}
            </button>
          ))}
          {user?.isAdmin && (
            <button onClick={() => setPage('admin')} className={`nav-link${page === 'admin' ? ' active' : ''}`} style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Shield size={11} /> ADMIN
            </button>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="nav-mobile"
          style={{ display: 'none', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 8, marginLeft: 'auto' }}
          onClick={() => setMobileNavOpen(v => !v)}
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Pool selector */}
          {pools.length > 0 && (
            <div style={{ position: 'relative' }}>
              <select
                value={activePoolId}
                onChange={e => setActivePoolId(e.target.value)}
                style={{
                  background: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  color: '#6B7280',
                  borderRadius: 8,
                  padding: '6px 32px 6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: '#6B7280', pointerEvents: 'none' }} />
            </div>
          )}

          <button
            onClick={() => { setShowCreatePool(v => !v); setShowJoinPool(false); setPoolMsg(''); }}
            style={{ background: 'none', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#F97316'; (e.currentTarget as HTMLButtonElement).style.color = '#F97316'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
          >
            <Plus style={{ width: 12, height: 12 }} /> Criar
          </button>
          <button
            onClick={() => { setShowJoinPool(v => !v); setShowCreatePool(false); setPoolMsg(''); }}
            style={{ background: 'none', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#6B7280'; (e.currentTarget as HTMLButtonElement).style.color = '#111827'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
          >
            <Hash style={{ width: 12, height: 12 }} /> Entrar
          </button>

          {/* User avatar */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{
                width: 34, height: 34,
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                borderRadius: '50%',
                border: '2px solid #E5E7EB',
                color: '#F9FAFB',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {initial}
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 42,
                background: '#FFFFFF', border: '1px solid #E5E7EB',
                borderRadius: 10, padding: '4px', minWidth: 180,
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                zIndex: 50,
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #E5E7EB' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{user?.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{user?.email}</p>
                </div>
                {activePool && (
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #E5E7EB' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Código do bolão</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#F97316', letterSpacing: '0.18em', fontWeight: 700 }}>{activePool.inviteCode}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activePool.inviteCode);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#22C55E' : '#9CA3AF', padding: 2, display: 'flex', alignItems: 'center' }}
                        title="Copiar código"
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                )}
                {activePoolId && (
                  <button onClick={() => { setMenuOpen(false); setPage('settings'); }} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer', textAlign: 'left', borderRadius: 6 }}>
                    Configurar Pontuação
                  </button>
                )}
                {user?.isAdmin && (
                  <button onClick={() => { setMenuOpen(false); setPage('admin'); }} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#EF4444', fontSize: 13, cursor: 'pointer', textAlign: 'left', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={13} /> Painel Admin
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#EF4444', fontSize: 13, cursor: 'pointer', textAlign: 'left', borderRadius: 6 }}
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile nav dropdown */}
      {mobileNavOpen && (
        <div className="nav-mobile" style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '8px 0' }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => { setPage(item.id); setMobileNavOpen(false); }}
              style={{ padding: '12px 24px', background: 'none', border: 'none', textAlign: 'left', color: page === item.id ? '#F97316' : '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' }}>
              {item.label}
            </button>
          ))}
          {user?.isAdmin && (
            <button onClick={() => { setPage('admin'); setMobileNavOpen(false); }}
              style={{ padding: '12px 24px', background: 'none', border: 'none', textAlign: 'left', color: '#EF4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={13} /> ADMIN
            </button>
          )}
        </div>
      )}

      {/* Pool forms */}
      {(showCreatePool || showJoinPool) && (
        <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '10px 24px' }}>
          {showCreatePool && (
            <form onSubmit={handleCreatePool} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input placeholder="Nome do bolão" value={poolName} onChange={e => setPoolName(e.target.value)} required className="input-field" style={{ maxWidth: 260, padding: '8px 12px', fontSize: 13 }} />
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 20px', fontSize: 13 }}>Criar</button>
              <button type="button" onClick={() => setShowCreatePool(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 4 }}><X style={{ width: 16, height: 16 }} /></button>
              {poolMsg && <span style={{ color: '#EF4444', fontSize: 13 }}>{poolMsg}</span>}
            </form>
          )}
          {showJoinPool && (
            <form onSubmit={handleJoinPool} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input placeholder="Código de convite (ex: A3F7B2C1)" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} required className="input-field" style={{ maxWidth: 280, padding: '8px 12px', fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.15em' }} />
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 20px', fontSize: 13 }}>Entrar</button>
              <button type="button" onClick={() => setShowJoinPool(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 4 }}><X style={{ width: 16, height: 16 }} /></button>
              {poolMsg && <span style={{ color: '#EF4444', fontSize: 13 }}>{poolMsg}</span>}
            </form>
          )}
        </div>
      )}

      {/* Pool created modal */}
      {createdPool && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
          onClick={() => setCreatedPool(null)}
        >
          <div
            className="card"
            style={{ padding: 32, maxWidth: 420, width: '100%', textAlign: 'center', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setCreatedPool(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}
            >
              <X size={18} />
            </button>

            {/* Trophy icon */}
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #F97316, #EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px', boxShadow: '0 4px 16px #F9731650' }}>
              🏆
            </div>

            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: '#111827' }}>
              Bolão criado!
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6B7280' }}>
              Compartilhe o código abaixo para seus amigos entrarem no <strong>{createdPool.name}</strong>
            </p>

            {/* Invite code display */}
            <div style={{
              background: '#F3F4F6', borderRadius: 12, padding: '16px 20px',
              border: '2px dashed #E5E7EB', marginBottom: 16,
            }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#9CA3AF', textTransform: 'uppercase' }}>Código de convite</p>
              <p style={{ margin: 0, fontSize: 28, fontFamily: 'monospace', fontWeight: 900, color: '#F97316', letterSpacing: '0.25em' }}>
                {createdPool.inviteCode}
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdPool.inviteCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 20px', borderRadius: 10,
                  background: copied ? '#22C55E' : '#F3F4F6',
                  border: '1px solid ' + (copied ? '#22C55E' : '#E5E7EB'),
                  color: copied ? '#fff' : '#374151',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Código copiado!' : 'Copiar código'}
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Entra no meu bolão da Copa 2026! 🏆⚽\nNome: ${createdPool.name}\nCódigo: ${createdPool.inviteCode}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 20px', borderRadius: 10,
                  background: '#25D366', color: '#fff',
                  fontWeight: 700, fontSize: 13, textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1DAA57')}
                onMouseLeave={e => (e.currentTarget.style.background = '#25D366')}
              >
                <Share2 size={15} />
                Compartilhar no WhatsApp
              </a>

              <button
                onClick={() => { setCreatedPool(null); setPage('jogos'); }}
                className="btn-primary"
                style={{ marginTop: 4 }}
              >
                Começar a palpitar →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <main style={{ flex: 1, padding: '28px 24px', maxWidth: 1280, width: '100%', margin: '0 auto' }}>
        {page === 'dashboard' && <Dashboard
          poolId={activePoolId || undefined}
          onGoToJogos={() => setPage('jogos')}
          onGoToPrecopa={() => setPage('precopa')}
          onGoToGroups={() => setPage('grouppreds')}
          onGoToBoloes={() => setPage('boloes')}
        />}
        {page === 'jogos' && activePoolId && <Predictions poolId={activePoolId} />}
        {page === 'jogos' && !activePoolId && <EmptyState icon="⚽" text="Selecione ou crie um bolão para fazer palpites." />}
        {page === 'precopa' && activePoolId && <ChampionPick poolId={activePoolId} />}
        {page === 'precopa' && !activePoolId && <EmptyState icon="🏆" text="Selecione ou crie um bolão para fazer palpite de campeão." />}
        {page === 'grupos' && <Groups />}
        {page === 'grouppreds' && <GroupPredictions poolId={activePoolId || undefined} />}
        {page === 'knockout' && <Knockout />}
        {page === 'admin' && user?.isAdmin && <AdminPanel poolId={activePoolId || undefined} />}
        {page === 'admin' && !user?.isAdmin && <EmptyState icon="🔒" text="Acesso restrito a administradores." />}
        {page === 'settings' && activePoolId && <PoolSettings poolId={activePoolId} />}
        {page === 'settings' && !activePoolId && <EmptyState icon="⚙️" text="Selecione um bolão para configurar." />}
        {page === 'boloes' && (
          <div>
            <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 900, fontStyle: 'italic' }}>
              <span style={{ color: '#111827' }}>MEUS </span>
              <span style={{ color: '#F97316' }}>BOLÕES</span>
            </h2>
            {pools.length === 0 ? (
              <WelcomeScreen
                onCreatePool={() => { setShowCreatePool(true); setShowJoinPool(false); }}
                onJoinPool={() => { setShowJoinPool(true); setShowCreatePool(false); }}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {pools.map(p => (
                  <div key={p.id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, color: '#111827', fontSize: 15 }}>{p.name}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
                          <Users size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                          {p.participantCount} participante{p.participantCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => { setActivePoolId(p.id); setPage('jogos'); }}
                        style={{ background: '#FFF7ED', border: '1px solid #FDBA74', color: '#F97316', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Palpitar →
                      </button>
                    </div>
                    <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF' }}>Código de convite</p>
                        <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 15, color: '#F97316', letterSpacing: '0.18em', fontWeight: 800 }}>{p.inviteCode}</p>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(p.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                        title="Copiar código"
                      >
                        {copied ? <Check size={13} color="#22C55E" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {page === 'ranking' && activePoolId && <Ranking poolId={activePoolId} />}
        {page === 'ranking' && !activePoolId && <EmptyState icon="🏅" text="Selecione um bolão para ver o ranking." />}
        {page === 'stats' && <Stats poolId={activePoolId || undefined} />}
        {page === 'selecoes' && <Teams />}
      </main>
    </div>
  );
}

function WelcomeScreen({ onCreatePool, onJoinPool }: { onCreatePool: () => void; onJoinPool: () => void }) {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingTop: 24 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1A4731 0%, #236038 50%, #1C5232 100%)',
        borderRadius: 20, padding: '36px 32px', textAlign: 'center', marginBottom: 24,
        boxShadow: '0 4px 24px rgba(26,71,49,0.2)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚽</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: '#fff', fontStyle: 'italic' }}>
          BEM-VINDO AO BOLÃO 2026!
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
          Crie um bolão com amigos ou entre em um existente usando o código de convite.
        </p>
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button
          onClick={onCreatePool}
          style={{
            background: '#fff', border: '2px solid #E5E7EB', borderRadius: 16,
            padding: '24px 20px', cursor: 'pointer', textAlign: 'center',
            transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = '#F97316'; b.style.boxShadow = '0 4px 16px #F9731620'; }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = '#E5E7EB'; b.style.boxShadow = 'none'; }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={22} color="#F97316" />
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 800, color: '#111827', fontSize: 14 }}>Criar bolão</p>
            <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', lineHeight: 1.4 }}>Convide seus amigos com um código</p>
          </div>
        </button>

        <button
          onClick={onJoinPool}
          style={{
            background: '#fff', border: '2px solid #E5E7EB', borderRadius: 16,
            padding: '24px 20px', cursor: 'pointer', textAlign: 'center',
            transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = '#6B7280'; b.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = '#E5E7EB'; b.style.boxShadow = 'none'; }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Hash size={22} color="#6B7280" />
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 800, color: '#111827', fontSize: 14 }}>Entrar com código</p>
            <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', lineHeight: 1.4 }}>Use o código de um amigo</p>
          </div>
        </button>
      </div>

      {/* How it works */}
      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9CA3AF' }}>Como funciona</p>
        {[
          { step: '1', text: 'Crie um bolão e você receberá um código único' },
          { step: '2', text: 'Compartilhe o código no WhatsApp com seus amigos' },
          { step: '3', text: 'Todos fazem seus palpites antes de cada jogo' },
          { step: '4', text: 'Acompanhe o ranking em tempo real!' },
        ].map(({ step, text }) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: step === '4' ? 0 : 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F97316', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {step}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, color: '#D1D5DB', gap: 12 }}>
      <span style={{ fontSize: 40, opacity: 0.4 }}>{icon}</span>
      <p style={{ fontSize: 14, margin: 0 }}>{text}</p>
    </div>
  );
}

function AuthGate() {
  const { user } = useAuth();
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');
  if (user) return <MainApp />;
  return authPage === 'login'
    ? <Login onGoToRegister={() => setAuthPage('register')} />
    : <Register onGoToLogin={() => setAuthPage('login')} />;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthGate />
      </ToastProvider>
    </AuthProvider>
  );
}
