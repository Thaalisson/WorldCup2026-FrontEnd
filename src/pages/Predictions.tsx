import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MatchCard } from '../components/MatchCard';
import { apiGet, apiPost } from '../services/api';
import type { Match, Prediction } from '../types';
import { formatBrazilDate, isMatchLocked } from '../utils/timezone';
import { Save, CheckCircle, AlertCircle, Calendar, Zap, Copy } from 'lucide-react';

type Props = { poolId: string; totalPools?: number };
type ScoreEntry = { home: number; away: number };
type DateFilter = 'all' | 'today' | 'week';

function isBrazilToday(isoString: string): boolean {
  const now = new Date();
  const matchDate = new Date(isoString.endsWith('Z') ? isoString : isoString + 'Z');
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
  return fmt(matchDate) === fmt(now);
}

function isBrazilThisWeek(isoString: string): boolean {
  const matchDate = new Date(isoString.endsWith('Z') ? isoString : isoString + 'Z');
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return matchDate >= now && matchDate <= in7;
}

export function Predictions({ poolId, totalPools = 1 }: Props) {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [replicating, setReplicating] = useState(false);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const saveMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Espelho dos scores sempre atualizado — o autosave lê daqui (nunca de um snapshot velho).
  const scoresRef = useRef<Record<string, ScoreEntry>>({});

  useEffect(() => {
    Promise.all([
      apiGet<Match[]>('/matches'),
      apiGet<Prediction[]>(`/predictions/me?poolId=${poolId}`),
    ])
      .then(([matchData, predData]) => {
        setMatches(matchData);
        const initScores: Record<string, ScoreEntry> = {};
        const initSaved = new Set<string>();
        for (const p of predData) {
          initScores[p.matchId] = { home: p.homeScorePrediction, away: p.awayScorePrediction };
          initSaved.add(p.matchId);
        }
        scoresRef.current = initScores;
        setScores(initScores);
        setSavedIds(initSaved);
      })
      .catch(() => setError(t('predictions.loadError')))
      .finally(() => setLoading(false));
  }, [poolId]);

  function handleChange(matchId: string, home: number, away: number) {
    scoresRef.current = { ...scoresRef.current, [matchId]: { home, away } };
    setScores(prev => ({ ...prev, [matchId]: { home, away } }));
    setDirtyIds(prev => new Set([...prev, matchId]));
  }

  function saveSingle(matchId: string) {
    if (debounceTimers.current[matchId]) clearTimeout(debounceTimers.current[matchId]);
    // Lê o valor MAIS RECENTE no momento em que o timer dispara (não um snapshot do blur),
    // garantindo que mandante E visitante sejam salvos juntos mesmo digitando rápido.
    debounceTimers.current[matchId] = setTimeout(async () => {
      delete debounceTimers.current[matchId];
      const sc = scoresRef.current[matchId];
      if (!sc) return;
      try {
        await apiPost<{ saved: number; skipped: number }>('/predictions/bulk', {
          poolId,
          predictions: [{ matchId, homeScorePrediction: sc.home, awayScorePrediction: sc.away }],
        });
        setSavedIds(prev => new Set([...prev, matchId]));
        setDirtyIds(prev => { const n = new Set(prev); n.delete(matchId); return n; });
      } catch {
        // silent — botão salvar como fallback
      }
    }, 700);
  }

  async function saveAll() {
    const saveable = matches.filter(
      m => m.homeTeam.name !== 'A Definir' && !m.isFinished && !isMatchLocked(m.kickoffAt) && dirtyIds.has(m.id)
    );
    if (saveable.length === 0) return;
    setSaving(true);
    if (saveMsgTimer.current) clearTimeout(saveMsgTimer.current);

    try {
      const result = await apiPost<{ saved: number; skipped: number }>('/predictions/bulk', {
        poolId,
        predictions: saveable.map(m => {
          const sc = scores[m.id] ?? { home: 0, away: 0 };
          return { matchId: m.id, homeScorePrediction: sc.home, awayScorePrediction: sc.away };
        }),
      });
      setSavedIds(prev => new Set([...prev, ...saveable.map(m => m.id)]));
      setDirtyIds(new Set());
      if (result.skipped === 0) {
        setSaveMsg({ type: 'success', text: t('predictions.savedSuccess', { count: result.saved }) });
      } else {
        setSaveMsg({ type: 'error', text: t('predictions.savedPartial', { saved: result.saved, skipped: result.skipped }) });
      }
    } catch (err) {
      console.error('Erro ao salvar palpites:', err);
      setSaveMsg({ type: 'error', text: t('predictions.saveError') });
    } finally {
      setSaving(false);
      saveMsgTimer.current = setTimeout(() => setSaveMsg(null), 4000);
    }
  }

  async function handleReplicate() {
    setReplicating(true);
    if (saveMsgTimer.current) clearTimeout(saveMsgTimer.current);
    try {
      const result = await apiPost<{ replicated: number; pools: number }>('/predictions/replicate', { sourcePoolId: poolId });
      if (result.replicated === 0) {
        setSaveMsg({ type: 'error', text: t('predictions.replicateNone') });
      } else {
        setSaveMsg({ type: 'success', text: t('predictions.replicateSuccess', { replicated: result.replicated, pools: result.pools }) });
      }
    } catch {
      setSaveMsg({ type: 'error', text: t('predictions.saveError') });
    } finally {
      setReplicating(false);
      saveMsgTimer.current = setTimeout(() => setSaveMsg(null), 5000);
    }
  }

  const realMatches = matches.filter(m => m.homeTeam.name !== 'A Definir');
  const upcoming = realMatches.filter(m => !m.isFinished && !isMatchLocked(m.kickoffAt));
  const awaitingResult = realMatches.filter(m => !m.isFinished && isMatchLocked(m.kickoffAt));
  const finished = realMatches.filter(m => m.isFinished);

  const groups = Array.from(
    new Set(realMatches.flatMap(m => m.groupName ? [m.groupName] : []))
  ).sort();

  const applyFilters = (list: Match[]) => {
    let result = list;
    if (dateFilter === 'today') result = result.filter(m => isBrazilToday(m.kickoffAt));
    else if (dateFilter === 'week') result = result.filter(m => isBrazilThisWeek(m.kickoffAt));
    if (selectedGroup) result = result.filter(m => m.groupName === selectedGroup);
    return result;
  };

  const upcomingFiltered = applyFilters(upcoming);
  const finishedFiltered = applyFilters(finished);

  const saveableCount = upcoming.length;
  const savedCount = upcoming.filter(m => savedIds.has(m.id) && !dirtyIds.has(m.id)).length;
  const dirtyCount = dirtyIds.size;

  // Agrupar próximos jogos (abertos) por data
  const upcomingByDate: [string, Match[]][] = [];
  const dateMap: Record<string, Match[]> = {};
  upcomingFiltered.forEach(m => {
    const date = formatBrazilDate(m.kickoffAt);
    (dateMap[date] ??= []).push(m);
  });
  upcomingFiltered.forEach(m => {
    const date = formatBrazilDate(m.kickoffAt);
    if (!upcomingByDate.find(([d]) => d === date)) {
      upcomingByDate.push([date, dateMap[date]]);
    }
  });

  const awaitingFiltered = applyFilters(awaitingResult);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 12 }}>
        <div className="spinner" />
        <span style={{ fontSize: 13, color: '#6B7280' }}>{t('common.loadingMatches')}</span>
      </div>
    );
  }

  if (error) return <div className="card" style={{ padding: 20, color: '#EF4444', textAlign: 'center', fontSize: 14 }}>{error}</div>;

  if (upcoming.length === 0 && finished.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 10 }}>
        <span style={{ fontSize: 40 }}>⚽</span>
        <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>{t('predictions.noMatches')}</p>
        <p style={{ margin: 0, fontSize: 12, color: '#D1D5DB' }}>{t('predictions.noMatchesAdmin')}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header + Save bar ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#111827' }}>{t('predictions.title')} </span>
            <span style={{ color: '#F97316' }}>{t('predictions.titleHighlight')}</span>
          </h1>
          {saveableCount > 0 && (
            <p style={{ margin: '5px 0 0', fontSize: 12, color: '#6B7280' }}>
              {t('predictions.savedProgress', { done: savedCount, total: saveableCount })}
              {dirtyCount > 0 && (
                <span style={{ color: '#F97316', fontWeight: 700 }}> · {t('predictions.pendingChanges', { count: dirtyCount })}</span>
              )}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {saveMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: saveMsg.type === 'success' ? '#22C55E' : '#EF4444' }}>
              {saveMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {saveMsg.text}
            </div>
          )}
          {totalPools > 1 && (
            <button
              onClick={handleReplicate}
              disabled={replicating}
              title={t('predictions.replicateAll')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '11px 18px',
                background: replicating ? '#E5E7EB' : '#F3F4F6',
                border: '1.5px solid #E5E7EB', borderRadius: 9,
                color: replicating ? '#9CA3AF' : '#374151',
                fontWeight: 700, fontSize: 11,
                letterSpacing: '0.08em',
                cursor: replicating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!replicating) (e.currentTarget as HTMLButtonElement).style.background = '#E5E7EB'; }}
              onMouseLeave={e => { if (!replicating) (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6'; }}
            >
              <Copy size={13} />
              {replicating ? t('predictions.replicating') : t('predictions.replicateAll')}
            </button>
          )}
          {dirtyCount > 0 && (
            <button
              onClick={saveAll}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 24px',
                background: saving ? '#E5E7EB' : '#F97316',
                border: 'none', borderRadius: 9,
                color: saving ? '#6B7280' : '#F9FAFB',
                fontWeight: 800, fontSize: 12,
                letterSpacing: '0.1em',
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <Save size={14} />
              {saving ? t('predictions.saving') : t('predictions.saveChanges', { count: dirtyCount })}
            </button>
          )}
        </div>
      </div>

      {/* ── Filtros de data + grupo ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Date filter */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {([
            { id: 'all',   label: t('predictions.filterAll'),   icon: null },
            { id: 'today', label: t('predictions.filterToday'), icon: <Zap size={10} /> },
            { id: 'week',  label: t('predictions.filterWeek'),  icon: <Calendar size={10} /> },
          ] as { id: DateFilter; label: string; icon: React.ReactNode }[]).map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                border: dateFilter === f.id ? 'none' : '1px solid #E5E7EB',
                background: dateFilter === f.id ? '#111827' : '#fff',
                color: dateFilter === f.id ? '#fff' : '#6B7280',
                transition: 'all 0.15s',
              }}
            >
              {f.icon}{f.label}
            </button>
          ))}
        </div>

        {/* Group filter */}
        {groups.length > 0 && (
          <div className="chips-scroll">
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 2, flexShrink: 0 }}>{t('predictions.groupLabel')}</span>
            <button
              onClick={() => setSelectedGroup(null)}
              style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: !selectedGroup ? '#F97316' : '#F3F4F6',
                color: !selectedGroup ? '#fff' : '#6B7280',
                transition: 'all 0.15s',
              }}
            >
              {t('predictions.allGroups')}
            </button>
            {groups.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGroup(selectedGroup === g ? null : g)}
                style={{
                  width: 30, height: 26, borderRadius: 7, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: 'none',
                  background: selectedGroup === g ? '#F97316' : '#F3F4F6',
                  color: selectedGroup === g ? '#fff' : '#6B7280',
                  transition: 'all 0.15s',
                }}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Próximos jogos agrupados por data ── */}
      {upcomingByDate.length > 0 && upcomingByDate.map(([date, dateMatches]) => (
        <section key={date}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <p className="section-label" style={{ margin: 0 }}>{date}</p>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>{t('predictions.matchCount', { count: dateMatches.length })}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {dateMatches.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                home={scores[m.id]?.home ?? 0}
                away={scores[m.id]?.away ?? 0}
                isSaved={savedIds.has(m.id)}
                isDirty={dirtyIds.has(m.id)}
                onChange={(h, a) => handleChange(m.id, h, a)}
                onBlur={() => saveSingle(m.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {upcomingFiltered.length === 0 && selectedGroup && upcoming.length > 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: 13 }}>
          {t('predictions.noMatchesForGroup', { group: selectedGroup })}
        </div>
      )}

      {/* ── Aguardando resultado (bloqueados, ainda não finalizados) ── */}
      {awaitingFiltered.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <p className="section-label" style={{ margin: 0, color: '#6B7280' }}>
              {t('predictions.awaitingResult')}
            </p>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>
              {t('predictions.matchCount', { count: awaitingFiltered.length })}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, opacity: 0.75 }}>
            {awaitingFiltered.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                home={scores[m.id]?.home ?? 0}
                away={scores[m.id]?.away ?? 0}
                isSaved={savedIds.has(m.id)}
                isDirty={false}
                onChange={() => {}}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Encerrados ── */}
      {finishedFiltered.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <p className="section-label" style={{ margin: 0 }}>{t('predictions.finished')}</p>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>{t('predictions.matchCount', { count: finishedFiltered.length })}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {finishedFiltered.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                home={scores[m.id]?.home ?? 0}
                away={scores[m.id]?.away ?? 0}
                isSaved={savedIds.has(m.id)}
                isDirty={false}
                onChange={() => {}}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
