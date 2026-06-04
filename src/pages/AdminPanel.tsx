import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost, apiPut } from '../services/api';
import type { Match, Team } from '../types';
import { formatBrazilDate, formatBrazilTime } from '../utils/timezone';
import { CheckCircle, AlertCircle, RefreshCw, Users, BarChart2 } from 'lucide-react';

type Props = { poolId?: string };

type Msg = { type: 'ok' | 'err'; text: string };

export function AdminPanel({ poolId }: Props) {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<Msg | null>(null);

  // Result form state per match
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});

  // TBD team assignment
  const [tbdAssign, setTbdAssign] = useState<Record<string, { homeTeamId: string; awayTeamId: string }>>({});

  useEffect(() => {
    Promise.all([
      apiGet<Match[]>('/matches'),
      apiGet<Team[]>('/teams'),
    ]).then(([m, t]) => {
      setMatches(m);
      setAllTeams(t);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function flash(type: 'ok' | 'err', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleSetResult(match: Match) {
    const s = scores[match.id];
    if (!s) return;
    const home = parseInt(s.home);
    const away = parseInt(s.away);
    if (isNaN(home) || isNaN(away)) return flash('err', t('admin.invalidScore'));
    try {
      await apiPost(`/admin/matches/${match.id}/result`, { homeScore: home, awayScore: away });
      setMatches(prev => prev.map(m =>
        m.id === match.id ? { ...m, homeScore: home, awayScore: away, isFinished: true } : m
      ));
      flash('ok', t('admin.resultSaved', { home: match.homeTeam.code, away: match.awayTeam.code }));
    } catch {
      flash('err', t('admin.resultError'));
    }
  }

  async function handleSetTeams(matchId: string) {
    const s = tbdAssign[matchId] ?? {};
    const body: Record<string, string> = {};
    if (s.homeTeamId) body.homeTeamId = s.homeTeamId;
    if (s.awayTeamId) body.awayTeamId = s.awayTeamId;
    if (!body.homeTeamId && !body.awayTeamId) return flash('err', t('admin.selectTeam'));
    try {
      await apiPut(`/admin/matches/${matchId}/teams`, body);
      const updated = await apiGet<Match[]>('/matches');
      setMatches(updated);
      flash('ok', t('admin.teamsUpdated'));
    } catch {
      flash('err', t('admin.teamsError'));
    }
  }

  async function handleRecalculate() {
    if (!poolId) return flash('err', t('admin.noPool'));
    try {
      await apiPost(`/admin/recalculate/${poolId}`, {});
      flash('ok', t('admin.recalcSuccess'));
    } catch {
      flash('err', t('admin.recalcError'));
    }
  }

  async function handleScoreGroupPredictions() {
    if (!poolId) return flash('err', t('admin.noPool'));
    try {
      await apiPost(`/admin/score-group-predictions/${poolId}`, {});
      flash('ok', t('admin.groupsScoredSuccess'));
    } catch {
      flash('err', t('admin.groupsScoredError'));
    }
  }

  const finishedMatches = matches.filter(m => m.isFinished);
  const upcomingMatches = matches.filter(m => !m.isFinished && m.homeTeam.name !== 'A Definir');
  const tbdMatches = matches.filter(m => !m.isFinished && (m.homeTeam.name === 'A Definir' || m.awayTeam.name === 'A Definir'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#111827' }}>{t('admin.title')} </span>
          <span style={{ color: '#EF4444' }}>{t('admin.titleHighlight')}</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280' }}>{t('admin.subtitle')}</p>
      </div>

      {msg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: msg.type === 'ok' ? '#22C55E18' : '#EF444418', border: `1px solid ${msg.type === 'ok' ? '#22C55E40' : '#EF444440'}`, color: msg.type === 'ok' ? '#22C55E' : '#EF4444', fontSize: 13, fontWeight: 600 }}>
          {msg.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Admin actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <button onClick={handleRecalculate} style={actionBtnStyle('#F97316')}>
          <RefreshCw size={16} /> {t('admin.recalcBtn')}
        </button>
        <button onClick={handleScoreGroupPredictions} style={actionBtnStyle('#A855F7')}>
          <BarChart2 size={16} /> {t('admin.scoreGroupsBtn')}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280', fontSize: 14 }}>
          <div className="spinner" style={{ width: 18, height: 18 }} /> {t('admin.loading')}
        </div>
      ) : (
        <>
          {/* Upcoming matches — set results */}
          {upcomingMatches.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <p className="section-label">{t('admin.registerResult')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingMatches.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #E5E7EB50', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#6B7280', minWidth: 70 }}>
                      {formatBrazilDate(m.kickoffAt)}
                    </span>
                    <span style={{ fontWeight: 700, color: '#111827', fontSize: 13, flex: 1, minWidth: 140 }}>
                      {m.homeTeam.code} × {m.awayTeam.code}
                      {m.groupName && <span style={{ marginLeft: 6, fontSize: 10, color: '#6B7280' }}>{t('admin.groupBadge', { name: m.groupName })}</span>}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number" min={0} max={99} placeholder="0"
                        value={scores[m.id]?.home ?? ''}
                        onChange={e => setScores(p => ({ ...p, [m.id]: { ...p[m.id], home: e.target.value } }))}
                        style={scoreInputStyle}
                      />
                      <span style={{ color: '#6B7280', fontSize: 12 }}>×</span>
                      <input
                        type="number" min={0} max={99} placeholder="0"
                        value={scores[m.id]?.away ?? ''}
                        onChange={e => setScores(p => ({ ...p, [m.id]: { ...p[m.id], away: e.target.value } }))}
                        style={scoreInputStyle}
                      />
                      <button
                        onClick={() => handleSetResult(m)}
                        disabled={!scores[m.id]?.home && scores[m.id]?.home !== '0'}
                        style={{ padding: '6px 14px', background: '#22C55E', border: 'none', borderRadius: 7, color: '#F9FAFB', fontSize: 11, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.06em' }}
                      >
                        {t('admin.saveResult')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TBD knockout matches — assign teams */}
          {tbdMatches.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Users size={14} color="#D97706" />
                <p className="section-label" style={{ margin: 0 }}>{t('admin.advanceTeams')}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tbdMatches.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #E5E7EB50', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#6B7280', minWidth: 70 }}>{formatBrazilDate(m.kickoffAt)}</span>
                    <span style={{ fontSize: 12, color: '#D97706', fontWeight: 700, minWidth: 60 }}>{m.stage}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                      {m.homeTeam.name === 'A Definir' && (
                        <select
                          value={tbdAssign[m.id]?.homeTeamId ?? ''}
                          onChange={e => setTbdAssign(p => ({ ...p, [m.id]: { ...p[m.id], homeTeamId: e.target.value } }))}
                          style={selectStyle}
                        >
                          <option value="">{t('admin.homeOption')}</option>
                          {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                      {m.homeTeam.name !== 'A Definir' && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{m.homeTeam.code}</span>
                      )}
                      <span style={{ color: '#6B7280', fontSize: 12 }}>vs</span>
                      {m.awayTeam.name === 'A Definir' && (
                        <select
                          value={tbdAssign[m.id]?.awayTeamId ?? ''}
                          onChange={e => setTbdAssign(p => ({ ...p, [m.id]: { ...p[m.id], awayTeamId: e.target.value } }))}
                          style={selectStyle}
                        >
                          <option value="">{t('admin.awayOption')}</option>
                          {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                      {m.awayTeam.name !== 'A Definir' && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{m.awayTeam.code}</span>
                      )}
                      <button
                        onClick={() => handleSetTeams(m.id)}
                        style={{ padding: '6px 14px', background: '#D97706', border: 'none', borderRadius: 7, color: '#F9FAFB', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                      >
                        {t('admin.advanceBtn')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Finished matches summary */}
          {finishedMatches.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <p className="section-label">{t('admin.resultsSection', { count: finishedMatches.length })}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {finishedMatches.slice(0, 12).map((m, i) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 11 ? '1px solid #E5E7EB80' : 'none', fontSize: 12 }}>
                    <span style={{ color: '#6B7280', minWidth: 70 }}>{formatBrazilDate(m.kickoffAt)}</span>
                    <span style={{ flex: 1, fontWeight: 600, color: '#111827' }}>
                      {m.homeTeam.code} {m.homeScore} × {m.awayScore} {m.awayTeam.code}
                    </span>
                    <span style={{ fontSize: 9, background: '#22C55E18', color: '#22C55E', padding: '2px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.08em' }}>{t('common.final')}</span>
                  </div>
                ))}
                {finishedMatches.length > 12 && (
                  <p style={{ margin: '8px 0 0', fontSize: 11, color: '#6B7280' }}>{t('admin.moreResults', { count: finishedMatches.length - 12 })}</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const scoreInputStyle: React.CSSProperties = {
  width: 48, padding: '6px', textAlign: 'center',
  background: '#F3F4F6', border: '1px solid #E5E7EB',
  borderRadius: 7, color: '#111827', fontSize: 14, fontWeight: 700,
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  background: '#F3F4F6', border: '1px solid #E5E7EB',
  borderRadius: 7, color: '#111827', fontSize: 12,
  padding: '5px 10px', outline: 'none', cursor: 'pointer',
};

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 20px',
    background: `${color}18`, border: `1px solid ${color}40`,
    borderRadius: 10, color, fontSize: 12, fontWeight: 700,
    letterSpacing: '0.08em', cursor: 'pointer',
    transition: 'background 0.15s',
  };
}
