import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { Match, Prediction } from '../types';
import { Target, Zap, Award, TrendingUp } from 'lucide-react';
import { formatBrazilDate } from '../utils/timezone';

type Props = { poolId: string };
type Result = 'exact' | 'correct' | 'wrong';

type FinishedPred = {
  match: Match;
  ph: number; pa: number;
  ah: number; aa: number;
  result: Result;
};

function getResult(ph: number, pa: number, ah: number, aa: number): Result {
  if (ph === ah && pa === aa) return 'exact';
  const pd = ph > pa ? 1 : ph < pa ? -1 : 0;
  const ad = ah > aa ? 1 : ah < aa ? -1 : 0;
  return pd === ad ? 'correct' : 'wrong';
}

const RS = {
  exact:   { bg: '#16A34A12', border: '#16A34A30', color: '#16A34A', icon: '✅', label: 'Placar exato' },
  correct: { bg: '#D9770612', border: '#D9770630', color: '#D97706', icon: '🟡', label: 'Resultado certo' },
  wrong:   { bg: '#6B728010', border: '#6B728025', color: '#6B7280', icon: '❌', label: 'Errou' },
};

function FlagImg({ isoCode, name }: { isoCode?: string; name: string }) {
  if (!isoCode) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${isoCode.toLowerCase()}.png`}
      alt={name}
      style={{ width: 24, height: 16, borderRadius: 3, objectFit: 'cover', display: 'inline-block' }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

export function Performance({ poolId }: Props) {
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<Match[]>('/matches'),
      apiGet<Prediction[]>(`/predictions/me?poolId=${poolId}`),
    ])
      .then(([m, p]) => { setMatches(m); setPreds(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [poolId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 12 }}>
        <div className="spinner" />
        <span style={{ fontSize: 13, color: '#6B7280' }}>Calculando performance...</span>
      </div>
    );
  }

  const matchMap = new Map(matches.map(m => [m.id, m]));

  const finished: FinishedPred[] = preds
    .filter(p => {
      const m = matchMap.get(p.matchId);
      return m?.isFinished && m.homeTeam.name !== 'A Definir';
    })
    .map(p => {
      const m = matchMap.get(p.matchId)!;
      return {
        match: m,
        ph: p.homeScorePrediction, pa: p.awayScorePrediction,
        ah: m.homeScore ?? 0, aa: m.awayScore ?? 0,
        result: getResult(p.homeScorePrediction, p.awayScorePrediction, m.homeScore ?? 0, m.awayScore ?? 0),
      };
    })
    .sort((a, b) => new Date(a.match.kickoffAt).getTime() - new Date(b.match.kickoffAt).getTime());

  const total = finished.length;
  const exact = finished.filter(f => f.result === 'exact').length;
  const correct = finished.filter(f => f.result === 'correct').length;
  const wrong = finished.filter(f => f.result === 'wrong').length;
  const rate = total > 0 ? Math.round(((exact + correct) / total) * 100) : 0;

  let maxStreak = 0, streak = 0;
  for (const f of finished) {
    if (f.result !== 'wrong') { streak++; if (streak > maxStreak) maxStreak = streak; }
    else streak = 0;
  }
  let curStreak = 0;
  for (let i = finished.length - 1; i >= 0; i--) {
    if (finished[i].result !== 'wrong') curStreak++;
    else break;
  }

  const teamMap: Record<string, { name: string; isoCode?: string; total: number; hit: number }> = {};
  for (const f of finished) {
    for (const team of [f.match.homeTeam, f.match.awayTeam]) {
      if (!teamMap[team.id]) teamMap[team.id] = { name: team.name, isoCode: team.isoCode, total: 0, hit: 0 };
      teamMap[team.id].total++;
      if (f.result !== 'wrong') teamMap[team.id].hit++;
    }
  }
  const topTeams = Object.values(teamMap)
    .filter(t => t.total >= 2)
    .map(t => ({ ...t, pct: Math.round((t.hit / t.total) * 100) }))
    .sort((a, b) => b.pct - a.pct || b.total - a.total)
    .slice(0, 6);

  const recent = [...finished].reverse().slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#111827' }}>MINHA </span>
          <span style={{ color: '#F97316' }}>PERFORMANCE</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280' }}>
          Seu histórico detalhado de palpites neste bolão.
        </p>
      </div>

      {total === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 12 }}>
          <TrendingUp size={48} color="#E5E7EB" />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>Nenhum resultado disponível ainda</p>
          <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>Os dados aparecem quando os primeiros jogos terminarem.</p>
        </div>
      ) : (
        <>
          {/* Accuracy + breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {/* Wide accuracy card */}
            <div className="card" style={{ padding: 24, gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              {/* Donut */}
              <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: 88, height: 88 }}>
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#F97316" strokeWidth="3"
                    strokeDasharray={`${rate} ${100 - rate}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#F97316' }}>{rate}%</span>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Aproveitamento geral</p>
                <p style={{ margin: '6px 0 4px', fontSize: 32, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{rate}<span style={{ fontSize: 16, color: '#6B7280' }}>%</span></p>
                <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{exact + correct} acertos em {total} jogo{total !== 1 ? 's' : ''} avaliado{total !== 1 ? 's' : ''}</p>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {([
                  { icon: '✅', count: exact,   label: 'Placares exatos',    color: '#16A34A' },
                  { icon: '🟡', count: correct, label: 'Resultados certos',  color: '#D97706' },
                  { icon: '❌', count: wrong,   label: 'Erros',              color: '#6B7280' },
                ] as const).map(item => (
                  <div key={item.label} style={{ textAlign: 'center', minWidth: 64 }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.count}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Current streak */}
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <Zap size={22} color="#F97316" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#F97316', lineHeight: 1 }}>{curStreak}</p>
              <p style={{ margin: '6px 0 0', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sequência atual</p>
            </div>

            {/* Best streak */}
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <Award size={22} color="#D97706" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#D97706', lineHeight: 1 }}>{maxStreak}</p>
              <p style={{ margin: '6px 0 0', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Melhor sequência</p>
            </div>

            {/* Total evaluated */}
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <Target size={22} color="#22C55E" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#22C55E', lineHeight: 1 }}>{total}</p>
              <p style={{ margin: '6px 0 0', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Jogos avaliados</p>
            </div>
          </div>

          {/* Top teams */}
          {topTeams.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <p className="section-label">Times que mais acerto</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topTeams.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FlagImg isoCode={t.isoCode} name={t.name} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                    <div style={{ width: 100, height: 5, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ width: `${t.pct}%`, height: '100%', background: t.pct >= 70 ? '#22C55E' : t.pct >= 40 ? '#F97316' : '#EF4444', borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#374151', minWidth: 60, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {t.pct}% <span style={{ fontWeight: 400, color: '#9CA3AF' }}>({t.hit}/{t.total})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent history */}
          {recent.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <p className="section-label">Histórico recente</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recent.map((f, i) => {
                  const rs = RS[f.result];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: rs.bg, border: `1px solid ${rs.border}` }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{rs.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.match.homeTeam.name} × {f.match.awayTeam.name}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6B7280' }}>{formatBrazilDate(f.match.kickoffAt)}</p>
                      </div>
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 9, color: '#9CA3AF' }}>MEU PALPITE</p>
                        <p style={{ margin: '1px 0 0', fontSize: 13, fontWeight: 800, color: rs.color }}>{f.ph}×{f.pa}</p>
                      </div>
                      <div style={{ width: 1, height: 28, background: '#E5E7EB', flexShrink: 0 }} />
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 9, color: '#9CA3AF' }}>RESULTADO</p>
                        <p style={{ margin: '1px 0 0', fontSize: 13, fontWeight: 800, color: '#111827' }}>{f.ah}×{f.aa}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
