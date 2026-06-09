import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage, getLanguage } from './i18n';
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
import { Performance } from './pages/Performance';
import { apiGet, apiPost, apiDelete } from './services/api';
import type { Pool, Match } from './types';
import { useToast } from './context/ToastContext';
import { Plus, Hash, X, ChevronDown, Shield, Copy, Check, Share2, Users, Home, Zap, Star, BarChart2, Trophy, Flag, Target, MoreHorizontal, GitMerge, TrendingUp } from 'lucide-react';

type Page = 'dashboard' | 'jogos' | 'precopa' | 'grupos' | 'grouppreds' | 'knockout' | 'boloes' | 'ranking' | 'stats' | 'performance' | 'selecoes' | 'admin' | 'settings';

const MOBILE_TABS = [
  { id: 'dashboard',  icon: <Home size={20} />,         label: 'Início' },
  { id: 'jogos',      icon: <Zap size={20} />,          label: 'Jogos' },
  { id: 'grouppreds', icon: <Target size={20} />,       label: 'Grupos' },
  { id: 'ranking',    icon: <Trophy size={20} />,       label: 'Ranking' },
  { id: 'mais',       icon: <MoreHorizontal size={20} />, label: 'Mais' },
] as const;

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
  const { t } = useTranslation();
  const [page, setPage] = useState<Page>('dashboard');
  const [pools, setPools] = useState<Pool[]>([]);
  const [activePoolId, setActivePoolId] = useState<string>('');
  const [showCreatePool, setShowCreatePool] = useState(false);
  const [showJoinPool, setShowJoinPool] = useState(false);
  const [poolName, setPoolName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [poolMsg, setPoolMsg] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [createdPool, setCreatedPool] = useState<Pool | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const NAV: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',   label: t('nav.dashboard'),   icon: <Home size={11} /> },
    { id: 'jogos',       label: t('nav.games'),        icon: <Zap size={11} /> },
    { id: 'precopa',     label: t('nav.precopa'),      icon: <Star size={11} /> },
    { id: 'grouppreds',  label: t('nav.groups'),       icon: <Target size={11} /> },
    { id: 'knockout',    label: t('nav.knockout'),     icon: <GitMerge size={11} /> },
    { id: 'boloes',      label: t('nav.myPools'),      icon: <Users size={11} /> },
    { id: 'ranking',     label: t('nav.ranking'),      icon: <Trophy size={11} /> },
    { id: 'performance', label: t('nav.performance'),  icon: <TrendingUp size={11} /> },
    { id: 'stats',       label: t('nav.stats'),        icon: <BarChart2 size={11} /> },
    { id: 'selecoes',    label: t('nav.teams'),        icon: <Flag size={11} /> },
  ];

  const MOBILE_TAB_LABELS: Record<string, string> = {
    dashboard: t('mobileTabs.home'),
    jogos: t('mobileTabs.games'),
    grouppreds: t('mobileTabs.groups'),
    ranking: t('mobileTabs.ranking'),
    mais: t('mobileTabs.more'),
  };

  useEffect(() => {
    let initialized = false;
    function checkNewResults() {
      apiGet<Match[]>('/matches').then(freshMatches => {
        const seenKey = 'results_seen_v1';
        const seen = new Set<string>(JSON.parse(localStorage.getItem(seenKey) ?? '[]'));
        const newlyFinished = freshMatches.filter(
          m => m.isFinished && m.homeTeam.name !== 'A Definir' && !seen.has(m.id)
        );
        if (!initialized) {
          initialized = true;
          for (const m of newlyFinished) seen.add(m.id);
          localStorage.setItem(seenKey, JSON.stringify([...seen]));
          return;
        }
        for (const m of newlyFinished) {
          toast(
            `⚽ ${m.homeTeam.name} ${m.homeScore ?? 0}×${m.awayScore ?? 0} ${m.awayTeam.name} — Resultado registrado!`,
            'success'
          );
          seen.add(m.id);
        }
        if (newlyFinished.length > 0) {
          localStorage.setItem(seenKey, JSON.stringify([...seen]));
        }
      }).catch(() => {});
    }
    checkNewResults();
    const interval = setInterval(checkNewResults, 60000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      setPoolMsg(t('app.createPoolError'));
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
      setPoolMsg(t('app.joinPoolError'));
    }
  }

  async function leavePool() {
    if (!activePoolId) return;
    try {
      await apiDelete(`/pools/${activePoolId}/leave`);
      const updated = pools.filter(p => p.id !== activePoolId);
      setPools(updated);
      setActivePoolId(updated[0]?.id ?? '');
      setConfirmLeave(false);
      setMenuOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setPoolMsg(msg.includes('400') ? 'Donos não podem sair do próprio bolão.' : 'Erro ao sair do bolão.');
      setConfirmLeave(false);
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
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {user?.isAdmin && (
            <button onClick={() => setPage('admin')} className={`nav-link${page === 'admin' ? ' active' : ''}`} style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Shield size={11} /> {t('nav.admin')}
            </button>
          )}
        </nav>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Pool selector */}
          {pools.length > 0 && (
            <div style={{ position: 'relative' }}>
              <select
                value={activePoolId}
                onChange={e => setActivePoolId(e.target.value)}
                className="pool-selector"
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
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: '#6B7280', pointerEvents: 'none' }} />
            </div>
          )}

          <button
            className="header-pool-btns"
            onClick={() => { setShowCreatePool(v => !v); setShowJoinPool(false); setPoolMsg(''); }}
            style={{ background: 'none', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#F97316'; (e.currentTarget as HTMLButtonElement).style.color = '#F97316'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
          >
            <Plus style={{ width: 12, height: 12 }} /> {t('nav.create')}
          </button>
          <button
            className="header-pool-btns"
            onClick={() => { setShowJoinPool(v => !v); setShowCreatePool(false); setPoolMsg(''); }}
            style={{ background: 'none', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#6B7280'; (e.currentTarget as HTMLButtonElement).style.color = '#111827'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
          >
            <Hash style={{ width: 12, height: 12 }} /> {t('nav.join')}
          </button>

          {/* Language toggle */}
          <LangToggle />

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
                    <p style={{ margin: 0, fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{t('nav.inviteCodeLabel')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#F97316', letterSpacing: '0.18em', fontWeight: 700 }}>{activePool.inviteCode}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activePool.inviteCode);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#22C55E' : '#9CA3AF', padding: 2, display: 'flex', alignItems: 'center' }}
                        title={t('app.copyCode')}
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                )}
                {activePoolId && (
                  <button onClick={() => { setMenuOpen(false); setPage('settings'); }} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer', textAlign: 'left', borderRadius: 6 }}>
                    {t('nav.configureScoring')}
                  </button>
                )}
                {activePoolId && activePool && activePool.ownerUserId !== user?.id && (
                  confirmLeave ? (
                    <div style={{ padding: '8px 12px', borderTop: '1px solid #FEE2E2', background: '#FFF5F5' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
                        Sair de <strong>{activePool.name}</strong>?
                      </p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setConfirmLeave(false)} style={{ flex: 1, padding: '6px 0', background: '#F3F4F6', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#6B7280' }}>
                          Cancelar
                        </button>
                        <button onClick={leavePool} style={{ flex: 1, padding: '6px 0', background: '#EF4444', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
                          Confirmar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmLeave(true)} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#EF4444', fontSize: 13, cursor: 'pointer', textAlign: 'left', borderRadius: 6, opacity: 0.8 }}>
                      Sair do bolão
                    </button>
                  )
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
                  {t('nav.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile "Mais" bottom sheet */}
      {mobileNavOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 64,
              background: 'rgba(0,0,0,0.35)',
              zIndex: 48,
            }}
            onClick={() => setMobileNavOpen(false)}
          />
          {/* Sheet */}
          <div style={{
            position: 'fixed',
            bottom: 64, left: 0, right: 0,
            background: '#FFFFFF',
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
            padding: '0 0 8px',
            zIndex: 49,
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
              <div style={{ width: 36, height: 4, background: '#E5E7EB', borderRadius: 2 }} />
            </div>
            {[
              { id: 'precopa' as Page,     label: t('nav.precopa'),     icon: <Star size={16} /> },
              { id: 'performance' as Page, label: t('nav.performance'), icon: <TrendingUp size={16} /> },
              { id: 'boloes' as Page,      label: t('nav.myPools'),     icon: <Users size={16} /> },
              { id: 'stats' as Page,       label: t('nav.stats'),       icon: <BarChart2 size={16} /> },
              { id: 'selecoes' as Page,    label: t('nav.teams'),       icon: <Flag size={16} /> },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setMobileNavOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 24px', width: '100%',
                  background: page === item.id ? '#FFF7ED' : 'none',
                  border: 'none', cursor: 'pointer',
                  color: page === item.id ? '#F97316' : '#374151',
                  fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
                }}
              >
                <span style={{ color: page === item.id ? '#F97316' : '#9CA3AF' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
            {user?.isAdmin && (
              <button
                onClick={() => { setPage('admin'); setMobileNavOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 24px', width: '100%', background: 'none', border: 'none', color: '#EF4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' }}
              >
                <Shield size={16} /> {t('nav.admin')}
              </button>
            )}
            <div style={{ height: 1, background: '#F3F4F6', margin: '4px 16px' }} />
            <button
              onClick={() => { setShowCreatePool(v => !v); setShowJoinPool(false); setPoolMsg(''); setMobileNavOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 24px', width: '100%', background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' }}
            >
              <Plus size={16} style={{ color: '#9CA3AF' }} /> {t('mobileTabs.createPool')}
            </button>
            <button
              onClick={() => { setShowJoinPool(v => !v); setShowCreatePool(false); setPoolMsg(''); setMobileNavOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 24px', width: '100%', background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' }}
            >
              <Hash size={16} style={{ color: '#9CA3AF' }} /> {t('mobileTabs.joinPool')}
            </button>
          </div>
        </>
      )}

      {/* Create pool modal */}
      {showCreatePool && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { setShowCreatePool(false); setPoolMsg(''); }}
        >
          <div className="card" style={{ padding: 32, maxWidth: 420, width: '100%', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowCreatePool(false); setPoolMsg(''); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
              <X size={18} />
            </button>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F9731615', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Plus size={22} color="#F97316" />
            </div>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: '#111827' }}>{t('app.createPoolCard')}</h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6B7280' }}>{t('app.createPoolModalDesc')}</p>
            <form onSubmit={handleCreatePool} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em' }}>{t('app.poolFormNameLabel')}</label>
                <input
                  placeholder={t('app.poolFormNamePlaceholder')}
                  value={poolName}
                  onChange={e => setPoolName(e.target.value)}
                  required
                  autoFocus
                  className="input-field"
                />
              </div>
              {poolMsg && <p style={{ margin: 0, fontSize: 13, color: '#EF4444', fontWeight: 600 }}>⚠ {poolMsg}</p>}
              <button type="submit" className="btn-primary" style={{ marginTop: 4 }}>{t('app.createPoolBtn')}</button>
            </form>
          </div>
        </div>
      )}

      {/* Join pool modal */}
      {showJoinPool && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { setShowJoinPool(false); setPoolMsg(''); }}
        >
          <div className="card" style={{ padding: 32, maxWidth: 420, width: '100%', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowJoinPool(false); setPoolMsg(''); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
              <X size={18} />
            </button>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Hash size={22} color="#6B7280" />
            </div>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: '#111827' }}>{t('app.joinPoolCard')}</h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6B7280' }}>{t('app.joinPoolModalDesc')}</p>
            <form onSubmit={handleJoinPool} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em' }}>{t('app.poolFormCodeLabel')}</label>
                <input
                  placeholder={t('app.poolFormCode')}
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  required
                  autoFocus
                  className="input-field"
                  style={{ fontFamily: 'monospace', letterSpacing: '0.2em', fontSize: 18, textAlign: 'center' }}
                />
              </div>
              {poolMsg && <p style={{ margin: 0, fontSize: 13, color: '#EF4444', fontWeight: 600 }}>⚠ {poolMsg}</p>}
              <button type="submit" className="btn-primary" style={{ marginTop: 4 }}>{t('app.joinPoolBtn')}</button>
            </form>
          </div>
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
              {t('app.poolCreatedTitle')}
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6B7280' }}>
              {t('app.poolCreatedDesc')} <strong>{createdPool.name}</strong>
            </p>

            {/* Invite code display */}
            <div style={{
              background: '#F3F4F6', borderRadius: 12, padding: '16px 20px',
              border: '2px dashed #E5E7EB', marginBottom: 16,
            }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#9CA3AF', textTransform: 'uppercase' }}>{t('common.inviteCode')}</p>
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
                {copied ? t('app.codeCopied') : t('app.copyCode')}
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(t('app.whatsappText', { name: createdPool.name, code: createdPool.inviteCode }))}`}
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
                {t('app.shareWhatsapp')}
              </a>

              <button
                onClick={() => { setCreatedPool(null); setPage('jogos'); }}
                className="btn-primary"
                style={{ marginTop: 4 }}
              >
                {t('app.startBetting')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="mobile-tab-bar">
        {MOBILE_TABS.map(tab => {
          const mainTabs: string[] = ['dashboard', 'jogos', 'grouppreds', 'ranking'];
          const isActive = tab.id === 'mais'
            ? !mainTabs.includes(page)
            : page === tab.id;
          return (
            <button
              key={tab.id}
              className={`tab-item${isActive ? ' active' : ''}`}
              onClick={() => {
                if (tab.id === 'mais') { setMobileNavOpen(v => !v); }
                else { setPage(tab.id as Page); setMobileNavOpen(false); }
              }}
            >
              {tab.icon}
              <span>{MOBILE_TAB_LABELS[tab.id] ?? tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Page content */}
      <main style={{ flex: 1, padding: '28px 24px', maxWidth: 1280, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {page === 'dashboard' && <Dashboard
          poolId={activePoolId || undefined}
          onGoToJogos={() => setPage('jogos')}
          onGoToPrecopa={() => setPage('precopa')}
          onGoToGroups={() => setPage('grouppreds')}
          onGoToBoloes={() => setPage('boloes')}
        />}
        {page === 'jogos' && activePoolId && <Predictions poolId={activePoolId} />}
        {page === 'jogos' && !activePoolId && <EmptyState icon="⚽" text={t('app.noPoolForBets')} />}
        {page === 'precopa' && activePoolId && <ChampionPick poolId={activePoolId} />}
        {page === 'precopa' && !activePoolId && <EmptyState icon="🏆" text={t('app.noPoolForChampion')} />}
        {page === 'grupos' && <Groups />}
        {page === 'grouppreds' && <GroupPredictions poolId={activePoolId || undefined} />}
        {page === 'knockout' && <Knockout />}
        {page === 'admin' && user?.isAdmin && <AdminPanel poolId={activePoolId || undefined} />}
        {page === 'admin' && !user?.isAdmin && <EmptyState icon="🔒" text={t('app.adminOnly')} />}
        {page === 'settings' && activePoolId && <PoolSettings poolId={activePoolId} />}
        {page === 'settings' && !activePoolId && <EmptyState icon="⚙️" text={t('app.noPoolForSettings')} />}
        {page === 'boloes' && (
          <div>
            <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 900, fontStyle: 'italic' }}>
              <span style={{ color: '#111827', fontStyle: 'italic' }}>{t('app.myPoolsTitle')} </span>
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
                          {t('app.participantCount', { count: p.participantCount })}
                        </p>
                      </div>
                      <button
                        onClick={() => { setActivePoolId(p.id); setPage('jogos'); }}
                        style={{ background: '#FFF7ED', border: '1px solid #FDBA74', color: '#F97316', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {t('app.bet')}
                      </button>
                    </div>
                    <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF' }}>{t('common.inviteCode')}</p>
                        <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 15, color: '#F97316', letterSpacing: '0.18em', fontWeight: 800 }}>{p.inviteCode}</p>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(p.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                        title={t('app.copyCode')}
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
        {page === 'ranking' && !activePoolId && <EmptyState icon="🏅" text={t('app.noPoolForRanking')} />}
        {page === 'performance' && activePoolId && <Performance poolId={activePoolId} />}
        {page === 'performance' && !activePoolId && <EmptyState icon="📊" text={t('app.noPoolForPerformance')} />}
        {page === 'stats' && <Stats poolId={activePoolId || undefined} />}
        {page === 'selecoes' && <Teams />}
      </main>
    </div>
  );
}

function WelcomeScreen({ onCreatePool, onJoinPool }: { onCreatePool: () => void; onJoinPool: () => void }) {
  const { t } = useTranslation();
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
          {t('app.welcomeTitle')}
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
          {t('app.welcomeDesc')}
        </p>
      </div>

      {/* Options */}
      <div className="welcome-grid">
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
            <p style={{ margin: '0 0 2px', fontWeight: 800, color: '#111827', fontSize: 14 }}>{t('app.createPoolCard')}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', lineHeight: 1.4 }}>{t('app.createPoolCardDesc')}</p>
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
            <p style={{ margin: '0 0 2px', fontWeight: 800, color: '#111827', fontSize: 14 }}>{t('app.joinPoolCard')}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', lineHeight: 1.4 }}>{t('app.joinPoolCardDesc')}</p>
          </div>
        </button>
      </div>

      {/* How it works */}
      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9CA3AF' }}>{t('app.howItWorks')}</p>
        {[
          { step: '1', text: t('app.howStep1') },
          { step: '2', text: t('app.howStep2') },
          { step: '3', text: t('app.howStep3') },
          { step: '4', text: t('app.howStep4') },
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

function LangToggle() {
  const [lang, setLangState] = useState<'pt' | 'en'>(getLanguage);

  function toggle() {
    const next = lang === 'pt' ? 'en' : 'pt';
    setLanguage(next);
    setLangState(next);
  }

  return (
    <button
      onClick={toggle}
      title={lang === 'pt' ? 'Switch to English' : 'Mudar para Português'}
      style={{
        background: 'none',
        border: '1px solid #E5E7EB',
        borderRadius: 7,
        padding: '4px 9px',
        fontSize: 11,
        fontWeight: 800,
        color: '#6B7280',
        cursor: 'pointer',
        letterSpacing: '0.06em',
        transition: 'border-color 0.15s, color 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
      }}
      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#F97316'; b.style.color = '#F97316'; }}
      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#E5E7EB'; b.style.color = '#6B7280'; }}
    >
      <img
        src={`https://flagcdn.com/w20/${lang === 'pt' ? 'ca' : 'br'}.png`}
        width={18} height={13}
        style={{ borderRadius: 2, objectFit: 'cover', display: 'block', flexShrink: 0 }}
        alt=""
      />
      {lang === 'pt' ? 'EN' : 'PT'}
    </button>
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
