import type { GroupStanding } from '../types';

type Props = {
  groupName: string;
  teams: GroupStanding[];
};

export function GroupTable({ groupName, teams }: Props) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 800, color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
        Grupo {groupName}
      </p>
      <div className="table-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={thStyle('#6B7280', 'left')}>Seleção</th>
            <th style={thStyle('#F97316')}>Pts</th>
            <th style={thStyle()}>J</th>
            <th style={thStyle('#22C55E')}>V</th>
            <th style={thStyle()}>E</th>
            <th style={thStyle('#EF4444')}>D</th>
            <th style={thStyle()}>GP</th>
            <th style={thStyle()}>GC</th>
            <th style={thStyle()}>SG</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr key={t.teamId} style={{ borderTop: '1px solid #E5E7EB50', opacity: teams.length > 0 && i < 2 ? 1 : 0.6 }}>
              <td style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                {t.isoCode && (
                  <img
                    src={`https://flagcdn.com/24x18/${t.isoCode.toLowerCase()}.png`}
                    alt={t.teamName}
                    style={{ width: 24, height: 18, borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
                  />
                )}
                <span style={{ fontWeight: i < 2 ? 700 : 400, color: i < 2 ? '#111827' : '#6B7280' }}>
                  {t.teamName}
                </span>
              </td>
              <td style={tdStyle('#F97316', true)}>{t.points}</td>
              <td style={tdStyle()}>{t.played}</td>
              <td style={tdStyle('#22C55E')}>{t.wins}</td>
              <td style={tdStyle()}>{t.draws}</td>
              <td style={tdStyle('#EF4444')}>{t.losses}</td>
              <td style={tdStyle()}>{t.goalsFor}</td>
              <td style={tdStyle()}>{t.goalsAgainst}</td>
              <td style={tdStyle(t.goalDiff > 0 ? '#22C55E' : t.goalDiff < 0 ? '#EF4444' : '#6B7280')}>
                {t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 10, color: '#6B728060' }}>
        Top 2 avançam para as oitavas de final.
      </p>
    </div>
  );
}

function thStyle(color = '#6B7280', align: 'left' | 'center' = 'center'): React.CSSProperties {
  return {
    padding: '0 0 8px',
    textAlign: align,
    fontSize: 10,
    fontWeight: 700,
    color,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
  };
}

function tdStyle(color = '#6B7280', bold = false): React.CSSProperties {
  return {
    padding: '8px 4px',
    textAlign: 'center',
    color,
    fontWeight: bold ? 800 : 400,
    fontSize: 12,
  };
}
