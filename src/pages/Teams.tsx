import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../services/api';
import type { Team, GroupStanding } from '../types';

function FlagImg({ isoCode, name }: { isoCode?: string; name: string }) {
  if (!isoCode) return (
    <div style={{ width: 26, height: 18, background: '#E5E7EB', borderRadius: 3, flexShrink: 0 }} />
  );
  return (
    <img
      src={`https://flagcdn.com/w40/${isoCode.toLowerCase()}.png`}
      alt={name}
      style={{ width: 26, height: 18, borderRadius: 3, objectFit: 'cover', display: 'block', flexShrink: 0 }}
      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
    />
  );
}

function GroupCard({ group, rows }: { group: string; rows: GroupStanding[] }) {
  const { t } = useTranslation();
  const hasData = rows.some(r => r.played > 0);

  return (
    <div id={`grupo-${group}`} className="card" style={{ padding: 0, overflow: 'hidden' }}>

      {/* ── Card header ── */}
      <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{t('groups.classification')}</span>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
            padding: '2px 8px', borderRadius: 20,
            background: '#F9731615', color: '#F97316', border: '1px solid #F9731630',
          }}>
            GRUPO {group}
          </span>
        </div>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9CA3AF' }}>
          {t('groups.worldCup')}
        </p>
      </div>

      {/* ── Table ── */}
      <div className="table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#FAFAFA' }}>
              <th style={th(28, 'center')}>{t('groups.colPos')}</th>
              <th style={{ ...th(undefined, 'left'), paddingLeft: 4, minWidth: 130 }}>{t('groups.colTeam')}</th>
              <th style={th(36)}>{t('groups.colPlayed')}</th>
              <th style={th(36, 'center', '#22C55E')}>{t('groups.colWins')}</th>
              <th style={th(36)}>{t('groups.colDraws')}</th>
              <th style={th(36, 'center', '#EF4444')}>{t('groups.colLosses')}</th>
              <th style={th(36)}>{t('groups.colGD')}</th>
              <th style={th(40, 'center', '#F97316')}>{t('groups.colPoints')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((team, i) => {
              const qualified = i < 2;
              return (
                <tr
                  key={team.teamId}
                  style={{
                    borderTop: i > 0 ? '1px solid #F3F4F6' : 'none',
                    background: qualified && hasData ? '#22C55E04' : 'transparent',
                  }}
                >
                  {/* Position */}
                  <td style={{ textAlign: 'center', padding: '10px 4px', width: 28 }}>
                    {qualified ? (
                      <div style={{
                        width: 20, height: 20,
                        background: '#22C55E18', border: '1px solid #22C55E40',
                        color: '#22C55E', borderRadius: '50%',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800,
                      }}>
                        {i + 1}
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>{i + 1}</span>
                    )}
                  </td>

                  {/* Team name + flag */}
                  <td style={{ padding: '10px 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FlagImg isoCode={team.isoCode} name={team.teamName} />
                      <span style={{
                        fontSize: 12, fontWeight: qualified ? 700 : 500,
                        color: qualified ? '#111827' : '#6B7280',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 120,
                      }}>
                        {team.teamName}
                      </span>
                    </div>
                  </td>

                  {/* Stats */}
                  <td style={td()}>{team.played}</td>
                  <td style={td('#22C55E', team.wins > 0)}>{team.wins}</td>
                  <td style={td()}>{team.draws}</td>
                  <td style={td('#EF4444', team.losses > 0)}>{team.losses}</td>
                  <td style={td(
                    team.goalDiff > 0 ? '#22C55E' : team.goalDiff < 0 ? '#EF4444' : '#9CA3AF',
                    Math.abs(team.goalDiff) > 0,
                  )}>
                    {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                  </td>
                  <td style={{ ...td('#F97316', true), fontWeight: 900, fontSize: 13 }}>
                    {team.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #F3F4F6',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: '#22C55E18', border: '1px solid #22C55E40',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 800, color: '#22C55E', flexShrink: 0,
        }}>1</div>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{t('groups.top2Qualify')}</span>
      </div>
    </div>
  );
}

function th(width?: number, align: 'left' | 'center' = 'center', color = '#6B7280'): React.CSSProperties {
  return {
    padding: '8px 4px',
    textAlign: align,
    fontSize: 10,
    fontWeight: 700,
    color,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
    width: width ?? undefined,
    background: '#FAFAFA',
  };
}

function td(color = '#374151', highlight = false): React.CSSProperties {
  return {
    padding: '10px 4px',
    textAlign: 'center',
    fontSize: 12,
    color: highlight ? color : '#6B7280',
    fontWeight: highlight ? 700 : 400,
  };
}

export function Teams() {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [standings, setStandings] = useState<Record<string, GroupStanding[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<Team[]>('/teams'),
      apiGet<Record<string, GroupStanding[]>>('/matches/group-standings').catch(() => ({})),
    ])
      .then(([teamData, standData]) => {
        setTeams(teamData);
        setStandings(standData as Record<string, GroupStanding[]>);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const groups = Array.from(
    new Set(teams.map(t => t.groupName).filter(Boolean))
  ).sort() as string[];

  const byGroup: Record<string, Team[]> = {};
  teams.forEach(t => { if (t.groupName) (byGroup[t.groupName] ??= []).push(t); });

  function getRows(group: string): GroupStanding[] {
    const existing = standings[group];
    if (existing && existing.length > 0) return existing;
    return (byGroup[group] ?? []).map(t => ({
      teamId: t.id,
      teamName: t.name,
      isoCode: t.isoCode,
      points: 0, played: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0,
    }));
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: '#6B7280' }}>
        <div className="spinner" />
        <span style={{ fontSize: 13 }}>{t('teams.loading')}</span>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10, color: '#9CA3AF' }}>
        <span style={{ fontSize: 40 }}>⚽</span>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>{t('teams.noTeams')}</p>
        <p style={{ margin: 0, fontSize: 12 }}>{t('teams.noTeamsAdmin')}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#111827' }}>{t('teams.title')}</span>
            <span style={{ color: '#F97316' }}>{t('teams.titleHighlight')}</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#6B7280' }}>
            {t('teams.subtitle', { groups: groups.length, count: teams.length })}
          </p>
        </div>

        {/* Group quick nav */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {groups.map(g => (
            <a
              key={g}
              href={`#grupo-${g}`}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid #F9731640',
                background: '#F9731610',
                color: '#F97316',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, textDecoration: 'none',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { const a = e.currentTarget; a.style.background = '#F97316'; a.style.color = '#fff'; }}
              onMouseLeave={e => { const a = e.currentTarget; a.style.background = '#F9731610'; a.style.color = '#F97316'; }}
            >
              {g}
            </a>
          ))}
        </div>
      </div>

      {/* Groups grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
        gap: 16,
      }}>
        {groups.map(group => (
          <GroupCard key={group} group={group} rows={getRows(group)} />
        ))}
      </div>
    </div>
  );
}
