import { useEffect, useRef, useState } from 'react';
import { MatchCard } from '../components/MatchCard';
import { apiGet, apiPost } from '../services/api';
import type { Match, Prediction } from '../types';
import { isMatchLocked } from '../utils/timezone';
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
  const saveMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  async function saveAll() {
    const saveable = matches
      .filter(m => m.homeTeam.name !== 'A Definir' && !m.isFinished && !isMatchLocked(m.kickoffAt));

    if (saveable.length === 0) return;
    setSaving(true);
    if (saveMsgTimer.current) clearTimeout(saveMsgTimer.current);

    const results = await Promise.allSettled(
      saveable.map(m => {
        const sc = scores[m.id] ?? { home: 0, away: 0 };
        return apiPost('/predictions', {
          poolId,
          matchId: m.id,
          homeScorePrediction: sc.home,
          awayScorePrediction: sc.away,
        }).then(() => m.id);
      })
    );

    const succeeded = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map(r => r.value);
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    failed.forEach((r, i) => console.error(`Palpite ${i + 1} falhou:`, r.reason));
    const failedCount = failed.length;

    setSavedIds(prev => new Set([...prev, ...succeeded]));
    setDirtyIds(new Set());
    setSaving(false);

    if (failedCount === 0) {
      setSaveMsg({ type: 'success', text: `${succeeded.length} palpite${succeeded.length !== 1 ? 's' : ''} salvo${succeeded.length !== 1 ? 's' : ''} com sucesso!` });
    } else {
      setSaveMsg({ type: 'error', text: `${succeeded.length} salvos, ${failedCount} falharam.` });
    }
    saveMsgTimer.current = setTimeout(() => setSaveMsg(null), 4000);
  }

  const realMatches = matches.filter(m => m.homeTeam.name !== 'A Definir');
  const upcoming = realMatches.filter(m => !m.isFinished);
  const finished = realMatches.filter(m => m.isFinished);
  const saveableCount = upcoming.filter(m => !isMatchLocked(m.kickoffAt)).length;
  const savedCount = upcoming.filter(m => !isMatchLocked(m.kickoffAt) && savedIds.has(m.id) && !dirtyIds.has(m.id)).length;
  const pendingCount = saveableCount - savedCount;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Header + Save All bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#111827' }}>CENTRAL DE </span>
            <span style={{ color: '#F97316' }}>PALPITES</span>
          </h1>
          {saveableCount > 0 && (
            <p style={{ margin: '5px 0 0', fontSize: 12, color: '#6B7280' }}>
              {savedCount}/{saveableCount} palpites salvos
              {pendingCount > 0 && <span style={{ color: '#F97316', fontWeight: 700 }}> · {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}</span>}
            </p>
          )}
        </div>

        {saveableCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: saveMsg.type === 'success' ? '#22C55E' : '#EF4444' }}>
                {saveMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {saveMsg.text}
              </div>
            )}
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
              {saving ? 'SALVANDO...' : `SALVAR TODOS (${saveableCount})`}
            </button>
          </div>
        )}
      </div>

      {/* ── Upcoming matches ── */}
      {upcoming.length > 0 && (
        <section>
          <p className="section-label">Próximos jogos ({upcoming.length})</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {upcoming.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                home={scores[m.id]?.home ?? 0}
                away={scores[m.id]?.away ?? 0}
                isSaved={savedIds.has(m.id)}
                isDirty={dirtyIds.has(m.id)}
                onChange={(h, a) => handleChange(m.id, h, a)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Finished matches ── */}
      {finished.length > 0 && (
        <section>
          <p className="section-label">Encerrados ({finished.length})</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {finished.map(m => (
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
