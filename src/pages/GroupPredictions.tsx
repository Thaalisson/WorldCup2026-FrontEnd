import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../services/api';
import type { Team } from '../types';
import { CheckCircle, Lock } from 'lucide-react';

type Props = { poolId?: string };

// Locked at tournament start
const LOCK_DATE = new Date('2026-06-11T12:00:00Z');

type GroupPick = { firstPlaceTeamId: string; secondPlaceTeamId: string };
type SavedPick = {
  id: string; groupName: string;
  firstPlaceTeamId: string; firstPlaceTeamName: string; firstPlaceIsoCode?: string;
  secondPlaceTeamId: string; secondPlaceTeamName: string; secondPlaceIsoCode?: string;
  pointsEarned: number;
};

export function GroupPredictions({ poolId }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [saved, setSaved] = useState<Record<string, SavedPick>>({});
  const [picks, setPicks] = useState<Record<string, GroupPick>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savedOk, setSavedOk] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const isLocked = new Date() >= LOCK_DATE;

  const groups = Array.from(new Set(teams.map(t => t.groupName).filter(Boolean))).sort() as string[];
  const teamsByGroup: Record<string, Team[]> = {};
  teams.forEach(t => {
    if (t.groupName) (teamsByGroup[t.groupName] ??= []).push(t);
  });

  useEffect(() => {
    const loadTeams = apiGet<Team[]>('/teams').then(setTeams);
    const loadSaved = poolId
      ? apiGet<SavedPick[]>(`/group-predictions?poolId=${poolId}`)
          .then(data => {
            const map: Record<string, SavedPick> = {};
            data.forEach(d => { map[d.groupName] = d; });
            setSaved(map);
          }).catch(() => {})
      : Promise.resolve();

    Promise.all([loadTeams, loadSaved])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [poolId]);

  function getPick(group: string): GroupPick {
    return picks[group] ?? {
      firstPlaceTeamId: saved[group]?.firstPlaceTeamId ?? '',
      secondPlaceTeamId: saved[group]?.secondPlaceTeamId ?? '',
    };
  }

  async function handleSave(group: string) {
    if (!poolId || isLocked) return;
    const pick = getPick(group);
    if (!pick.firstPlaceTeamId || !pick.secondPlaceTeamId) return;
    if (pick.firstPlaceTeamId === pick.secondPlaceTeamId) return;

    setSaving(p => ({ ...p, [group]: true }));
    try {
      await apiPost('/group-predictions', {
        poolId,
        groupName: group,
        firstPlaceTeamId: pick.firstPlaceTeamId,
        secondPlaceTeamId: pick.secondPlaceTeamId,
      });
      setSavedOk(p => ({ ...p, [group]: true }));
      setTimeout(() => setSavedOk(p => ({ ...p, [group]: false })), 2000);
    } catch {
      // silent
    } finally {
      setSaving(p => ({ ...p, [group]: false }));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#111827' }}>CLASSIFICADOS </span>
          <span style={{ color: '#F97316' }}>POR GRUPO</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280' }}>
          Escolha os 2 classificados de cada grupo. Vale {3} ponto{3 !== 1 ? 's' : ''} por acerto.
        </p>
      </div>

      {isLocked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, background: '#EF444418', border: '1px solid #EF444440', color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
          <Lock size={15} /> Palpites bloqueados — torneio já iniciado.
        </div>
      )}

      {!poolId ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
          <p style={{ fontSize: 14 }}>Selecione um bolão para fazer seus palpites de grupos.</p>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280', fontSize: 14 }}>
          <div className="spinner" style={{ width: 18, height: 18 }} /> Carregando grupos...
        </div>
      ) : (
        <div className="group-predictions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
          {groups.map(group => {
            const groupTeams = teamsByGroup[group] ?? [];
            const pick = getPick(group);
            const ok = savedOk[group];
            const busy = saving[group];
            const pts = saved[group]?.pointsEarned ?? 0;

            return (
              <div key={group} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                    Grupo {group}
                  </p>
                  {pts > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#22C55E', background: '#22C55E18', padding: '2px 8px', borderRadius: 20 }}>
                      +{pts} pts
                    </span>
                  )}
                </div>

                {/* Team list for reference */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {groupTeams.map(t => (
                    <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B7280', background: '#E5E7EB', padding: '3px 8px', borderRadius: 6 }}>
                      {t.isoCode && <img src={`https://flagcdn.com/16x12/${t.isoCode.toLowerCase()}.png`} alt="" style={{ width: 16, height: 12, borderRadius: 1 }} />}
                      {t.code}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>1º Lugar</label>
                    <select
                      value={pick.firstPlaceTeamId}
                      disabled={isLocked}
                      onChange={e => setPicks(p => ({ ...p, [group]: { ...getPick(group), firstPlaceTeamId: e.target.value } }))}
                      style={selectStyle(isLocked)}
                    >
                      <option value="">Escolher time...</option>
                      {groupTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>2º Lugar</label>
                    <select
                      value={pick.secondPlaceTeamId}
                      disabled={isLocked}
                      onChange={e => setPicks(p => ({ ...p, [group]: { ...getPick(group), secondPlaceTeamId: e.target.value } }))}
                      style={selectStyle(isLocked)}
                    >
                      <option value="">Escolher time...</option>
                      {groupTeams.filter(t => t.id !== pick.firstPlaceTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  {!isLocked && (
                    <button
                      onClick={() => handleSave(group)}
                      disabled={busy || !pick.firstPlaceTeamId || !pick.secondPlaceTeamId}
                      style={{
                        width: '100%', padding: '9px',
                        background: ok ? '#22C55E' : '#F97316',
                        border: 'none', borderRadius: 8,
                        color: '#F9FAFB', fontSize: 11, fontWeight: 800,
                        letterSpacing: '0.08em', cursor: 'pointer',
                        opacity: busy || !pick.firstPlaceTeamId || !pick.secondPlaceTeamId ? 0.5 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'background 0.2s',
                      }}
                    >
                      {ok ? <><CheckCircle size={13} /> SALVO!</> : busy ? 'SALVANDO...' : 'SALVAR PALPITE'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function selectStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '8px 10px',
    background: '#F3F4F6', border: '1px solid #E5E7EB',
    borderRadius: 8, color: disabled ? '#9CA3AF' : '#111827',
    fontSize: 13, outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
