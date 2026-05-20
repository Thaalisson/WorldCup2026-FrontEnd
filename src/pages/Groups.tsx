import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import { GroupTable } from '../components/GroupTable';
import type { GroupStanding } from '../types';

export function Groups() {
  const [standings, setStandings] = useState<Record<string, GroupStanding[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Record<string, GroupStanding[]>>('/matches/group-standings')
      .then(setStandings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const groups = Object.keys(standings).sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px', lineHeight: 1 }}>
          <span style={{ color: '#111827' }}>FASE DE </span>
          <span style={{ color: '#F97316' }}>GRUPOS</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280' }}>
          Classificação calculada a partir dos jogos finalizados.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280', fontSize: 14 }}>
          <div className="spinner" style={{ width: 18, height: 18 }} /> Carregando classificação...
        </div>
      ) : groups.length === 0 ? (
        <p style={{ color: '#6B7280', fontSize: 14 }}>Nenhum jogo finalizado ainda.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
          {groups.map(g => (
            <GroupTable key={g} groupName={g} teams={standings[g]} />
          ))}
        </div>
      )}
    </div>
  );
}
