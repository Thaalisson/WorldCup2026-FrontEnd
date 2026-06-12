import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { apiGet } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Match, RankingItem, FeedEvent, RankingEvolution, ChampionPrediction, Prediction } from '../types';
import { formatBrazilDate, formatBrazilTime, isMatchLocked } from '../utils/timezone';
import {
  Trophy, Target, TrendingUp, Star, ChevronRight, Activity,
  Users, CheckCircle, Circle, AlertCircle, Zap, Award, Clock, BarChart2,
} from 'lucide-react';

type Props = {
  poolId?: string;
  onGoToJogos?: () => void;
  onGoToPrecopa?: () => void;
  onGoToGroups?: () => void;
  onGoToBoloes?: () => void;
};

function FlagImg({ isoCode, name, size = 40 }: { isoCode?: string; name: string; size?: number }) {
  if (!isoCode) {
    return (
      <div style={{
        width: Math.round(size * 1.5), height: size,
        background: '#E5E7EB', borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.4), color: '#9CA3AF',
      }}>⚽</div>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/w${size * 2}/${isoCode.toLowerCase()}.png`}
      alt={name}
      style={{ width: Math.round(size * 1.5), height: size, borderRadius: 4, objectFit: 'cover', display: 'block' }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

function useMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

function StatPill({
  icon, label, value, sub, color, bg, onClick,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string;
  color: string; bg: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="stat-card"
      style={{ cursor: onClick ? 'pointer' : 'default', flexDirection: 'column', gap: 10, padding: 16 }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.borderColor = color + '50'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.borderColor = '#E5E7EB'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="stat-icon" style={{ width: 32, height: 32, background: bg, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
          {icon}
        </div>
        <p className="stat-label" style={{ margin: 0, fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>{label}</p>
      </div>
      <div>
        <p className="stat-value" style={{ margin: 0, fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
        {sub && <p className="stat-sub" style={{ margin: '3px 0 0', fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</p>}
      </div>
    </div>
  );
}

function timeAgo(isoString: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const s = isoString.endsWith('Z') ? isoString : isoString + 'Z';
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (diff < 60) return t('common.now');
  if (diff < 3600) return t('common.minutesAgo', { count: Math.floor(diff / 60) });
  if (diff < 86400) return t('common.hoursAgo', { count: Math.floor(diff / 3600) });
  return t('common.daysAgo', { count: Math.floor(diff / 86400) });
}

function SkeletonStatPill() {
  return (
    <div className="stat-card" style={{ flexDirection: 'column', gap: 10, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 9 }} />
        <div className="skeleton" style={{ width: 72, height: 10 }} />
      </div>
      <div>
        <div className="skeleton" style={{ width: 56, height: 28, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 100, height: 9, marginTop: 6 }} />
      </div>
    </div>
  );
}

function useNextMatchCountdown(kickoffAt: string | undefined) {
  function calc() {
    if (!kickoffAt) return null;
    const diff = new Date(kickoffAt.endsWith('Z') ? kickoffAt : kickoffAt + 'Z').getTime() - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return { d, h, m };
  }
  const [t, setT] = useState(calc);
  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 30000);
    return () => clearInterval(id);
  }, [kickoffAt]);
  return t;
}

const TOURNAMENT_START = new Date('2026-06-11T18:00:00Z');

function useCopaCDDown() {
  function calc() {
    const diff = TOURNAMENT_START.getTime() - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s };
  }
  const [t, setT] = useState(calc);
  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function FootballPitch() {
  return (
    <svg
      viewBox="-3 -1 111 70"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.22 }}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="pitchStripes" x="0" y="0" width="13.125" height="68" patternUnits="userSpaceOnUse">
          <rect width="6.5625" height="68" fill="#2E8B47" />
          <rect x="6.5625" width="6.5625" height="68" fill="#267A3E" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="105" height="68" fill="url(#pitchStripes)" />
      <rect x="0" y="0" width="105" height="68" fill="none" stroke="white" strokeWidth="0.6" />
      <line x1="52.5" y1="0" x2="52.5" y2="68" stroke="white" strokeWidth="0.5" />
      <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="white" strokeWidth="0.5" />
      <circle cx="52.5" cy="34" r="0.7" fill="white" />
      {/* Left penalty area */}
      <rect x="0" y="13.84" width="16.5" height="40.32" fill="none" stroke="white" strokeWidth="0.5" />
      <rect x="0" y="24.84" width="5.5" height="18.32" fill="none" stroke="white" strokeWidth="0.5" />
      <circle cx="11" cy="34" r="0.6" fill="white" />
      <path d="M 16.5 27.4 A 9.15 9.15 0 0 1 16.5 40.6" fill="none" stroke="white" strokeWidth="0.5" />
      {/* Right penalty area */}
      <rect x="88.5" y="13.84" width="16.5" height="40.32" fill="none" stroke="white" strokeWidth="0.5" />
      <rect x="99.5" y="24.84" width="5.5" height="18.32" fill="none" stroke="white" strokeWidth="0.5" />
      <circle cx="94" cy="34" r="0.6" fill="white" />
      <path d="M 88.5 27.4 A 9.15 9.15 0 0 0 88.5 40.6" fill="none" stroke="white" strokeWidth="0.5" />
      {/* Goals */}
      <rect x="-2.5" y="30.34" width="2.5" height="7.32" fill="none" stroke="white" strokeWidth="0.5" />
      <rect x="105" y="30.34" width="2.5" height="7.32" fill="none" stroke="white" strokeWidth="0.5" />
      {/* Corner arcs */}
      <path d="M 0 2.5 A 2.5 2.5 0 0 1 2.5 0" fill="none" stroke="white" strokeWidth="0.5" />
      <path d="M 102.5 0 A 2.5 2.5 0 0 1 105 2.5" fill="none" stroke="white" strokeWidth="0.5" />
      <path d="M 0 65.5 A 2.5 2.5 0 0 0 2.5 68" fill="none" stroke="white" strokeWidth="0.5" />
      <path d="M 102.5 68 A 2.5 2.5 0 0 0 105 65.5" fill="none" stroke="white" strokeWidth="0.5" />
    </svg>
  );
}

export function Dashboard({ poolId, onGoToJogos, onGoToPrecopa, onGoToGroups, onGoToBoloes }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useMobile();
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [evolution, setEvolution] = useState<RankingEvolution[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [champion, setChampion] = useState<ChampionPrediction | null>(null);
  const [loadingR, setLoadingR] = useState(false);
  const [loadingM, setLoadingM] = useState(true);

  const EVENT_STYLE = {
    1: { bg: '#22C55E18', color: '#22C55E', label: t('dashboard.eventExact'), icon: '🎯' },
    2: { bg: '#F9731618', color: '#F97316', label: t('dashboard.eventCorrect'), icon: '✓' },
    3: { bg: '#6B728018', color: '#6B7280', label: t('dashboard.eventWrong'), icon: '○' },
    4: { bg: '#3B82F618', color: '#3B82F6', label: t('dashboard.eventPartial'), icon: '≈' },
  } as const;

  useEffect(() => {
    apiGet<Match[]>('/matches')
      .then(setMatches)
      .catch(() => {})
      .finally(() => setLoadingM(false));
  }, []);

  useEffect(() => {
    if (!poolId) return;
    setLoadingR(true);
    Promise.all([
      apiGet<RankingItem[]>(`/pools/${poolId}/ranking`),
      apiGet<FeedEvent[]>(`/pools/${poolId}/feed`),
      apiGet<RankingEvolution[]>(`/pools/${poolId}/ranking-evolution`),
      apiGet<Prediction[]>(`/predictions/me?poolId=${poolId}`),
      apiGet<ChampionPrediction | null>(`/champion-predictions/me?poolId=${poolId}`).catch(() => null),
    ])
      .then(([rankData, feedData, evoData, predData, champData]) => {
        setRanking(rankData);
        setFeedEvents(feedData);
        setEvolution(evoData);
        setPredictions(predData);
        setChampion(champData);
      })
      .catch(() => {})
      .finally(() => setLoadingR(false));
  }, [poolId]);

  const realMatches = matches.filter(m => m.homeTeam.name !== 'A Definir');
  const upcoming = realMatches
    .filter(m => !m.isFinished && !isMatchLocked(m.kickoffAt))
    .sort((a, b) => new Date(a.kickoffAt + 'Z').getTime() - new Date(b.kickoffAt + 'Z').getTime());

  const nextMatch = upcoming[0];
  const predictedIds = new Set(predictions.map(p => p.matchId));
  const pendingCount = upcoming.filter(m => !predictedIds.has(m.id)).length;
  const totalMatches = realMatches.length;
  const doneCount = predictions.length;
  const donePct = totalMatches > 0 ? Math.round((doneCount / totalMatches) * 100) : 0;

  const myStats = poolId && ranking.length > 0
    ? (ranking.find(r => r.userId === user?.id) ?? null)
    : null;

  const hasPool = !!poolId;
  const hasChampion = !!champion?.championTeamName;
  const championName = champion?.championTeamName ?? null;
  const championCode = championName ? championName.slice(0, 3).toUpperCase() : '?';

  const chartData = evolution.length > 0
    ? evolution.map(e => ({ r: e.round, pts: e.totalPoints }))
    : null;

  const nextMatchCountdown = useNextMatchCountdown(nextMatch?.kickoffAt);
  const copaCountdown = useCopaCDDown();

  const checklist = [
    {
      done: hasChampion,
      label: t('dashboard.checklistChampion'),
      sub: hasChampion ? championName! : t('dashboard.checklistChampionSub'),
      action: onGoToPrecopa,
      urgent: !hasChampion,
    },
    {
      done: doneCount > 0 && doneCount >= totalMatches && totalMatches > 0,
      label: t('dashboard.checklistBets'),
      sub: hasPool ? t('dashboard.checklistBetsSub', { done: doneCount, total: totalMatches || '?' }) : t('common.selectPool'),
      action: onGoToJogos,
      urgent: pendingCount > 20,
    },
    {
      done: false,
      label: t('dashboard.checklistGroups'),
      sub: t('dashboard.checklistGroupsSub'),
      action: onGoToGroups,
      urgent: false,
    },
    {
      done: false,
      label: t('dashboard.checklistInvite'),
      sub: t('dashboard.checklistInviteSub'),
      action: onGoToBoloes,
      urgent: false,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, color: '#6B7280', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('dashboard.welcome')}</p>
          <h1 style={{ margin: '2px 0 0', fontSize: isMobile ? 24 : 30, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px', lineHeight: 1 }}>
            <span style={{ color: '#111827' }}>{user?.name?.split(' ')[0].toUpperCase() ?? 'JOGADOR'}</span>
          </h1>
        </div>
        {!isMobile && (
          <div style={{ background: '#D9770610', border: '1px solid #D9770630', borderRadius: 10, padding: '8px 16px', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{t('dashboard.tournamentLabel')}</p>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#D97706', letterSpacing: '0.06em' }}>{t('dashboard.tournamentName')}</p>
          </div>
        )}
        {isMobile && (
          <div style={{ background: '#F9731612', border: '1px solid #F9731625', borderRadius: 8, padding: '6px 10px', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 9, color: '#F97316', fontWeight: 800, letterSpacing: '0.06em' }}>⚽ Copa 2026</p>
          </div>
        )}
      </div>

      {/* ── 5 Stat pills ── */}
      <div
        className="stat-cards-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}
      >
        {loadingR && hasPool ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonStatPill key={i} />)
        ) : (
          <>
            <StatPill icon={<Star size={17} />} label={t('dashboard.statScore')}
              value={hasPool ? (myStats?.totalPoints ?? 0) : '—'}
              sub={myStats ? t('dashboard.exactScores', { count: myStats?.exactScores ?? 0 }) : (hasPool ? t('dashboard.noPoints') : t('common.selectPool'))}
              color="#D97706" bg="#D9770610" />
            <StatPill icon={<Trophy size={17} />} label={t('dashboard.statPosition')}
              value={myStats ? `${myStats.position}º` : '—'}
              sub={myStats && ranking.length > 0 ? t('dashboard.rankingOf', { count: ranking.length }) : t('dashboard.noRanking')}
              color="#F97316" bg="#F9731610" />
            <StatPill icon={<Target size={17} />} label={t('dashboard.statBets')}
              value={hasPool ? `${doneCount}` : '—'}
              sub={hasPool && totalMatches > 0 ? t('dashboard.betsOf', { total: totalMatches || '?', pct: donePct }) : t('common.selectPool')}
              color="#22C55E" bg="#22C55E10" onClick={onGoToJogos} />
            <StatPill icon={<AlertCircle size={17} />} label={t('dashboard.statPending')}
              value={hasPool ? pendingCount : '—'}
              sub={hasPool ? (pendingCount > 0 ? t('dashboard.pendingOpen') : t('dashboard.allDone')) : t('common.selectPool')}
              color={pendingCount > 0 ? '#F97316' : '#22C55E'} bg={pendingCount > 0 ? '#F9731610' : '#22C55E10'}
              onClick={onGoToJogos} />
            <StatPill icon={<Award size={17} />} label={t('dashboard.statChampion')}
              value={hasPool ? championCode : '—'}
              sub={hasPool ? (hasChampion ? championName! : t('dashboard.noChampion')) : t('common.selectPool')}
              color={hasChampion ? '#A855F7' : '#F97316'} bg={hasChampion ? '#A855F710' : '#F9731610'}
              onClick={onGoToPrecopa} />
          </>
        )}
      </div>

      {/* ── Pre-Copa Countdown ── */}
      {copaCountdown && (isMobile ? (
        /* Mobile: compact single-row countdown */
        <div style={{
          background: 'linear-gradient(135deg, #1A3A5C 0%, #1E4D7B 100%)',
          borderRadius: 14, padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          boxShadow: '0 4px 20px rgba(26,58,92,0.3)',
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>🏆 {t('dashboard.copaTitle')}</p>
            <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {String(copaCountdown.d).padStart(2,'0')}d {String(copaCountdown.h).padStart(2,'0')}h {String(copaCountdown.m).padStart(2,'0')}m
            </p>
          </div>
          <button onClick={hasPool ? onGoToJogos : onGoToBoloes} style={{
            flexShrink: 0, padding: '9px 14px', borderRadius: 9,
            background: '#F97316', border: 'none', color: '#fff',
            fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer',
          }}>
            {hasPool ? t('dashboard.makeBets') : t('dashboard.createPoolFirst')}
          </button>
        </div>
      ) : (
        /* Desktop: full countdown banner */
        <div style={{
          background: 'linear-gradient(135deg, #1A3A5C 0%, #1E4D7B 100%)',
          borderRadius: 16, padding: '20px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 24px rgba(26,58,92,0.25)', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{t('dashboard.copaTitle')}</p>
            <h2 style={{ margin: '4px 0 2px', fontSize: 20, fontWeight: 900, color: '#fff', fontStyle: 'italic' }}>{t('dashboard.copaCountdownTitle')}</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{t('dashboard.copaCountdownSub')}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { val: copaCountdown.d, label: t('common.days') },
              { val: copaCountdown.h, label: t('common.hours') },
              { val: copaCountdown.m, label: t('common.min') },
              { val: copaCountdown.s, label: t('common.sec') },
            ].map(({ val, label }) => (
              <div key={label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 14px', minWidth: 52 }}>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{String(val).padStart(2,'0')}</p>
                <p style={{ margin: '4px 0 0', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
              </div>
            ))}
          </div>
          <button onClick={hasPool ? onGoToJogos : onGoToBoloes} style={{
            padding: '10px 22px', borderRadius: 10, background: '#F97316', border: 'none',
            color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: '0.1em',
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EA580C')}
            onMouseLeave={e => (e.currentTarget.style.background = '#F97316')}>
            {hasPool ? t('dashboard.makeBets') : t('dashboard.createPoolFirst')}
          </button>
        </div>
      ))}

      {/* ── Hero match + Checklist ── */}
      <div
        className="dashboard-mid-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}
      >
        {/* Next Match Hero — green pitch card */}
        <div
          style={{
            position: 'relative', overflow: 'hidden', padding: isMobile ? 16 : 28,
            background: 'linear-gradient(135deg, #1A4731 0%, #236038 50%, #1C5232 100%)',
            borderRadius: 16,
            boxShadow: '0 4px 24px rgba(26,71,49,0.25)',
          }}
        >
          <FootballPitch />
          {/* Edge vignette */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.25) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.25) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 12 : 24 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>{t('dashboard.nextMatch')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {nextMatch && nextMatchCountdown && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
                    padding: '3px 10px', borderRadius: 20,
                    background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.9)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Clock size={9} />
                    {nextMatchCountdown.d > 0
                      ? t('common.countdownDaysHours', { d: nextMatchCountdown.d, h: nextMatchCountdown.h })
                      : nextMatchCountdown.h > 0
                      ? t('common.countdownHoursMin', { h: nextMatchCountdown.h, m: nextMatchCountdown.m })
                      : t('common.countdownMin', { m: nextMatchCountdown.m })}
                  </span>
                )}
                {nextMatch?.groupName && (
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', padding: '3px 10px', borderRadius: 20, background: 'rgba(217,119,6,0.3)', color: '#FCD34D', border: '1px solid rgba(217,119,6,0.5)' }}>
                    {t('dashboard.groupBadge', { name: nextMatch.groupName })}
                  </span>
                )}
              </div>
            </div>

          {loadingM ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'rgba(255,255,255,0.6)', fontSize: 13, padding: '48px 0' }}>
              <div className="spinner" style={{ width: 18, height: 18, borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'transparent' }} /> {t('common.loadingMatches')}
            </div>
          ) : nextMatch ? (
            <>
              {/* Teams */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 20, marginBottom: isMobile ? 12 : 24 }}>
                {/* Home */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
                  <div style={{ padding: isMobile ? 3 : 4, background: 'rgba(255,255,255,0.12)', borderRadius: 8 }}>
                    <FlagImg isoCode={nextMatch.homeTeam.isoCode} name={nextMatch.homeTeam.name} size={isMobile ? 36 : 48} />
                  </div>
                  <p style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.04em', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    {nextMatch.homeTeam.code || nextMatch.homeTeam.name.slice(0, 3).toUpperCase()}
                  </p>
                  {!isMobile && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1.3 }}>{nextMatch.homeTeam.name}</p>}
                </div>

                {/* Center */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 6 : 10, flexShrink: 0 }}>
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: isMobile ? 10 : 14, padding: isMobile ? '8px 14px' : '12px 20px' }}>
                    <span style={{ fontSize: isMobile ? 16 : 20, fontWeight: 900, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.15em' }}>VS</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={9} color="rgba(255,255,255,0.6)" />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                      {formatBrazilDate(nextMatch.kickoffAt)} · {formatBrazilTime(nextMatch.kickoffAt)}
                    </span>
                  </div>
                </div>

                {/* Away */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
                  <div style={{ padding: isMobile ? 3 : 4, background: 'rgba(255,255,255,0.12)', borderRadius: 8 }}>
                    <FlagImg isoCode={nextMatch.awayTeam.isoCode} name={nextMatch.awayTeam.name} size={isMobile ? 36 : 48} />
                  </div>
                  <p style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.04em', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    {nextMatch.awayTeam.code || nextMatch.awayTeam.name.slice(0, 3).toUpperCase()}
                  </p>
                  {!isMobile && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1.3 }}>{nextMatch.awayTeam.name}</p>}
                </div>
              </div>

              {/* Prediction nudge */}
              {hasPool && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(4px)',
                }}>
                  <Target size={13} color="#FCD34D" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{t('dashboard.notBetYet')}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#FCD34D' }}>{t('dashboard.betNow')}</span>
                </div>
              )}

              <button
                onClick={hasPool ? onGoToJogos : onGoToBoloes}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 20px', border: 'none', borderRadius: 10,
                  background: '#F97316', color: '#FFFFFF',
                  fontWeight: 800, fontSize: 12, letterSpacing: '0.1em',
                  cursor: 'pointer', transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#EA580C')}
                onMouseLeave={e => (e.currentTarget.style.background = '#F97316')}
              >
                <Zap size={14} /> {hasPool ? t('dashboard.makeBetNow') : t('dashboard.createPoolFirst')}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 10 }}>
              <div style={{ fontSize: 44, opacity: 0.4 }}>⚽</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{t('dashboard.noMatchAvailable')}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{t('dashboard.allBetsDone')}</p>
            </div>
          )}
          </div>{/* /zIndex wrapper */}
        </div>{/* /green hero card */}

        {/* Action Checklist */}
        <div className="card" style={{ padding: 20 }}>
          <p className="section-label">{t('dashboard.checklistTitle')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {checklist.map((item, i) => (
              <div
                key={i}
                onClick={item.action}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: item.done ? '#22C55E08' : (item.urgent ? '#F9731608' : '#F3F4F6'),
                  border: `1px solid ${item.done ? '#22C55E25' : (item.urgent ? '#F9731625' : '#E5E7EB')}`,
                  cursor: item.action ? 'pointer' : 'default',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => {
                  if (item.action) (e.currentTarget as HTMLDivElement).style.borderColor = item.done ? '#22C55E50' : '#F9731640';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = item.done ? '#22C55E25' : (item.urgent ? '#F9731625' : '#E5E7EB');
                }}
              >
                {item.done
                  ? <CheckCircle size={15} color="#22C55E" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <Circle size={15} color={item.urgent ? '#F97316' : '#9CA3AF'} style={{ flexShrink: 0, marginTop: 1 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 12, fontWeight: 700,
                    color: item.done ? '#9CA3AF' : '#111827',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}>
                    {item.label}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9CA3AF' }}>{item.sub}</p>
                </div>
                {item.action && !item.done && (
                  <ChevronRight size={13} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Progress + Chart + Ranking ── */}
      <div
        className="dashboard-bot-grid"
        style={{ display: 'grid', gridTemplateColumns: '260px 1fr 260px', gap: 16, alignItems: 'start' }}
      >
        {/* Prediction Progress */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <BarChart2 size={13} color="#F97316" />
            <p className="section-label" style={{ margin: 0 }}>{t('dashboard.progressTitle')}</p>
          </div>

          {!hasPool ? (
            <p style={{ fontSize: 13, color: '#6B7280' }}>{t('dashboard.noPoolProgress')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{t('dashboard.betsCompleted')}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#F97316' }}>{doneCount}/{totalMatches || '?'}</span>
                </div>
                <div style={{ height: 7, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${donePct}%`,
                    background: 'linear-gradient(90deg, #F97316, #22C55E)',
                    borderRadius: 4,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 10, color: '#9CA3AF' }}>{t('dashboard.completePct', { pct: donePct })}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trophy size={12} color={hasChampion ? '#22C55E' : '#F97316'} />
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{t('dashboard.statChampion')}</span>
                  </div>
                  {hasChampion ? (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', background: '#22C55E10', padding: '2px 8px', borderRadius: 20 }}>
                      ✓ {championName}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#F97316', background: '#F9731610', padding: '2px 8px', borderRadius: 20 }}>
                      {t('dashboard.pending')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={12} color="#6B7280" />
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{t('nav.groups')}</span>
                  </div>
                  <button
                    onClick={onGoToGroups}
                    style={{ fontSize: 10, fontWeight: 700, color: '#F97316', background: 'none', border: 'none', cursor: onGoToGroups ? 'pointer' : 'default', padding: 0 }}
                  >
                    {t('dashboard.groupsLink')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Evolution Chart — hidden on mobile (needs width) */}
        <div className="card dashboard-chart-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p className="section-label" style={{ margin: 0 }}>{t('dashboard.evolutionTitle')}</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF' }}>{t('dashboard.evolutionSub')}</p>
            </div>
            <span style={{ fontSize: 11, color: '#F97316', fontWeight: 700, flexShrink: 0 }}>2026</span>
          </div>

          {!hasPool ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, gap: 8, color: '#6B7280' }}>
              <TrendingUp size={30} opacity={0.25} />
              <p style={{ margin: 0, fontSize: 12 }}>{t('dashboard.noPoolChart')}</p>
            </div>
          ) : !chartData ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, gap: 8, color: '#6B7280' }}>
              <TrendingUp size={30} opacity={0.25} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{t('dashboard.waitingGames')}</p>
              <p style={{ margin: 0, fontSize: 11 }}>{t('dashboard.copaStarts')}</p>
              {onGoToJogos && (
                <button onClick={onGoToJogos} style={{ fontSize: 11, padding: '6px 16px', background: '#F9731610', border: '1px solid #F9731630', borderRadius: 8, color: '#F97316', fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                  {t('dashboard.makeBetsLink')}
                </button>
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="skyGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="r" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#6B7280' }}
                  itemStyle={{ color: '#F97316' }}
                />
                <Area type="monotone" dataKey="pts" stroke="#F97316" strokeWidth={2} fill="url(#skyGrad2)" dot={{ fill: '#F97316', strokeWidth: 0, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ranking Mini */}
        <div className="card" style={{ padding: 20 }}>
          <p className="section-label">{t('dashboard.rankingMini')}</p>

          {!hasPool ? (
            <p style={{ fontSize: 13, color: '#6B7280' }}>{t('common.selectPool')}</p>
          ) : loadingR ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280', fontSize: 13 }}>
              <div className="spinner" style={{ width: 16, height: 16 }} /> {t('common.loading')}
            </div>
          ) : ranking.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '12px 0', color: '#6B7280' }}>
              <Users size={28} opacity={0.25} style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{t('dashboard.onlyYou')}</p>
              <p style={{ margin: '4px 0 14px', fontSize: 11 }}>{t('dashboard.inviteFriends')}</p>
              {onGoToBoloes && (
                <button onClick={onGoToBoloes} style={{ fontSize: 11, padding: '8px 16px', background: '#F9731615', border: '1px solid #F9731635', borderRadius: 8, color: '#F97316', fontWeight: 700, cursor: 'pointer' }}>
                  {t('dashboard.inviteBtn')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {ranking.slice(0, 5).map((item, i) => {
                  const isMe = item.userId === user?.id;
                  return (
                    <div
                      key={item.userId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: isMe ? '8px 8px' : '8px 2px',
                        borderBottom: i < Math.min(4, ranking.length - 1) ? '1px solid #E5E7EB' : 'none',
                        background: isMe ? '#F9731608' : 'none',
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ width: 18, textAlign: 'center', fontSize: i < 3 ? 14 : 10, color: i < 3 ? undefined : '#6B7280', fontWeight: 700, flexShrink: 0 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${item.position}`}
                      </span>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: i === 0 ? 'linear-gradient(135deg,#D97706,#F97316)' : (isMe ? '#F9731630' : '#E5E7EB'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: i === 0 ? '#F9FAFB' : (isMe ? '#F97316' : '#6B7280') }}>
                        {item.userName.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: isMe ? 800 : 600, color: i === 0 ? '#D97706' : (isMe ? '#F97316' : '#111827'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.userName}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: i === 0 ? '#D97706' : '#22C55E', flexShrink: 0 }}>
                        {item.totalPoints}
                      </span>
                    </div>
                  );
                })}
              </div>
              {ranking.length === 1 && onGoToBoloes && (
                <button onClick={onGoToBoloes} style={{ width: '100%', marginTop: 12, fontSize: 11, padding: '8px', background: '#F9731615', border: '1px solid #F9731635', borderRadius: 8, color: '#F97316', fontWeight: 700, cursor: 'pointer' }}>
                  {t('dashboard.inviteBtn2')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Activity Feed — full width ── */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={13} color="#F97316" />
            <p className="section-label" style={{ margin: 0 }}>{t('dashboard.activityTitle')}</p>
          </div>
          {feedEvents.length > 0 && (
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>{t('dashboard.lastEvents', { count: Math.min(feedEvents.length, 10) })}</span>
          )}
        </div>

        {!hasPool ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 8, color: '#6B7280' }}>
            <Activity size={32} opacity={0.2} />
            <p style={{ margin: 0, fontSize: 13 }}>{t('dashboard.noPoolActivity')}</p>
          </div>
        ) : feedEvents.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 0', gap: 10 }}>
            <Activity size={36} color="#F97316" opacity={0.2} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{t('dashboard.noScores')}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 1.6 }}>
              {t('dashboard.scoresDesc')}<br />
              {t('dashboard.worldCupStarts')}
            </p>
            {onGoToJogos && (
              <button onClick={onGoToJogos} style={{ marginTop: 4, fontSize: 12, padding: '9px 22px', background: '#F9731612', border: '1px solid #F9731630', borderRadius: 9, color: '#F97316', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
                {t('dashboard.makeBetsNow')}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            {feedEvents.slice(0, 10).map(evt => {
              const ev = EVENT_STYLE[evt.eventType as keyof typeof EVENT_STYLE] ?? EVENT_STYLE[3];
              return (
                <div key={evt.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 9,
                  background: '#F3F4F6', border: '1px solid #E5E7EB',
                }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: ev.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 15 }}>{ev.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {evt.userName}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {evt.matchLabel}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                      {evt.predictionLabel && (
                        <span style={{ fontSize: 10, color: '#374151', fontWeight: 600 }}>
                          {t('dashboard.feedYourGuess', { score: evt.predictionLabel })}
                        </span>
                      )}
                      <span style={{
                        fontSize: 9, fontWeight: 800, color: ev.color, background: ev.bg,
                        padding: '1px 6px', borderRadius: 6, whiteSpace: 'nowrap', letterSpacing: 0.3,
                      }}>
                        {ev.icon} {ev.label}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: ev.color }}>+{evt.points}</p>
                    <p style={{ margin: 0, fontSize: 9, color: '#9CA3AF' }}>{timeAgo(evt.occurredAt, t)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
