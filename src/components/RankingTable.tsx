import type { RankingItem } from '../types';

type Props = { items: RankingItem[] };

const MEDALS = ['🥇', '🥈', '🥉'];

export function RankingTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center', color: '#D1D5DB', fontSize: 14 }}>
        Nenhum participante ainda.
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="table-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
            {['#', 'JOGADOR', 'PONTOS', 'EXATOS', 'RESULTADOS'].map((h, i) => (
              <th key={h} style={{
                padding: '12px 16px',
                textAlign: i <= 1 ? 'left' : 'right',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#6B7280',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={item.userId}
              style={{
                borderBottom: '1px solid #E5E7EB80',
                background: i === 0 ? '#D9770608' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = i === 0 ? '#D9770612' : '#F9731606'}
              onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = i === 0 ? '#D9770608' : 'transparent'}
            >
              <td style={{ padding: '14px 16px', fontSize: 16 }}>
                {MEDALS[i] ?? <span style={{ color: '#6B7280', fontSize: 12, fontWeight: 700 }}>{item.position}</span>}
              </td>
              <td style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: i === 0 ? 'linear-gradient(135deg, #D97706, #F97316)' : i === 1 ? 'linear-gradient(135deg, #6B7280, #9CA3AF)' : i === 2 ? 'linear-gradient(135deg, #CD7F32, #8B5E3C)' : '#E5E7EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                    color: i < 3 ? '#F9FAFB' : '#6B7280',
                    flexShrink: 0,
                  }}>
                    {item.userName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: i === 0 ? '#D97706' : '#111827' }}>
                    {item.userName}
                  </span>
                </div>
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 16, fontWeight: 900, color: i === 0 ? '#D97706' : '#22C55E' }}>
                {item.totalPoints}
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, color: '#6B7280' }}>
                {item.exactScores}
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, color: '#6B7280' }}>
                {item.correctResults}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
