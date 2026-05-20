import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { Team } from '../types';

function FlagImg({ isoCode, name }: { isoCode?: string; name: string }) {
  if (!isoCode) return <div style={{ width: 28, height: 20, background: '#E5E7EB', borderRadius: 3 }} />;
  return (
    <img
      src={`https://flagcdn.com/w40/${isoCode.toLowerCase()}.png`}
      alt={name}
      style={{ width: 28, height: 20, borderRadius: 3, objectFit: 'cover', display: 'block', flexShrink: 0 }}
      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
    />
  );
}

export function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Team[]>('/teams')
      .then(setTeams)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const groups = Array.from(
    new Set(teams.map(t => t.groupName).filter(Boolean))
  ).sort() as string[];

  const byGroup: Record<string, Team[]> = {};
  teams.forEach(t => {
    if (t.groupName) (byGroup[t.groupName] ??= []).push(t);
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: '#6B7280' }}>
        <div className="spinner" />
        <span style={{ fontSize: 13 }}>Carregando seleções...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#111827' }}>SELEÇÕES </span>
            <span style={{ color: '#F97316' }}>DA COPA</span>
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#6B7280' }}>
            {groups.length} grupos · {teams.length} seleções classificadas
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => (
            <a
              key={g}
              href={`#grupo-${g}`}
              style={{
                width: 28, height: 28, borderRadius: 7, border: '1px solid #E5E7EB',
                background: groups.includes(g) ? '#F97316' : '#F3F4F6',
                color: groups.includes(g) ? '#fff' : '#9CA3AF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              {g}
            </a>
          ))}
        </div>
      </div>

      {/* Groups grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {groups.map(group => {
          const groupTeams = byGroup[group] ?? [];
          return (
            <div
              key={group}
              id={`grupo-${group}`}
              className="card"
              style={{ padding: 0, overflow: 'hidden' }}
            >
              {/* Group header */}
              <div style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.06em' }}>
                  GRUPO {group}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                  {groupTeams.length} seleções
                </span>
              </div>

              {/* Teams */}
              <div style={{ padding: '8px 0' }}>
                {groupTeams.map((team, i) => (
                  <div
                    key={team.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '9px 16px',
                      borderBottom: i < groupTeams.length - 1 ? '1px solid #F3F4F6' : 'none',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FFF7ED')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <FlagImg isoCode={team.isoCode} name={team.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {team.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.06em' }}>
                        {team.code}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {teams.length === 0 && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10, color: '#9CA3AF' }}>
          <span style={{ fontSize: 40 }}>⚽</span>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>Nenhuma seleção cadastrada</p>
          <p style={{ margin: 0, fontSize: 12 }}>Um admin precisa importar os dados da Copa.</p>
        </div>
      )}
    </div>
  );
}
