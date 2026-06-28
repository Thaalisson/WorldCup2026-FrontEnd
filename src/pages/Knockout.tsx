import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../services/api';

interface MatchDto {
  homeTeam: { name: string; code: string; isoCode?: string | null };
  awayTeam: { name: string; code: string; isoCode?: string | null };
  kickoffAt: string;
  stage: string;
}

// ── Layout constants ──────────────────────────────────────────
const H      = 54;   // match card height
const UNIT   = 62;   // vertical slot (H + gap)
const COL_W  = 136;  // card width
const CONN_W = 20;   // SVG connector width
const CONTAINER_H = 8 * UNIT - (UNIT - H);

function getCenter(round: number, idx: number) {
  return (Math.pow(2, round) * idx + (Math.pow(2, round) - 1) / 2) * UNIT + H / 2;
}
function getTop(round: number, idx: number) {
  return getCenter(round, idx) - H / 2;
}

// ── Types ────────────────────────────────────────────────────
type Team   = { label: string; name?: string; isoCode?: string };
type BMatch = { id: string; home: Team; away: Team; winner?: 'home' | 'away' };
type HalfState = [BMatch[], BMatch[], BMatch[], BMatch[]];
type BracketState = { left: HalfState; right: HalfState; final: BMatch; third: BMatch };

function makeMatch(id: string, h: string, a: string): BMatch {
  return { id, home: { label: h }, away: { label: a } };
}
function emptyMatch(id: string): BMatch {
  return { id, home: { label: '—' }, away: { label: '—' } };
}

// Hardcoded bracket slots — used as fallback
const L32_INIT: BMatch[] = [
  makeMatch('l32-0', '1°A', 'Mel. 3° D/E/F'),
  makeMatch('l32-1', '1°C', 'Mel. 3° A/D/F'),
  makeMatch('l32-2', '2°B', '2°C'),
  makeMatch('l32-3', '1°B', '2°A'),
  makeMatch('l32-4', '1°D', 'Mel. 3° B/C/E'),
  makeMatch('l32-5', '2°D', '2°E'),
  makeMatch('l32-6', '1°E', 'Mel. 3° A/B/C'),
  makeMatch('l32-7', '1°F', '2°F'),
];
const R32_INIT: BMatch[] = [
  makeMatch('r32-0', '1°G', 'Mel. 3° H/I/J'),
  makeMatch('r32-1', '2°H', '2°I'),
  makeMatch('r32-2', '1°H', 'Mel. 3° G/J/K'),
  makeMatch('r32-3', '2°G', '2°J'),
  makeMatch('r32-4', '1°I', 'Mel. 3° K/L'),
  makeMatch('r32-5', '1°K', '2°K'),
  makeMatch('r32-6', '1°J', 'Mel. 3° G/H/L'),
  makeMatch('r32-7', '1°L', '2°L'),
];

function buildEmptyHalf(r32: BMatch[]): HalfState {
  return [
    r32,
    Array.from({ length: 4 }, (_, i) => emptyMatch(`r16-${i}`)),
    Array.from({ length: 2 }, (_, i) => emptyMatch(`qf-${i}`)),
    [emptyMatch('sf-0')],
  ];
}

function initBracket(l32 = L32_INIT, r32 = R32_INIT): BracketState {
  return {
    left:  buildEmptyHalf(l32),
    right: buildEmptyHalf(r32),
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
    const nextMatch = Math.floor(matchIdx / 2);
    const slot = matchIdx % 2 === 0 ? 'home' : 'away';
    half[roundIdx + 1][nextMatch] = { ...half[roundIdx + 1][nextMatch], [slot]: team };
    return { ...state, [side]: half };
  }
  const slot = side === 'left' ? 'home' : 'away';
  return { ...state, [side]: half, final: { ...state.final, [slot]: team } };
}

// ── Team row ─────────────────────────────────────────────────
function TeamRow({
  team, isWinner, isLoser, canClick, onClick,
}: {
  team: Team; isWinner?: boolean; isLoser?: boolean; canClick: boolean; onClick: () => void;
}) {
  const hasReal    = !!team.name;
  const isBlank    = team.label === '—';
  const bg         = isWinner ? '#F0FDF4' : 'transparent';
  const leftBorder = isWinner ? '3px solid #16A34A' : '3px solid transparent';

  return (
    <button
      onClick={canClick ? onClick : undefined}
      title={hasReal ? `${team.name} (${team.label})` : team.label}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 8px 6px 6px', width: '100%',
        background: bg, border: 'none', borderLeft: leftBorder,
        cursor: canClick ? 'pointer' : 'default',
        textAlign: 'left', opacity: isLoser ? 0.35 : 1,
        transition: 'background 0.1s, opacity 0.1s',
      }}
      onMouseEnter={e => {
        if (!canClick) return;
        (e.currentTarget as HTMLButtonElement).style.background = isWinner ? '#DCFCE7' : '#FFF7ED';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = bg;
      }}
    >
      {/* Flag */}
      {team.isoCode ? (
        <img
          src={`https://flagcdn.com/w40/${team.isoCode.toLowerCase()}.png`}
          width={22} height={15}
          style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
        />
      ) : (
        <div style={{
          width: 22, height: 15, borderRadius: 2, flexShrink: 0,
          background: isBlank ? '#F1F5F9' : '#FEF3C7',
          border: `1px dashed ${isBlank ? '#CBD5E1' : '#FCD34D'}`,
        }} />
      )}

      {/* Name */}
      <span style={{
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontSize: 11, fontWeight: hasReal ? 700 : 500,
        color: isBlank ? '#CBD5E1' : hasReal ? '#0F172A' : '#64748B',
        lineHeight: 1,
      }}>
        {hasReal ? team.name : team.label}
      </span>

      {/* Win indicator */}
      {isWinner && (
        <span style={{ color: '#16A34A', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>✓</span>
      )}
    </button>
  );
}

// ── Match card ───────────────────────────────────────────────
function MatchSlot({ match, onAdvance }: { match: BMatch; onAdvance: (w: 'home' | 'away') => void }) {
  const canAdvance = match.home.label !== '—' && match.away.label !== '—' && !match.winner;
  const won = !!match.winner;

  return (
    <div style={{
      width: COL_W,
      border: `1px solid ${won ? '#BBF7D0' : '#E2E8F0'}`,
      borderRadius: 10, overflow: 'hidden', background: '#fff',
      boxShadow: won
        ? '0 2px 10px rgba(22,163,74,0.14)'
        : '0 1px 5px rgba(15,23,42,0.07)',
    }}>
      <TeamRow
        team={match.home}
        isWinner={match.winner === 'home'} isLoser={match.winner === 'away'}
        canClick={canAdvance} onClick={() => onAdvance('home')}
      />
      <div style={{ height: 1, background: '#F1F5F9' }} />
      <TeamRow
        team={match.away}
        isWinner={match.winner === 'away'} isLoser={match.winner === 'home'}
        canClick={canAdvance} onClick={() => onAdvance('away')}
      />
    </div>
  );
}

// ── SVG Connector ────────────────────────────────────────────
function Connector({ fromRound, count, dir }: { fromRound: number; count: number; dir: 'left' | 'right' }) {
  return (
    <svg width={CONN_W} height={CONTAINER_H} style={{ flexShrink: 0, overflow: 'visible' }}>
      {Array.from({ length: count }, (_, i) => {
        const c0 = getCenter(fromRound, i * 2);
        const c1 = getCenter(fromRound, i * 2 + 1);
        const mid = (c0 + c1) / 2;
        const mx = CONN_W / 2;
        const x0 = dir === 'left' ? 0 : CONN_W;
        const x1 = dir === 'left' ? CONN_W : 0;
        return (
          <g key={i} stroke="#CBD5E1" strokeWidth={1.5} fill="none">
            <line x1={x0} y1={c0} x2={mx} y2={c0} />
            <line x1={x0} y1={c1} x2={mx} y2={c1} />
            <line x1={mx} y1={c0} x2={mx} y2={c1} />
            <line x1={mx} y1={mid} x2={x1} y2={mid} />
          </g>
        );
      })}
    </svg>
  );
}

// ── Round pill label ─────────────────────────────────────────
function RoundPill({ text, color }: { text: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
      <span style={{
        fontSize: 8, fontWeight: 800, letterSpacing: '0.08em',
        color, textTransform: 'uppercase',
        background: `${color}18`, padding: '3px 9px',
        borderRadius: 20, border: `1px solid ${color}35`,
        whiteSpace: 'nowrap',
      }}>
        {text}
      </span>
    </div>
  );
}

// ── Half bracket ─────────────────────────────────────────────
type RoundLabel = { text: string; color: string };

function HalfBracket({
  half, side, labels, onAdvance,
}: {
  half: HalfState;
  side: 'left' | 'right';
  labels: RoundLabel[];
  onAdvance: (ri: number, mi: number, w: 'home' | 'away') => void;
}) {
  const rounds  = side === 'left' ? half : [...half].reverse();
  const ordered = side === 'left' ? labels : [...labels].reverse();
  const ri      = (di: number) => side === 'left' ? di : 3 - di;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
      {rounds.map((matches, di) => (
        <div key={di} style={{ display: 'flex', alignItems: 'flex-start' }}>
          {di > 0 && side === 'left' && <Connector fromRound={ri(di) - 1} count={rounds[di - 1].length} dir="left" />}
          {di > 0 && side === 'right' && <Connector fromRound={ri(di)} count={matches.length} dir="right" />}

          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <RoundPill text={ordered[di].text} color={ordered[di].color} />

            <div style={{ position: 'relative', height: CONTAINER_H, width: COL_W }}>
              {(side === 'left' ? matches : [...matches].reverse()).map((match, dmi) => {
                const mi = side === 'left' ? dmi : matches.length - 1 - dmi;
                return (
                  <div key={match.id} style={{ position: 'absolute', top: getTop(ri(di), dmi) }}>
                    <MatchSlot
                      match={side === 'left' ? match : matches[mi]}
                      onAdvance={w => onAdvance(ri(di), mi, w)}
                    />
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

// ── Main component ────────────────────────────────────────────
export function Knockout() {
  const { t } = useTranslation();
  const [bracket, setBracket]         = useState<BracketState>(() => initBracket());
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [loading, setLoading]         = useState(true);
  const resetBase = useRef<BracketState | null>(null);

  useEffect(() => {
    apiGet<MatchDto[]>('/matches')
      .then(all => {
        const r32 = all
          .filter(m => m.stage === 'Rodada de 32')
          .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

        if (r32.length < 8) return;

        const toTeam = (tm: MatchDto['homeTeam'], fallback: Team): Team =>
          tm.code && tm.name
            ? { label: tm.code, name: tm.name, isoCode: tm.isoCode ?? undefined }
            : fallback;

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
        setBracket(fresh);
        setTeamsLoaded(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleAdvance(side: 'left' | 'right', ri: number, mi: number, w: 'home' | 'away') {
    setBracket(prev => advanceTeam(prev, side, ri, mi, w));
  }

  function handleReset() {
    setBracket(resetBase.current ?? initBracket());
  }

  const finalCenter = getCenter(3, 0);
  const finalTop    = finalCenter - H / 2;

  const LABELS: RoundLabel[] = [
    { text: t('knockout.r32'), color: '#6366F1' },
    { text: t('knockout.r16'), color: '#8B5CF6' },
    { text: t('knockout.qf'),  color: '#A855F7' },
    { text: t('knockout.sf'),  color: '#C084FC' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#111827' }}>{t('knockout.title')}</span>
            <span style={{ color: '#F97316' }}>{t('knockout.titleHighlight')}</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#6B7280' }}>
            {teamsLoaded
              ? 'Clique em uma seleção para avançá-la na chave'
              : t('knockout.subtitle')}
          </p>
        </div>
        <button
          onClick={handleReset}
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ↺ {t('knockout.resetBracket')}
        </button>
      </div>

      {/* TBD banner — shown only when teams couldn't be loaded */}
      {!loading && !teamsLoaded && (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400E' }}>
              {t('knockout.tbdTitle')}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#B45309' }}>
              {t('knockout.tbdDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12,
          padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 14,
        }}>
          Carregando chave eliminatória…
        </div>
      )}

      {/* Bracket */}
      {!loading && (
        <div style={{
          background: '#F8FAFC', borderRadius: 16,
          border: '1px solid #E2E8F0',
          padding: '20px 16px',
          overflowX: 'auto', overflowY: 'visible',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            minWidth: 'max-content', paddingTop: 4,
          }}>

            {/* Left half */}
            <HalfBracket
              half={bracket.left} side="left" labels={LABELS}
              onAdvance={(ri, mi, w) => handleAdvance('left', ri, mi, w)}
            />

            {/* SF → Final → SF connectors + Final/3rd column */}
            <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
              {/* Left SF connector */}
              <svg width={CONN_W} height={CONTAINER_H} style={{ flexShrink: 0, overflow: 'visible' }}>
                <line x1={0} y1={getCenter(3, 0)} x2={CONN_W} y2={getCenter(3, 0)} stroke="#CBD5E1" strokeWidth={1.5} />
              </svg>

              <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, width: COL_W + 16 }}>
                {/* Final label */}
                <RoundPill text={t('knockout.finalLabel')} color="#F97316" />

                <div style={{ position: 'relative', height: CONTAINER_H }}>
                  {/* Final */}
                  <div style={{ position: 'absolute', top: finalTop, left: 12 }}>
                    <MatchSlot
                      match={bracket.final}
                      onAdvance={w => setBracket(prev => ({ ...prev, final: { ...prev.final, winner: w } }))}
                    />
                  </div>

                  {/* 3rd Place */}
                  <div style={{ position: 'absolute', top: finalTop + H + 28, left: 12 }}>
                    <RoundPill text={t('knockout.thirdPlace')} color="#64748B" />
                    <MatchSlot
                      match={bracket.third}
                      onAdvance={w => setBracket(prev => ({ ...prev, third: { ...prev.third, winner: w } }))}
                    />
                  </div>
                </div>
              </div>

              {/* Right SF connector */}
              <svg width={CONN_W} height={CONTAINER_H} style={{ flexShrink: 0, overflow: 'visible' }}>
                <line x1={0} y1={getCenter(3, 0)} x2={CONN_W} y2={getCenter(3, 0)} stroke="#CBD5E1" strokeWidth={1.5} />
              </svg>
            </div>

            {/* Right half */}
            <HalfBracket
              half={bracket.right} side="right" labels={LABELS}
              onAdvance={(ri, mi, w) => handleAdvance('right', ri, mi, w)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
