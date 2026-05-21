import { useEffect, useRef, useState } from 'react';
import { MatchCard } from '../components/MatchCard';
import { apiGet, apiPost } from '../services/api';
import type { Match, Prediction } from '../types';
import { formatBrazilDate, isMatchLocked } from '../utils/timezone';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';

type Props = { poolId: string };
type ScoreEntry = { home: number; away: number };

export function Predictions({ poolId }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const saveMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
        setScores(initScores);
        setSavedIds(initSaved);
      })
      .catch(() => setError('Não foi possível carregar os jogos.'))
      .finally(() => setLoading(false));
  }, [poolId]);

  function handleChange(matchId: string, home: number, away: number) {
    setScores(prev => ({ ...prev, [matchId]: { home, away } }));
    setDirtyIds(prev => new Set([...prev, matchId]));
  }

  function saveSingle(matchId: string) {
    if (!dirtyIds.has(matchId)) return;
    if (debounceTimers.current[matchId]) clearTimeout(debounceTimers.current[matchId]);
    const sc = scores[matchId] ?? { home: 0, away: 0 };
    debounceTimers.current[matchId] = setTimeout(async () => {
      delete debounceTimers.current[matchId];
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
    }, 300);
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
        setSaveMsg({ type: 'success', text: `${result.saved} palpite${result.saved !== 1 ? 's' : ''} salvo${result.saved !== 1 ? 's' : ''} com sucesso!` });
      } else {
        setSaveMsg({ type: 'error', text: `${result.saved} salvos, ${result.skipped} bloqueados.` });
      }
    } catch (err) {
      console.error('Erro ao salvar palpites:', err);
      setSaveMsg({ type: 'error', text: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSaving(false);
      saveMsgTimer.current = setTimeout(() => setSaveMsg(null), 4000);
    }
  }

  const realMatches = matches.filter(m => m.homeTeam.name !== 'A Definir');
  const upcoming = realMatches.filter(m => !m.isFinished);
  const finished = realMatches.filter(m => m.isFinished);

  const groups = Array.from(
    new Set(realMatches.flatMap(m => m.groupName ? [m.groupName] : []))
  ).sort();

  const upcomingFiltered = selectedGroup
    ? upcoming.filter(m => m.groupName === selectedGroup)
    : upcoming;
  const finishedFiltered = selectedGroup
    ? finished.filter(m => m.groupName === selectedGroup)
    : finished;

  const saveableCount = upcoming.filter(m => !isMatchLocked(m.kickoffAt)).length;
  const savedCount = upcoming.filter(m => !isMatchLocked(m.kickoffAt) && savedIds.has(m.id) && !dirtyIds.has(m.id)).length;
  const dirtyCount = dirtyIds.size;

  // Agrupar próximos jogos por data
  const upcomingByDate: [string, Match[]][] = [];
  const dateMap: Record<string, Match[]> = {};
  upcomingFiltered.forEach(m => {
    const date = formatBrazilDate(m.kickoffAt);
    (dateMap[date] ??= []).push(m);
  });
  // Manter ordem cronológica
  upcomingFiltered.forEach(m => {
    const date = formatBrazilDate(m.kickoffAt);
    if (!upcomingByDate.find(([d]) => d === date)) {
      upcomingByDate.push([date, dateMap[date]]);
    }
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 12 }}>
        <div className="spinner" />
        <span style={{ fontSize: 13, color: '#6B7280' }}>Carregando jogos...</span>
      </div>
    );
  }

  if (error) return <div className="card" style={{ padding: 20, color: '#EF4444', textAlign: 'center', fontSize: 14 }}>{error}</div>;

  if (upcoming.length === 0 && finished.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 10 }}>
        <span style={{ fontSize: 40 }}>⚽</span>
        <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>Nenhum jogo cadastrado ainda.</p>
        <p style={{ margin: 0, fontSize: 12, color: '#D1D5DB' }}>Um admin deve importar os jogos da Copa.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header + Save bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#111827' }}>CENTRAL DE </span>
            <span style={{ color: '#F97316' }}>PALPITES</span>
          </h1>
          {saveableCount > 0 && (
            <p style={{ margin: '5px 0 0', fontSize: 12, color: '#6B7280' }}>
              {savedCount}/{saveableCount} palpites salvos
              {dirtyCount > 0 && (
                <span style={{ color: '#F97316', fontWeight: 700 }}> · {dirtyCount} alteração{dirtyCount !== 1 ? 'ões' : ''} pendente{dirtyCount !== 1 ? 's' : ''}</span>
              )}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: saveMsg.type === 'success' ? '#22C55E' : '#EF4444' }}>
              {saveMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {saveMsg.text}
            </div>
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
              {saving ? 'SALVANDO...' : `SALVAR ALTERAÇÕES (${dirtyCount})`}
            </button>
          )}
        </div>
      </div>

      {/* ── Filtro por grupo ── */}
      {groups.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 2 }}>Grupo:</span>
          <button
            onClick={() => setSelectedGroup(null)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: !selectedGroup ? '#F97316' : '#F3F4F6',
              color: !selectedGroup ? '#fff' : '#6B7280',
              transition: 'all 0.15s',
            }}
          >
            TODOS
          </button>
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGroup(selectedGroup === g ? null : g)}
              style={{
                width: 32, height: 28, borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: 'none',
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

      {/* ── Próximos jogos agrupados por data ── */}
      {upcomingByDate.length > 0 && upcomingByDate.map(([date, dateMatches]) => (
        <section key={date}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <p className="section-label" style={{ margin: 0 }}>{date}</p>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>{dateMatches.length} jogo{dateMatches.length !== 1 ? 's' : ''}</span>
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

      {upcomingFiltered.length === 0 && selectedGroup && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: 13 }}>
          Nenhum jogo disponível para o Grupo {selectedGroup}.
        </div>
      )}

      {/* ── Encerrados ── */}
      {finishedFiltered.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <p className="section-label" style={{ margin: 0 }}>Encerrados</p>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>{finishedFiltered.length} jogo{finishedFiltered.length !== 1 ? 's' : ''}</span>
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
