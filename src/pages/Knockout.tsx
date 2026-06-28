import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../services/api';

interface MatchDto {
  homeTeam: { name: string; code: string; isoCode?: string | null };
  awayTeam: { name: string; code: string; isoCode?: string | null };
  kickoffAt: string;
  stage: string;
}

// ── Desktop layout constants ───────────────────────────────────
const H      = 54;
const UNIT   = 62;
const COL_W  = 136;
const CONN_W = 20;
const CONTAINER_H = 8 * UNIT - (UNIT - H);

function getCenter(round: number, idx: number) {
  return (Math.pow(2, round) * idx + (Math.pow(2, round) - 1) / 2) * UNIT + H / 2;
}
function getTop(round: number, idx: number) { return getCenter(round, idx) - H / 2; }

// ── Types ──────────────────────────────────────────────────────
type Team       = { label: string; name?: string; isoCode?: string };
type BMatch     = { id: string; home: Team; away: Team; winner?: 'home' | 'away' };
type HalfState  = [BMatch[], BMatch[], BMatch[], BMatch[]];
type BracketState = { left: HalfState; right: HalfState; final: BMatch; third: BMatch };

function makeMatch(id: string, h: string, a: string): BMatch {
  return { id, home: { label: h }, away: { label: a } };
}
function emptyMatch(id: string): BMatch {
  return { id, home: { label: '—' }, away: { label: '—' } };
}

const L32_INIT: BMatch[] = [
  makeMatch('l32-0','1°A','Mel. 3° D/E/F'), makeMatch('l32-1','1°C','Mel. 3° A/D/F'),
  makeMatch('l32-2','2°B','2°C'),           makeMatch('l32-3','1°B','2°A'),
  makeMatch('l32-4','1°D','Mel. 3° B/C/E'), makeMatch('l32-5','2°D','2°E'),
  makeMatch('l32-6','1°E','Mel. 3° A/B/C'), makeMatch('l32-7','1°F','2°F'),
];
const R32_INIT: BMatch[] = [
  makeMatch('r32-0','1°G','Mel. 3° H/I/J'), makeMatch('r32-1','2°H','2°I'),
  makeMatch('r32-2','1°H','Mel. 3° G/J/K'), makeMatch('r32-3','2°G','2°J'),
  makeMatch('r32-4','1°I','Mel. 3° K/L'),   makeMatch('r32-5','1°K','2°K'),
  makeMatch('r32-6','1°J','Mel. 3° G/H/L'), makeMatch('r32-7','1°L','2°L'),
];

function buildHalf(r32: BMatch[]): HalfState {
  return [
    r32,
    Array.from({ length: 4 }, (_, i) => emptyMatch(`r16-${i}`)),
    Array.from({ length: 2 }, (_, i) => emptyMatch(`qf-${i}`)),
    [emptyMatch('sf-0')],
  ];
}

function initBracket(l32 = L32_INIT, r32 = R32_INIT): BracketState {
  return { left: buildHalf(l32), right: buildHalf(r32), final: emptyMatch('final'), third: emptyMatch('third') };
}

// ── localStorage persistence ───────────────────────────────────
const PICKS_KEY = 'bolao_knockout_picks_v1';

type Picks = {
  l: (('home' | 'away') | null)[][];
  r: (('home' | 'away') | null)[][];
  f: ('home' | 'away') | null;
  t: ('home' | 'away') | null;
};

function extractPicks(b: BracketState): Picks {
  return {
    l: b.left.map(round  => round.map(m => m.winner ?? null)),
    r: b.right.map(round => round.map(m => m.winner ?? null)),
    f: b.final.winner ?? null,
    t: b.third.winner ?? null,
  };
}

function applyPicks(bracket: BracketState, picks: Picks): BracketState {
  let b = bracket;
  for (let ri = 0; ri < 4; ri++) {
    for (let mi = 0; mi < (picks.l[ri]?.length ?? 0); mi++) {
      const w = picks.l[ri][mi];
      if (w) b = advanceTeam(b, 'left', ri, mi, w);
    }
    for (let mi = 0; mi < (picks.r[ri]?.length ?? 0); mi++) {
      const w = picks.r[ri][mi];
      if (w) b = advanceTeam(b, 'right', ri, mi, w);
    }
  }
  if (picks.f) b = { ...b, final: { ...b.final, winner: picks.f } };
  if (picks.t) b = { ...b, third: { ...b.third, winner: picks.t } };
  return b;
}

function savePicks(b: BracketState) {
  try { localStorage.setItem(PICKS_KEY, JSON.stringify(extractPicks(b))); } catch { /* quota */ }
}

function loadPicks(): Picks | null {
  try {
    const raw = localStorage.getItem(PICKS_KEY);
    return raw ? JSON.parse(raw) as Picks : null;
  } catch { return null; }
}

function advanceTeam(
  state: BracketState, side: 'left' | 'right', roundIdx: number, matchIdx: number, winner: 'home' | 'away',
): BracketState {
  const half = state[side].map(r => r.map(m => ({ ...m }))) as HalfState;
  const match = half[roundIdx][matchIdx];
  const team = winner === 'home' ? { ...match.home } : { ...match.away };
  half[roundIdx][matchIdx] = { ...match, winner };
  if (roundIdx < 3) {
    const slot = matchIdx % 2 === 0 ? 'home' : 'away';
    half[roundIdx + 1][Math.floor(matchIdx / 2)] = {
      ...half[roundIdx + 1][Math.floor(matchIdx / 2)], [slot]: team,
    };
    return { ...state, [side]: half };
  }
  return { ...state, [side]: half, final: { ...state.final, [side === 'left' ? 'home' : 'away']: team } };
}

// ── Shared flag ────────────────────────────────────────────────
function TeamFlag({ isoCode, size }: { isoCode?: string; size: number }) {
  if (isoCode) return (
    <img
      src={`https://flagcdn.com/w40/${isoCode.toLowerCase()}.png`}
      width={size} height={Math.round(size * 0.67)}
      style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
    />
  );
  return <div style={{ width: size, height: Math.round(size * 0.67), borderRadius: 2, background: '#F1F5F9', border: '1px dashed #CBD5E1', flexShrink: 0 }} />;
}

// ═══════════════════════════════════════════════════════════════
// DESKTOP COMPONENTS
// ═══════════════════════════════════════════════════════════════

function DeskTeamRow({ team, isWinner, isLoser, canClick, onClick }: {
  team: Team; isWinner?: boolean; isLoser?: boolean; canClick: boolean; onClick: () => void;
}) {
  const hasReal = !!team.name;
  const isBlank = team.label === '—';
  const bg = isWinner ? '#F0FDF4' : 'transparent';
  return (
    <button
      onClick={canClick ? onClick : undefined}
      title={hasReal ? `${team.name} (${team.label})` : team.label}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px 6px 6px',
        width: '100%', background: bg, border: 'none',
        borderLeft: isWinner ? '3px solid #16A34A' : '3px solid transparent',
        cursor: canClick ? 'pointer' : 'default', textAlign: 'left',
        opacity: isLoser ? 0.35 : 1, transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (canClick) (e.currentTarget as HTMLButtonElement).style.background = isWinner ? '#DCFCE7' : '#FFF7ED'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = bg; }}
    >
      <TeamFlag isoCode={team.isoCode} size={22} />
      <span style={{
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontSize: 11, fontWeight: hasReal ? 700 : 500,
        color: isBlank ? '#CBD5E1' : hasReal ? '#0F172A' : '#64748B', lineHeight: 1,
      }}>
        {hasReal ? team.name : team.label}
      </span>
      {isWinner && <span style={{ color: '#16A34A', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>✓</span>}
    </button>
  );
}

function DeskMatchSlot({ match, onAdvance }: { match: BMatch; onAdvance: (w: 'home' | 'away') => void }) {
  const canClick = match.home.label !== '—' && match.away.label !== '—' && !match.winner;
  return (
    <div style={{
      width: COL_W, border: `1px solid ${match.winner ? '#BBF7D0' : '#E2E8F0'}`,
      borderRadius: 8, overflow: 'hidden', background: '#fff',
      boxShadow: match.winner ? '0 2px 8px rgba(22,163,74,0.12)' : '0 1px 4px rgba(15,23,42,0.06)',
    }}>
      <DeskTeamRow team={match.home} isWinner={match.winner==='home'} isLoser={match.winner==='away'} canClick={canClick} onClick={() => onAdvance('home')} />
      <div style={{ height: 1, background: '#F1F5F9' }} />
      <DeskTeamRow team={match.away} isWinner={match.winner==='away'} isLoser={match.winner==='home'} canClick={canClick} onClick={() => onAdvance('away')} />
    </div>
  );
}

function Connector({ fromRound, count, dir }: { fromRound: number; count: number; dir: 'left' | 'right' }) {
  return (
    <svg width={CONN_W} height={CONTAINER_H} style={{ flexShrink: 0, overflow: 'visible' }}>
      {Array.from({ length: count }, (_, i) => {
        const c0 = getCenter(fromRound, i * 2), c1 = getCenter(fromRound, i * 2 + 1);
        const mid = (c0 + c1) / 2, mx = CONN_W / 2;
        const x0 = dir === 'left' ? 0 : CONN_W, x1 = dir === 'left' ? CONN_W : 0;
        return (
          <g key={i} stroke="#CBD5E1" strokeWidth={1.5} fill="none">
            <line x1={x0} y1={c0} x2={mx} y2={c0} /><line x1={x0} y1={c1} x2={mx} y2={c1} />
            <line x1={mx} y1={c0} x2={mx} y2={c1} /><line x1={mx} y1={mid} x2={x1} y2={mid} />
          </g>
        );
      })}
    </svg>
  );
}

function RoundPill({ text, color }: { text: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
      <span style={{
        fontSize: 8, fontWeight: 800, letterSpacing: '0.08em', color,
        textTransform: 'uppercase', background: `${color}18`,
        padding: '3px 9px', borderRadius: 20, border: `1px solid ${color}35`, whiteSpace: 'nowrap',
      }}>{text}</span>
    </div>
  );
}

type RoundLabel = { text: string; color: string };

function HalfBracket({ half, side, labels, onAdvance }: {
  half: HalfState; side: 'left' | 'right'; labels: RoundLabel[];
  onAdvance: (ri: number, mi: number, w: 'home' | 'away') => void;
}) {
  const rounds  = side === 'left' ? half : [...half].reverse();
  const ordered = side === 'left' ? labels : [...labels].reverse();
  const ri = (di: number) => side === 'left' ? di : 3 - di;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
      {rounds.map((matches, di) => (
        <div key={di} style={{ display: 'flex', alignItems: 'flex-start' }}>
          {di > 0 && side === 'left'  && <Connector fromRound={ri(di)-1} count={rounds[di-1].length} dir="left" />}
          {di > 0 && side === 'right' && <Connector fromRound={ri(di)}   count={matches.length}       dir="right" />}
          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <RoundPill text={ordered[di].text} color={ordered[di].color} />
            <div style={{ position: 'relative', height: CONTAINER_H, width: COL_W }}>
              {(side === 'left' ? matches : [...matches].reverse()).map((match, dmi) => {
                const mi = side === 'left' ? dmi : matches.length - 1 - dmi;
                return (
                  <div key={match.id} style={{ position: 'absolute', top: getTop(ri(di), dmi) }}>
                    <DeskMatchSlot match={side === 'left' ? match : matches[mi]} onAdvance={w => onAdvance(ri(di), mi, w)} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MOBILE COMPONENTS
// ═══════════════════════════════════════════════════════════════

function MobileMatchCard({ match, onAdvance }: { match: BMatch; onAdvance: (w: 'home' | 'away') => void }) {
  const canClick = match.home.label !== '—' && match.away.label !== '—' && !match.winner;

  function TeamBtn({ side }: { side: 'home' | 'away' }) {
    const team = match[side];
    const isWinner = match.winner === side;
    const isLoser  = match.winner !== undefined && match.winner !== side;
    const hasReal  = !!team.name;
    const bg = isWinner ? '#F0FDF4' : 'transparent';
    return (
      <button
        onClick={canClick ? () => onAdvance(side) : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', width: '100%', minHeight: 56,
          background: bg, border: 'none',
          borderLeft: isWinner ? '4px solid #16A34A' : '4px solid transparent',
          cursor: canClick ? 'pointer' : 'default',
          textAlign: 'left', opacity: isLoser ? 0.38 : 1,
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => { if (canClick) (e.currentTarget as HTMLButtonElement).style.background = isWinner ? '#DCFCE7' : '#FFF7ED'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = bg; }}
      >
        <TeamFlag isoCode={team.isoCode} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: hasReal ? 700 : 500, lineHeight: 1.2,
            color: team.label === '—' ? '#CBD5E1' : hasReal ? '#0F172A' : '#64748B',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {hasReal ? team.name : team.label}
          </div>
          {hasReal && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{team.label}</div>}
        </div>
        {isWinner && (
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 900, lineHeight: 1 }}>✓</span>
          </div>
        )}
        {canClick && (
          <span style={{ fontSize: 18, color: '#CBD5E1', flexShrink: 0, lineHeight: 1 }}>›</span>
        )}
      </button>
    );
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: `1px solid ${match.winner ? '#BBF7D0' : '#E2E8F0'}`,
      overflow: 'hidden',
      boxShadow: match.winner ? '0 3px 12px rgba(22,163,74,0.12)' : '0 1px 6px rgba(15,23,42,0.07)',
    }}>
      <TeamBtn side="home" />
      <div style={{ height: 1, background: '#F1F5F9', margin: '0 16px' }} />
      <TeamBtn side="away" />
    </div>
  );
}

function MobileView({ bracket, onAdvance, onFinal, onThird }: {
  bracket: BracketState;
  onAdvance: (side: 'left' | 'right', ri: number, mi: number, w: 'home' | 'away') => void;
  onFinal: (w: 'home' | 'away') => void;
  onThird: (w: 'home' | 'away') => void;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  type RoundDef = {
    short: string; full: string; color: string;
    matches: BMatch[]; advance: (i: number, w: 'home' | 'away') => void;
  };

  const rounds: RoundDef[] = [
    {
      short: 'Avos', full: t('knockout.r32'), color: '#6366F1',
      matches: [...bracket.left[0], ...bracket.right[0]],
      advance: (i, w) => { const s = i < 8 ? 'left' : 'right'; onAdvance(s, 0, i < 8 ? i : i-8, w); },
    },
    {
      short: 'Oitavas', full: t('knockout.r16'), color: '#8B5CF6',
      matches: [...bracket.left[1], ...bracket.right[1]],
      advance: (i, w) => { const s = i < 4 ? 'left' : 'right'; onAdvance(s, 1, i < 4 ? i : i-4, w); },
    },
    {
      short: 'Quartas', full: t('knockout.qf'), color: '#A855F7',
      matches: [...bracket.left[2], ...bracket.right[2]],
      advance: (i, w) => { const s = i < 2 ? 'left' : 'right'; onAdvance(s, 2, i < 2 ? i : i-2, w); },
    },
    {
      short: 'Semi', full: t('knockout.sf'), color: '#C084FC',
      matches: [bracket.left[3][0], bracket.right[3][0]],
      advance: (i, w) => onAdvance(i === 0 ? 'left' : 'right', 3, 0, w),
    },
    {
      short: 'Final', full: t('knockout.finalLabel'), color: '#F97316',
      matches: [bracket.final],
      advance: (_, w) => onFinal(w),
    },
    {
      short: '3° Lugar', full: t('knockout.thirdPlace'), color: '#64748B',
      matches: [bracket.third],
      advance: (_, w) => onThird(w),
    },
  ];

  const cur = rounds[active];
  const decided = cur.matches.filter(m => m.winner).length;
  const allDone = decided === cur.matches.length;

  function goTo(i: number) {
    setActive(i);
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  return (
    <div>
      {/* Scrollable round tabs */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {rounds.map((r, i) => {
          const d = rounds[i].matches.filter(m => m.winner).length;
          const done = d === rounds[i].matches.length;
          const isActive = active === i;
          return (
            <button key={i} onClick={() => goTo(i)} style={{
              flexShrink: 0, padding: '9px 14px', borderRadius: 22,
              fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: isActive ? r.color : done ? '#F0FDF4' : '#F1F5F9',
              color: isActive ? '#fff' : done ? '#16A34A' : '#64748B',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.15s',
              boxShadow: isActive ? `0 2px 8px ${r.color}40` : 'none',
            }}>
              {r.short}
              {done && !isActive && <span style={{ fontSize: 11 }}>✓</span>}
              {!done && <span style={{ fontSize: 10, opacity: 0.7 }}>{d}/{rounds[i].matches.length}</span>}
            </button>
          );
        })}
      </div>

      {/* Round header */}
      <div ref={listRef} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        margin: '16px 0 12px',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0F172A' }}>{cur.full}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94A3B8' }}>
            {allDone ? 'Fase concluída!' : `${decided} de ${cur.matches.length} jogos decididos`}
          </p>
        </div>
        {allDone && (
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#F0FDF4',
            border: '2px solid #16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 18, color: '#16A34A' }}>✓</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2, background: cur.color,
          width: `${(decided / cur.matches.length) * 100}%`,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Match cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cur.matches.map((match, i) => (
          <MobileMatchCard key={match.id} match={match} onAdvance={w => cur.advance(i, w)} />
        ))}
      </div>

      {/* Next round CTA */}
      {allDone && active < rounds.length - 1 && (
        <button
          onClick={() => goTo(active + 1)}
          style={{
            marginTop: 20, width: '100%', padding: '16px',
            background: rounds[active + 1].color, color: '#fff',
            border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: `0 4px 14px ${rounds[active + 1].color}40`,
          }}
        >
          {rounds[active + 1].full} →
        </button>
      )}

      {/* Champion */}
      {active === 4 && bracket.final.winner && (
        <div style={{
          marginTop: 20, padding: 20, borderRadius: 16, textAlign: 'center',
          background: 'linear-gradient(135deg, #FFF7ED, #FFFBEB)',
          border: '2px solid #FCD34D',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🏆</div>
          <p style={{ margin: 0, fontSize: 12, color: '#92400E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Campeão do Mundo</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 }}>
            {(() => {
              const champ = bracket.final.winner === 'home' ? bracket.final.home : bracket.final.away;
              return (
                <>
                  <TeamFlag isoCode={champ.isoCode} size={40} />
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#92400E' }}>{champ.name || champ.label}</span>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function Knockout() {
  const { t } = useTranslation();
  const [bracket, setBracket]         = useState<BracketState>(() => initBracket());
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth < 768);
  const resetBase = useRef<BracketState | null>(null);

  // Responsive
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Fetch real teams from API
  useEffect(() => {
    apiGet<MatchDto[]>('/matches')
      .then(all => {
        const r32 = all
          .filter(m => m.stage === 'Rodada de 32')
          .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
        if (r32.length < 8) return;

        const toTeam = (tm: MatchDto['homeTeam'], fallback: Team): Team =>
          tm.code && tm.name ? { label: tm.code, name: tm.name, isoCode: tm.isoCode ?? undefined } : fallback;

        const newL32 = r32.slice(0, 8).map((m, i) => ({
          id: `l32-${i}`,
          home: toTeam(m.homeTeam, L32_INIT[i]?.home ?? { label: '—' }),
          away: toTeam(m.awayTeam, L32_INIT[i]?.away ?? { label: '—' }),
        }));
        const newR32 = r32.slice(8, 16).map((m, i) => ({
          id: `r32-${i}`,
          home: toTeam(m.homeTeam, R32_INIT[i]?.home ?? { label: '—' }),
          away: toTeam(m.awayTeam, R32_INIT[i]?.away ?? { label: '—' }),
        }));

        const fresh = initBracket(newL32, newR32);
        resetBase.current = fresh;

        // Restore saved picks on top of fresh real-team bracket
        const saved = loadPicks();
        setBracket(saved ? applyPicks(fresh, saved) : fresh);
        setTeamsLoaded(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-save picks whenever bracket changes (only after real teams are loaded)
  useEffect(() => {
    if (teamsLoaded) savePicks(bracket);
  }, [bracket, teamsLoaded]);

  function handleAdvance(side: 'left' | 'right', ri: number, mi: number, w: 'home' | 'away') {
    setBracket(prev => advanceTeam(prev, side, ri, mi, w));
  }
  function handleFinal(w: 'home' | 'away') {
    setBracket(prev => ({ ...prev, final: { ...prev.final, winner: w } }));
  }
  function handleThird(w: 'home' | 'away') {
    setBracket(prev => ({ ...prev, third: { ...prev.third, winner: w } }));
  }
  function handleReset() {
    localStorage.removeItem(PICKS_KEY);
    setBracket(resetBase.current ?? initBracket());
  }

  const DESK_LABELS: RoundLabel[] = [
    { text: t('knockout.r32'), color: '#6366F1' }, { text: t('knockout.r16'), color: '#8B5CF6' },
    { text: t('knockout.qf'),  color: '#A855F7' }, { text: t('knockout.sf'),  color: '#C084FC' },
  ];

  const finalCenter = getCenter(3, 0);
  const finalTop    = finalCenter - H / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#111827' }}>{t('knockout.title')}</span>
            <span style={{ color: '#F97316' }}>{t('knockout.titleHighlight')}</span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>
            {teamsLoaded ? 'Clique em uma seleção para avançá-la na chave' : t('knockout.subtitle')}
          </p>
        </div>
        <button onClick={handleReset} style={{
          padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', cursor: 'pointer',
        }}>
          ↺ {t('knockout.resetBracket')}
        </button>
      </div>

      {/* TBD banner */}
      {!loading && !teamsLoaded && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400E' }}>{t('knockout.tbdTitle')}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#B45309' }}>{t('knockout.tbdDesc')}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
          Carregando chave eliminatória…
        </div>
      )}

      {/* ── MOBILE VIEW ── */}
      {!loading && isMobile && (
        <MobileView bracket={bracket} onAdvance={handleAdvance} onFinal={handleFinal} onThird={handleThird} />
      )}

      {/* ── DESKTOP VIEW ── */}
      {!loading && !isMobile && (
        <div style={{ background: '#F8FAFC', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 16px', overflowX: 'auto', overflowY: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content', paddingTop: 4 }}>

            <HalfBracket half={bracket.left} side="left" labels={DESK_LABELS} onAdvance={(ri, mi, w) => handleAdvance('left', ri, mi, w)} />

            {/* Final column */}
            <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
              <svg width={CONN_W} height={CONTAINER_H} style={{ flexShrink: 0, overflow: 'visible' }}>
                <line x1={0} y1={getCenter(3,0)} x2={CONN_W} y2={getCenter(3,0)} stroke="#CBD5E1" strokeWidth={1.5} />
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, width: COL_W + 16 }}>
                <RoundPill text={t('knockout.finalLabel')} color="#F97316" />
                <div style={{ position: 'relative', height: CONTAINER_H }}>
                  <div style={{ position: 'absolute', top: finalTop, left: 8 }}>
                    <DeskMatchSlot match={bracket.final} onAdvance={handleFinal} />
                  </div>
                  <div style={{ position: 'absolute', top: finalTop + H + 28, left: 8 }}>
                    <RoundPill text={t('knockout.thirdPlace')} color="#64748B" />
                    <DeskMatchSlot match={bracket.third} onAdvance={handleThird} />
                  </div>
                </div>
              </div>
              <svg width={CONN_W} height={CONTAINER_H} style={{ flexShrink: 0, overflow: 'visible' }}>
                <line x1={0} y1={getCenter(3,0)} x2={CONN_W} y2={getCenter(3,0)} stroke="#CBD5E1" strokeWidth={1.5} />
              </svg>
            </div>

            <HalfBracket half={bracket.right} side="right" labels={DESK_LABELS} onAdvance={(ri, mi, w) => handleAdvance('right', ri, mi, w)} />
          </div>
        </div>
      )}
    </div>
  );
}
