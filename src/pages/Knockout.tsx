import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../services/api';

interface MatchDto {
  homeTeam: { name: string; code: string; isoCode?: string | null };
  awayTeam: { name: string; code: string; isoCode?: string | null };
  kickoffAt: string;
  stage: string;
}

const UNIT = 80; // slot height (H) + gap (G)
const H = 72;    // match slot height (2 team rows)
const COL_W = 156;
const CONN_W = 28;
const CONTAINER_H = 8 * UNIT - (UNIT - H); // 632px

type Team = { label: string; name?: string; isoCode?: string };
type BMatch = { id: string; home: Team; away: Team; winner?: 'home' | 'away' };

// Vertical center of match[round][idx] within the container
function getCenter(round: number, idx: number): number {
  return (Math.pow(2, round) * idx + (Math.pow(2, round) - 1) / 2) * UNIT + H / 2;
}
function getTop(round: number, idx: number): number {
  return getCenter(round, idx) - H / 2;
}

function makeMatch(id: string, h: string, a: string): BMatch {
  return { id, home: { label: h }, away: { label: a } };
}
function emptyMatch(id: string): BMatch {
  return { id, home: { label: '—' }, away: { label: '—' } };
}

const L32: BMatch[] = [
  makeMatch('l32-0', '1°A', 'Mel. 3° D/E/F'),
  makeMatch('l32-1', '1°C', 'Mel. 3° A/D/F'),
  makeMatch('l32-2', '2°B', '2°C'),
  makeMatch('l32-3', '1°B', '2°A'),
  makeMatch('l32-4', '1°D', 'Mel. 3° B/C/E'),
  makeMatch('l32-5', '2°D', '2°E'),
  makeMatch('l32-6', '1°E', 'Mel. 3° A/B/C'),
  makeMatch('l32-7', '1°F', '2°F'),
];

const R32: BMatch[] = [
  makeMatch('r32-0', '1°G', 'Mel. 3° H/I/J'),
  makeMatch('r32-1', '2°H', '2°I'),
  makeMatch('r32-2', '1°H', 'Mel. 3° G/J/K'),
  makeMatch('r32-3', '2°G', '2°J'),
  makeMatch('r32-4', '1°I', 'Mel. 3° K/L'),
  makeMatch('r32-5', '1°K', '2°K'),
  makeMatch('r32-6', '1°J', 'Mel. 3° G/H/L'),
  makeMatch('r32-7', '1°L', '2°L'),
];

type HalfState = [BMatch[], BMatch[], BMatch[], BMatch[]]; // [R32(8), R16(4), QF(2), SF(1)]

function initHalf(r32: BMatch[]): HalfState {
  return [
    r32,
    [emptyMatch('h16-0'), emptyMatch('h16-1'), emptyMatch('h16-2'), emptyMatch('h16-3')],
    [emptyMatch('hqf-0'), emptyMatch('hqf-1')],
    [emptyMatch('hsf-0')],
  ];
}

type BracketState = {
  left: HalfState;
  right: HalfState;
  final: BMatch;
  third: BMatch;
};

function initBracket(): BracketState {
  return {
    left: initHalf(L32),
    right: initHalf(R32),
    final: emptyMatch('final'),
    third: emptyMatch('third'),
  };
}

function advanceTeam(
  state: BracketState,
  side: 'left' | 'right',
  roundIdx: number,
  matchIdx: number,
  winner: 'home' | 'away',
): BracketState {
  const half = state[side].map(r => r.map(m => ({ ...m }))) as HalfState;
  const match = half[roundIdx][matchIdx];
  const team = winner === 'home' ? { ...match.home } : { ...match.away };
  half[roundIdx][matchIdx] = { ...match, winner };

  if (roundIdx < 3) {
    const nextMatchIdx = Math.floor(matchIdx / 2);
    const slot = matchIdx % 2 === 0 ? 'home' : 'away';
    half[roundIdx + 1][nextMatchIdx] = {
      ...half[roundIdx + 1][nextMatchIdx],
      [slot]: team,
    };
    return { ...state, [side]: half };
  } else {
    // SF winner → final
    const slot = side === 'left' ? 'home' : 'away';
    return {
      ...state,
      [side]: half,
      final: { ...state.final, [slot]: team },
    };
  }
}

// ── Team row button ──────────────────────────────────────────
function TeamRow({
  team, isWinner, isLoser, canClick, onClick,
}: {
  team: Team; isWinner?: boolean; isLoser?: boolean; canClick: boolean; onClick: () => void;
}) {
  const { t } = useTranslation();
  const hasReal = !!team.name;
  const isPlaceholder = team.label === '—';
  const bg = isWinner ? '#F0FDF4' : isLoser ? '#F9FAFB' : 'transparent';

  return (
    <button
      onClick={canClick ? onClick : undefined}
      title={canClick ? t('knockout.advanceTitle', { team: team.name || team.label }) : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 10px', width: '100%',
        background: bg, border: 'none',
        cursor: canClick ? 'pointer' : 'default',
        textAlign: 'left', transition: 'background 0.12s',
        opacity: isLoser ? 0.45 : 1,
      }}
      onMouseEnter={e => { if (canClick) (e.currentTarget as HTMLButtonElement).style.background = isWinner ? '#DCFCE7' : '#FFF7ED'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = bg; }}
    >
      {team.isoCode ? (
        <img
          src={`https://flagcdn.com/w40/${team.isoCode.toLowerCase()}.png`}
          width={20} height={14}
          style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 20, height: 14, borderRadius: 2, flexShrink: 0,
          background: isPlaceholder ? '#F3F4F6' : '#FEF3C7',
          border: `1px dashed ${isPlaceholder ? '#E5E7EB' : '#FBBF24'}`,
        }} />
      )}
      <span style={{
        fontSize: 10, fontWeight: hasReal ? 700 : 500,
        color: isPlaceholder ? '#D1D5DB' : hasReal ? '#111827' : '#9CA3AF',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flex: 1, maxWidth: 108,
      }}>
        {team.name || team.label}
      </span>
      {isWinner && <span style={{ fontSize: 9, color: '#16A34A', fontWeight: 900, marginLeft: 'auto' }}>✓</span>}
    </button>
  );
}

// ── Single match card ────────────────────────────────────────
function MatchSlot({ match, onAdvance }: { match: BMatch; onAdvance: (w: 'home' | 'away') => void }) {
  const bothDefined = match.home.label !== '—' && match.away.label !== '—';
  const alreadyWon = !!match.winner;
  const canClick = bothDefined && !alreadyWon;

  return (
    <div style={{
      width: COL_W, border: `1px solid ${match.winner ? '#D1FAE5' : '#E5E7EB'}`,
      borderRadius: 8, overflow: 'hidden', background: '#fff',
      boxShadow: match.winner ? '0 0 0 2px #D1FAE520' : 'none',
      transition: 'border-color 0.2s',
    }}>
      <TeamRow team={match.home} isWinner={match.winner === 'home'} isLoser={match.winner === 'away'} canClick={canClick} onClick={() => onAdvance('home')} />
      <div style={{ height: 1, background: '#F3F4F6' }} />
      <TeamRow team={match.away} isWinner={match.winner === 'away'} isLoser={match.winner === 'home'} canClick={canClick} onClick={() => onAdvance('away')} />
    </div>
  );
}

// ── SVG connector between columns ────────────────────────────
function Connector({ fromRound, count, direction }: { fromRound: number; count: number; direction: 'left' | 'right' }) {
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const c0 = getCenter(fromRound, i * 2);
    const c1 = getCenter(fromRound, i * 2 + 1);
    const mid = (c0 + c1) / 2;
    const midX = CONN_W / 2;

    if (direction === 'left') {
      // Left bracket: match output goes right → connector → next round input from left
      lines.push(
        <g key={i}>
          <line x1={0} y1={c0} x2={midX} y2={c0} stroke="#E5E7EB" strokeWidth={1.5} />
          <line x1={0} y1={c1} x2={midX} y2={c1} stroke="#E5E7EB" strokeWidth={1.5} />
          <line x1={midX} y1={c0} x2={midX} y2={c1} stroke="#E5E7EB" strokeWidth={1.5} />
          <line x1={midX} y1={mid} x2={CONN_W} y2={mid} stroke="#E5E7EB" strokeWidth={1.5} />
        </g>
      );
    } else {
      // Right bracket: mirrored
      lines.push(
        <g key={i}>
          <line x1={CONN_W} y1={c0} x2={midX} y2={c0} stroke="#E5E7EB" strokeWidth={1.5} />
          <line x1={CONN_W} y1={c1} x2={midX} y2={c1} stroke="#E5E7EB" strokeWidth={1.5} />
          <line x1={midX} y1={c0} x2={midX} y2={c1} stroke="#E5E7EB" strokeWidth={1.5} />
          <line x1={midX} y1={mid} x2={0} y2={mid} stroke="#E5E7EB" strokeWidth={1.5} />
        </g>
      );
    }
  }
  return (
    <svg width={CONN_W} height={CONTAINER_H} style={{ flexShrink: 0, overflow: 'visible' }}>
      {lines}
    </svg>
  );
}

// ── Half bracket (4 rounds) ──────────────────────────────────
function HalfBracket({
  half, side, roundNames, onAdvance,
}: {
  half: HalfState;
  side: 'left' | 'right';
  roundNames: string[];
  onAdvance: (roundIdx: number, matchIdx: number, w: 'home' | 'away') => void;
}) {
  const rounds = side === 'left' ? half : [...half].reverse();
  const roundNamesOrdered = side === 'left' ? roundNames : [...roundNames].reverse();
  const actualRoundIdx = (displayIdx: number) => side === 'left' ? displayIdx : 3 - displayIdx;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
      {rounds.map((matches, displayIdx) => {
        const ri = actualRoundIdx(displayIdx);
        const roundMatches = matches.length === 8 ? matches :
          side === 'left' ? matches : matches; // already in correct order

        return (
          <div key={displayIdx} style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Connector before this round (not before the first) */}
            {displayIdx > 0 && side === 'left' && (
              <Connector fromRound={ri - 1} count={rounds[displayIdx - 1].length} direction="left" />
            )}
            {displayIdx > 0 && side === 'right' && (
              <Connector fromRound={ri} count={matches.length} direction="right" />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              {/* Round label */}
              <p style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#9CA3AF',
                textAlign: 'center', margin: '0 0 10px', textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                {roundNamesOrdered[displayIdx]}
              </p>

              {/* Matches container (absolute positioning) */}
              <div style={{ position: 'relative', height: CONTAINER_H, width: COL_W }}>
                {(side === 'left' ? roundMatches : [...roundMatches].reverse()).map((match, displayMatchIdx) => {
                  const mi = side === 'left' ? displayMatchIdx : roundMatches.length - 1 - displayMatchIdx;
                  return (
                    <div
                      key={match.id}
                      style={{ position: 'absolute', top: getTop(ri, displayMatchIdx), left: 0 }}
                    >
                      <MatchSlot
                        match={side === 'left' ? match : roundMatches[mi]}
                        onAdvance={w => onAdvance(ri, mi, w)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function Knockout() {
  const { t } = useTranslation();
  const [bracket, setBracket] = useState<BracketState>(initBracket);
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  useEffect(() => {
    apiGet<MatchDto[]>('/matches').then(all => {
      const r32 = all
        .filter(m => m.stage === 'Rodada de 32')
        .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

      if (r32.length < 8) return;

      const toTeam = (t: MatchDto['homeTeam'], fallback: Team): Team => {
        if (!t.code || !t.name) return fallback;
        return { label: t.code, name: t.name, isoCode: t.isoCode ?? undefined };
      };

      const left8 = r32.slice(0, 8);
      const right8 = r32.slice(8, 16);

      const newL32: BMatch[] = left8.map((m, i) => ({
        id: `l32-${i}`,
        home: toTeam(m.homeTeam, L32[i]?.home ?? { label: '—' }),
        away: toTeam(m.awayTeam, L32[i]?.away ?? { label: '—' }),
      }));
      const newR32: BMatch[] = right8.map((m, i) => ({
        id: `r32-${i}`,
        home: toTeam(m.homeTeam, R32[i]?.home ?? { label: '—' }),
        away: toTeam(m.awayTeam, R32[i]?.away ?? { label: '—' }),
      }));

      setBracket(prev => ({
        ...prev,
        left: [newL32, prev.left[1], prev.left[2], prev.left[3]] as HalfState,
        right: [newR32, prev.right[1], prev.right[2], prev.right[3]] as HalfState,
      }));
      setTeamsLoaded(true);
    }).catch(() => {});
  }, []);

  function handleAdvance(side: 'left' | 'right', roundIdx: number, matchIdx: number, winner: 'home' | 'away') {
    setBracket(prev => advanceTeam(prev, side, roundIdx, matchIdx, winner));
  }

  const finalCenter = getCenter(3, 0); // SF is round 3, match 0
  const finalTop = finalCenter - H / 2;

  const ROUND_NAMES = [t('knockout.r32'), t('knockout.r16'), t('knockout.qf'), t('knockout.sf')];
  const ROUND_NAMES_L = ROUND_NAMES;
  const ROUND_NAMES_R = ROUND_NAMES;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#111827' }}>{t('knockout.title')}</span>
            <span style={{ color: '#F97316' }}>{t('knockout.titleHighlight')}</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#6B7280' }}>
            {t('knockout.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setBracket(initBracket())}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280',
            cursor: 'pointer',
          }}
        >
          {t('knockout.resetBracket')}
        </button>
      </div>

      {/* Info banner — shown only while teams are still TBD */}
      {!teamsLoaded && (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>⏳</span>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#92400E' }}>
              {t('knockout.tbdTitle')}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#B45309' }}>
              {t('knockout.tbdDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Bracket */}
      <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 'max-content', paddingTop: 4 }}>

          {/* Left half */}
          <HalfBracket
            half={bracket.left}
            side="left"
            roundNames={ROUND_NAMES_L}
            onAdvance={(ri, mi, w) => handleAdvance('left', ri, mi, w)}
          />

          {/* SF → Final connectors + Final column */}
          <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
            {/* Left SF connector to Final */}
            <svg width={CONN_W} height={CONTAINER_H} style={{ flexShrink: 0, overflow: 'visible' }}>
              <line x1={0} y1={getCenter(3, 0)} x2={CONN_W} y2={getCenter(3, 0)} stroke="#E5E7EB" strokeWidth={1.5} />
            </svg>

            {/* Final + 3rd place column */}
            <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, width: COL_W + 24 }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#F97316', textAlign: 'center', margin: '0 0 10px', textTransform: 'uppercase' }}>
                {t('knockout.finalLabel')}
              </p>
              <div style={{ position: 'relative', height: CONTAINER_H }}>
                {/* Final match */}
                <div style={{ position: 'absolute', top: finalTop, left: 12 }}>
                  <MatchSlot
                    match={bracket.final}
                    onAdvance={w => {
                      const team = w === 'home' ? bracket.final.home : bracket.final.away;
                      setBracket(prev => ({ ...prev, final: { ...prev.final, winner: w } }));
                    }}
                  />
                </div>

                {/* 3rd place */}
                <div style={{ position: 'absolute', top: finalTop + H + 32, left: 12 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textAlign: 'center', margin: '0 0 6px', letterSpacing: '0.1em' }}>
                    {t('knockout.thirdPlace')}
                  </p>
                  <MatchSlot
                    match={bracket.third}
                    onAdvance={w => setBracket(prev => ({ ...prev, third: { ...prev.third, winner: w } }))}
                  />
                </div>
              </div>
            </div>

            {/* Right SF connector from Final */}
            <svg width={CONN_W} height={CONTAINER_H} style={{ flexShrink: 0, overflow: 'visible' }}>
              <line x1={0} y1={getCenter(3, 0)} x2={CONN_W} y2={getCenter(3, 0)} stroke="#E5E7EB" strokeWidth={1.5} />
            </svg>
          </div>

          {/* Right half */}
          <HalfBracket
            half={bracket.right}
            side="right"
            roundNames={ROUND_NAMES_R}
            onAdvance={(ri, mi, w) => handleAdvance('right', ri, mi, w)}
          />
        </div>
      </div>
    </div>
  );
}
