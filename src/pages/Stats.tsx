import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { apiGet } from '../services/api';
import type { ChampionPickStats } from '../types';

type Props = { poolId?: string };

const BAR_COLORS = ['#F97316', '#22C55E', '#D97706', '#A855F7', '#F97316', '#EF4444', '#06B6D4', '#84CC16'];

export function Stats({ poolId }: Props) {
  const [data, setData] = useState<ChampionPickStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!poolId) return;
    setLoading(true);
    apiGet<ChampionPickStats[]>(`/stats/champion-picks?poolId=${poolId}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [poolId]);

  const chartData = data.map(d => ({ name: d.teamName, votos: d.count, isoCode: d.isoCode }));
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px', lineHeight: 1 }}>
          <span style={{ color: '#111827' }}>ESTA</span>
          <span style={{ color: '#F97316' }}>TÍSTICAS</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280' }}>
          Distribuição dos palpites de campeão no bolão.
        </p>
      </div>

      {!poolId ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📊</div>
          <p style={{ fontSize: 14, margin: 0 }}>Selecione um bolão para ver as estatísticas.</p>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280', fontSize: 14 }}>
          <div className="spinner" style={{ width: 18, height: 18 }} /> Carregando...
        </div>
      ) : data.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
          <p style={{ fontSize: 14, margin: 0 }}>Nenhum palpite de campeão registrado ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <p className="section-label" style={{ margin: 0 }}>Seleção mais escolhida como campeã</p>
              <span style={{ fontSize: 11, color: '#6B7280' }}>{total} palpite{total !== 1 ? 's' : ''}</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#6B7280' }}
                  itemStyle={{ color: '#F97316' }}
                  formatter={(value: number) => [`${value} palpite${value !== 1 ? 's' : ''}`, 'Votos']}
                />
                <Bar dataKey="votos" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rankings table */}
          <div className="card" style={{ padding: 20 }}>
            <p className="section-label">Detalhes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.map((d, i) => {
                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                const color = BAR_COLORS[i % BAR_COLORS.length];
                return (
                  <div key={d.teamId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < data.length - 1 ? '1px solid #E5E7EB50' : 'none' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', width: 20, textAlign: 'center' }}>{i + 1}</span>
                    {d.isoCode && (
                      <img src={`https://flagcdn.com/24x18/${d.isoCode.toLowerCase()}.png`} alt={d.teamName} style={{ width: 24, height: 18, borderRadius: 2, objectFit: 'cover' }} />
                    )}
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#111827' }}>{d.teamName}</span>
                    <div style={{ width: 80, height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 40, textAlign: 'right' }}>{d.count}× ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
