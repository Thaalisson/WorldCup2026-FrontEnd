import { useEffect, useState } from 'react';
import type { Match } from '../types';
import { formatBrazilDate, formatBrazilTime, isMatchLocked } from '../utils/timezone';
import { Lock, CheckCircle, Clock } from 'lucide-react';

function useCountdown(kickoffAt: string) {
  function calc() {
    const diff = new Date(kickoffAt.endsWith('Z') ? kickoffAt : kickoffAt + 'Z').getTime() - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return { d, h, m, urgent: diff < 7200000 }; // urgent < 2h
  }
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 30000);
    return () => clearInterval(id);
  }, [kickoffAt]);
  return t;
}

type Props = {
  match: Match;
  home: number;
  away: number;
  isSaved: boolean;
  isDirty: boolean;
  onChange: (home: number, away: number) => void;
  onBlur?: () => void;
};

function FlagImg({ isoCode, name }: { isoCode?: string; name: string }) {
  if (!isoCode) return <div style={{ width: 32, height: 22, background: '#E5E7EB', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#6B7280' }}>?</div>;
  return (
    <img
      src={`https://flagcdn.com/w40/${isoCode.toLowerCase()}.png`}
      alt={name}
      width={32}
      height={22}
      style={{ borderRadius: 4, objectFit: 'cover', display: 'block' }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

export function MatchCard({ match, home, away, isSaved, isDirty, onChange, onBlur }: Props) {
  const locked = match.isFinished || isMatchLocked(match.kickoffAt);
  const stageLabel = match.groupName ? `GRUPO ${match.groupName}` : match.stage?.toUpperCase();
  const dateStr = formatBrazilDate(match.kickoffAt);
  const timeStr = formatBrazilTime(match.kickoffAt);
  const countdown = useCountdown(match.kickoffAt);

  const inputStyle: React.CSSProperties = {
    width: 38, height: 38,
    background: '#FFFFFF',
    border: `1px solid ${isDirty ? '#F9731660' : '#E5E7EB'}`,
    borderRadius: 8,
    color: '#111827',
    fontWeight: 800,
    fontSize: 16,
    textAlign: 'center',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  const savedIndicator = isSaved && !isDirty;

  return (
    <div
      className="card"
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderColor: savedIndicator ? '#22C55E20' : isDirty ? '#F9731630' : '#E5E7EB',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Stage + time */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
          padding: '3px 8px', borderRadius: 20,
          background: '#D9770615', color: '#D97706',
          border: '1px solid #D9770630',
        }}>
          {stageLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {savedIndicator && <CheckCircle size={12} color="#22C55E" />}
          <span style={{ fontSize: 10, color: '#6B7280' }}>{dateStr} · {timeStr}</span>
          {!locked && !match.isFinished && countdown && (
            <span className={`countdown-chip ${countdown.urgent ? 'urgent' : 'normal'}`}>
              <Clock size={8} />
              {countdown.d > 0
                ? `${countdown.d}d ${countdown.h}h`
                : countdown.h > 0
                ? `${countdown.h}h ${countdown.m}min`
                : `${countdown.m}min`}
            </span>
          )}
        </div>
      </div>

      {/* Teams + score inputs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Home */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <FlagImg isoCode={match.homeTeam.isoCode} name={match.homeTeam.name} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#111827', textAlign: 'center', lineHeight: 1.2 }}>
            {match.homeTeam.name}
          </span>
        </div>

        {/* Center */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {match.isFinished ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 36, height: 36, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#111827' }}>{match.homeScore}</div>
              <span style={{ color: '#D1D5DB', fontWeight: 700 }}>–</span>
              <div style={{ width: 36, height: 36, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#111827' }}>{match.awayScore}</div>
            </div>
          ) : locked ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#D1D5DB' }}>
              <Lock style={{ width: 14, height: 14 }} />
              <span style={{ fontSize: 9, letterSpacing: '0.08em' }}>BLOQ.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" min={0} value={home}
                onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0), away)}
                style={inputStyle}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#F97316'}
                onBlur={e => {
                  (e.target as HTMLInputElement).style.borderColor = isDirty ? '#F9731660' : '#E5E7EB';
                  onBlur?.();
                }}
              />
              <span style={{ color: '#D1D5DB', fontWeight: 700, fontSize: 12 }}>×</span>
              <input
                type="number" min={0} value={away}
                onChange={e => onChange(home, Math.max(0, parseInt(e.target.value) || 0))}
                style={inputStyle}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#F97316'}
                onBlur={e => {
                  (e.target as HTMLInputElement).style.borderColor = isDirty ? '#F9731660' : '#E5E7EB';
                  onBlur?.();
                }}
              />
            </div>
          )}
        </div>

        {/* Away */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <FlagImg isoCode={match.awayTeam.isoCode} name={match.awayTeam.name} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#111827', textAlign: 'center', lineHeight: 1.2 }}>
            {match.awayTeam.name}
          </span>
        </div>
      </div>

      {/* Saved tag for locked+saved matches */}
      {locked && isSaved && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 10, color: '#22C55E', fontWeight: 700 }}>
          <CheckCircle size={11} /> Palpite salvo
        </div>
      )}
    </div>
  );
}
