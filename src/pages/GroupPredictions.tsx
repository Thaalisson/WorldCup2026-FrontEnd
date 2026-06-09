import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost } from '../services/api';
import type { Team } from '../types';
import { CheckCircle, Lock, Save, AlertCircle } from 'lucide-react';

type Props = { poolId?: string };

const LOCK_DATE = new Date('2026-06-11T12:00:00Z');

type GroupPick = { firstPlaceTeamId: string; secondPlaceTeamId: string };
type SavedPick = {
  id: string; groupName: string;
  firstPlaceTeamId: string; firstPlaceTeamName: string; firstPlaceIsoCode?: string;
  secondPlaceTeamId: string; secondPlaceTeamName: string; secondPlaceIsoCode?: string;
  pointsEarned: number;
};

function FlagChip({ isoCode, code }: { isoCode?: string; code: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '3px 7px', borderRadius: 6 }}>
      {isoCode && (
        <img src={`https://flagcdn.com/16x12/${isoCode.toLowerCase()}.png`} alt="" style={{ width: 16, height: 12, borderRadius: 1 }} />
      )}
      {code}
    </span>
  );
}

export function GroupPredictions({ poolId }: Props) {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [saved, setSaved] = useState<Record<string, SavedPick>>({});
  const [picks, setPicks] = useState<Record<string, GroupPick>>({});
  const [dirtyGroups, setDirtyGroups] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const saveMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLocked = new Date() >= LOCK_DATE;

  const groups = Array.from(new Set(teams.map(t => t.groupName).filter(Boolean))).sort() as string[];
  const teamsByGroup: Record<string, Team[]> = {};
  teams.forEach(t => { if (t.groupName) (teamsByGroup[t.groupName] ??= []).push(t); });

  useEffect(() => {
    const loadTeams = apiGet<Team[]>('/teams').then(setTeams);
    const loadSaved = poolId
      ? apiGet<SavedPick[]>(`/group-predictions?poolId=${poolId}`)
          .then(data => {
            const map: Record<string, SavedPick> = {};
            data.forEach(d => { map[d.groupName] = d; });
            setSaved(map);
          })
          .catch(err => setLoadError(err instanceof Error ? err.message : 'Erro ao carregar'))
      : Promise.resolve();

    Promise.all([loadTeams, loadSaved]).catch(() => {}).finally(() => setLoading(false));
  }, [poolId]);

  function getPick(group: string): GroupPick {
    return picks[group] ?? {
      firstPlaceTeamId: saved[group]?.firstPlaceTeamId ?? '',
      secondPlaceTeamId: saved[group]?.secondPlaceTeamId ?? '',
    };
  }

  function handleChange(group: string, field: 'firstPlaceTeamId' | 'secondPlaceTeamId', value: string) {
    setPicks(p => ({ ...p, [group]: { ...getPick(group), [field]: value } }));
    setDirtyGroups(d => new Set([...d, group]));
  }

  const readyGroups = groups.filter(g => {
    const p = getPick(g);
    return p.firstPlaceTeamId && p.secondPlaceTeamId && p.firstPlaceTeamId !== p.secondPlaceTeamId;
  });
  const dirtyReadyGroups = readyGroups.filter(g => dirtyGroups.has(g));
  const cleanSavedGroups = readyGroups.filter(g => !dirtyGroups.has(g) && saved[g]);

  async function saveAll() {
    if (!poolId || isLocked || saving || dirtyReadyGroups.length === 0) return;
    setSaving(true);
    if (saveMsgTimer.current) clearTimeout(saveMsgTimer.current);

    try {
      await apiPost<{ saved: number }>('/group-predictions/bulk', {
        poolId,
        picks: dirtyReadyGroups.map(g => {
          const p = getPick(g);
          return { groupName: g, firstPlaceTeamId: p.firstPlaceTeamId, secondPlaceTeamId: p.secondPlaceTeamId };
        }),
      });

      // Update saved state locally using the team map
      setSaved(prev => {
        const next = { ...prev };
        dirtyReadyGroups.forEach(g => {
          const p = getPick(g);
          const groupTeams = teamsByGroup[g] ?? [];
          const t1 = groupTeams.find(t => t.id === p.firstPlaceTeamId);
          const t2 = groupTeams.find(t => t.id === p.secondPlaceTeamId);
          next[g] = {
            id: prev[g]?.id ?? '',
            groupName: g,
            firstPlaceTeamId: p.firstPlaceTeamId,
            firstPlaceTeamName: t1?.name ?? '',
            firstPlaceIsoCode: t1?.isoCode,
            secondPlaceTeamId: p.secondPlaceTeamId,
            secondPlaceTeamName: t2?.name ?? '',
            secondPlaceIsoCode: t2?.isoCode,
            pointsEarned: prev[g]?.pointsEarned ?? 0,
          };
        });
        return next;
      });

      setDirtyGroups(d => {
        const next = new Set(d);
        dirtyReadyGroups.forEach(g => next.delete(g));
        return next;
      });

      const n = dirtyReadyGroups.length;
      setSaveMsg({ type: 'success', text: `${n} grupo${n > 1 ? 's' : ''} salvo${n > 1 ? 's' : ''} com sucesso!` });
    } catch (err) {
      setSaveMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao salvar' });
    } finally {
      setSaving(false);
      saveMsgTimer.current = setTimeout(() => setSaveMsg(null), 4000);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#111827' }}>{t('groupPredictions.title')}</span>
            <span style={{ color: '#F97316' }}>{t('groupPredictions.titleHighlight')}</span>
          </h1>
          {!isLocked && !loading && groups.length > 0 && (
            <p style={{ margin: '5px 0 0', fontSize: 12, color: '#6B7280' }}>
              {cleanSavedGroups.length}/{groups.length} {t('groupPredictions.groupsSaved')}
              {dirtyReadyGroups.length > 0 && (
                <span style={{ color: '#F97316', fontWeight: 700 }}>
                  {' '}· {dirtyReadyGroups.length} {t('groupPredictions.pendingChanges')}
                </span>
              )}
            </p>
          )}
        </div>

        {!isLocked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: saveMsg.type === 'success' ? '#22C55E' : '#EF4444' }}>
                {saveMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {saveMsg.text}
              </div>
            )}
            {dirtyReadyGroups.length > 0 && (
              <button
                onClick={saveAll}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '11px 24px',
                  background: saving ? '#E5E7EB' : '#F97316',
                  border: 'none', borderRadius: 9,
                  color: saving ? '#6B7280' : '#fff',
                  fontWeight: 800, fontSize: 12,
                  letterSpacing: '0.1em',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                <Save size={14} />
                {saving
                  ? t('groupPredictions.saving')
                  : t('groupPredictions.saveAll', { count: dirtyReadyGroups.length })}
              </button>
            )}
          </div>
        )}
      </div>

      {isLocked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, background: '#EF444418', border: '1px solid #EF444440', color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
          <Lock size={15} /> {t('groupPredictions.locked')}
        </div>
      )}

      {loadError && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12 }}>
          {loadError}
        </div>
      )}

      {!poolId ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
          <p style={{ fontSize: 14 }}>{t('groupPredictions.noPool')}</p>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280', fontSize: 14 }}>
          <div className="spinner" style={{ width: 18, height: 18 }} /> {t('groupPredictions.loading')}
        </div>
      ) : (
        <div className="group-predictions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
          {groups.map(group => {
            const groupTeams = teamsByGroup[group] ?? [];
            const pick = getPick(group);
            const isDirty = dirtyGroups.has(group);
            const isSaved = !!saved[group] && !isDirty;
            const hasSelections = !!(pick.firstPlaceTeamId && pick.secondPlaceTeamId);
            const pts = saved[group]?.pointsEarned ?? 0;

            const borderColor = isSaved
              ? '#22C55E30'
              : isDirty
              ? '#F9731640'
              : '#E5E7EB';

            return (
              <div key={group} className="card" style={{ padding: 20, borderColor, transition: 'border-color 0.2s' }}>

                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                    {t('common.group')} {group}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {pts > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#22C55E', background: '#22C55E18', padding: '2px 8px', borderRadius: 20 }}>
                        +{pts} pts
                      </span>
                    )}
                    {isSaved && !isDirty && (
                      <CheckCircle size={14} color="#22C55E" />
                    )}
                    {isDirty && hasSelections && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316', display: 'inline-block' }} />
                    )}
                  </div>
                </div>

                {/* Team chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                  {groupTeams.map(t => (
                    <FlagChip key={t.id} isoCode={t.isoCode} code={t.code} />
                  ))}
                </div>

                {/* Selects */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
                      {t('groupPredictions.firstPlace')}
                    </label>
                    <select
                      value={pick.firstPlaceTeamId}
                      disabled={isLocked}
                      onChange={e => handleChange(group, 'firstPlaceTeamId', e.target.value)}
                      style={selectStyle(isLocked, !!pick.firstPlaceTeamId)}
                    >
                      <option value="">{t('groupPredictions.chooseTeam')}</option>
                      {groupTeams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
                      {t('groupPredictions.secondPlace')}
                    </label>
                    <select
                      value={pick.secondPlaceTeamId}
                      disabled={isLocked}
                      onChange={e => handleChange(group, 'secondPlaceTeamId', e.target.value)}
                      style={selectStyle(isLocked, !!pick.secondPlaceTeamId)}
                    >
                      <option value="">{t('groupPredictions.chooseTeam')}</option>
                      {groupTeams
                        .filter(t => t.id !== pick.firstPlaceTeamId)
                        .map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function selectStyle(disabled: boolean, hasValue: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '9px 10px',
    background: '#F9FAFB',
    border: `1px solid ${hasValue ? '#D1D5DB' : '#E5E7EB'}`,
    borderRadius: 8,
    color: disabled ? '#9CA3AF' : hasValue ? '#111827' : '#9CA3AF',
    fontSize: 13,
    fontWeight: hasValue ? 600 : 400,
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color 0.15s',
    appearance: 'auto',
  };
}
