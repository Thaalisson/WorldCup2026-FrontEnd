import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { apiGet } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { ChampionPickStats, RankingItem, Match } from '../types';
import { TrendingUp } from 'lucide-react';

type Props = { poolId?: string };

const BAR_COLORS = ['#F97316', '#22C55E', '#D97706', '#A855F7', '#EF4444', '#06B6D4', '#84CC16', '#F43F5E'];

export function Stats({ poolId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<ChampionPickStats[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [finishedCount, setFinishedCount] = useState(0);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!poolId) return;
    setLoading(true);
    Promise.all([
      apiGet<ChampionPickStats[]>(`/stats/champion-picks?poolId=${poolId}`),
      apiGet<RankingItem[]>(`/pools/${poolId}/ranking`),
      apiGet<Match[]>('/matches'),
    ])
      .then(([statsData, rankData, matchData]) => {
        setData(statsData);
        setRanking(rankData);
        setFinishedCount(matchData.filter(m => m.isFinished && m.homeTeam.name !== 'A Definir').length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [poolId]);

  const chartData = data.map(d => ({ name: d.teamName, votos: d.count }));
  const total = data.reduce((s, d) => s + d.count, 0);

  const me = ranking.find(r => r.userId === user?.id);
  const others = ranking.filter(r => r.userId !== user?.id);
  const comparePlayer = ranking.find(r => r.userId === compareId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px', lineHeight: 1 }}>
          <span style={{ color: '#111827' }}>{t('stats.title')}</span>
          <span style={{ color: '#F97316' }}>{t('stats.titleHighlight')}</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280' }}>{t('stats.subtitle')}</p>
      </div>

      {/* Champion picks */}
      {!poolId ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📊</div>
          <p style={{ fontSize: 14, margin: 0 }}>{t('stats.noPool')}</p>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280', fontSize: 14 }}>
          <div className="spinner" style={{ width: 18, height: 18 }} /> {t('common.loading')}
        </div>
      ) : data.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
          <p style={{ fontSize: 14, margin: 0 }}>{t('stats.noPicks')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <p className="section-label" style={{ margin: 0 }}>{t('stats.champSectionLabel')}</p>
              <span style={{ fontSize: 11, color: '#6B7280' }}>{t('stats.totalVotes', { count: total })}</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#6B7280' }}
                  itemStyle={{ color: '#F97316' }}
                  formatter={(value: number) => [`${value} palpite${value !== 1 ? 's' : ''}`, t('stats.votesLabel')]}
                />
                <Bar dataKey="votos" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <p className="section-label">{t('stats.details')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.map((d, i) => {
                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                const color = BAR_COLORS[i % BAR_COLORS.length];
                return (
                  <div key={d.teamId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < data.length - 1 ? '1px solid #E5E7EB50' : 'none' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', width: 20, textAlign: 'center' }}>{i + 1}</span>
                    {d.isoCode && <img src={`https://flagcdn.com/24x18/${d.isoCode.toLowerCase()}.png`} alt={d.teamName} style={{ width: 24, height: 18, borderRadius: 2, objectFit: 'cover' }} />}
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

      {/* Rendimento do bolão */}
      {poolId && !loading && ranking.length > 0 && finishedCount > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={13} color="#F97316" />
            <p className="section-label" style={{ margin: 0 }}>{t('stats.performance')}</p>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9CA3AF' }}>
              {t('stats.gamesFinished', { count: finishedCount })}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...ranking]
              .sort((a, b) => (b.exactScores + b.correctResults) - (a.exactScores + a.correctResults))
              .map((item, i) => {
                const hits = item.exactScores + item.correctResults;
                const pct = Math.round((hits / finishedCount) * 100);
                const isMe = item.userId === user?.id;
                return (
                  <div key={item.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: isMe ? '#F9731608' : '#F9FAFB', border: isMe ? '1px solid #F9731625' : '1px solid transparent' }}>
                    <span style={{ width: 18, fontSize: 12, fontWeight: 800, color: '#9CA3AF', textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: isMe ? '#F9731625' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: isMe ? '#F97316' : '#6B7280', flexShrink: 0 }}>
                      {item.userName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: isMe ? 800 : 600, color: isMe ? '#F97316' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.userName}{isMe && ' (você)'}
                    </span>
                    <div style={{ width: 80, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 60 ? '#22C55E' : pct >= 35 ? '#F97316' : '#EF444480', borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#374151', minWidth: 42, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                    <span style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>({hits}/{finishedCount})</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Você vs */}
      {poolId && !loading && others.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <p className="section-label">{t('stats.youVs')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: compareId ? 16 : 0 }}>
            {others.map(r => (
              <button
                key={r.userId}
                onClick={() => setCompareId(compareId === r.userId ? null : r.userId)}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: 'none',
                  background: compareId === r.userId ? '#111827' : '#F3F4F6',
                  color: compareId === r.userId ? '#fff' : '#374151',
                  transition: 'all 0.15s',
                }}
              >
                {r.userName}
              </button>
            ))}
          </div>

          {compareId && me && comparePlayer && (() => {
            const myHits = me.exactScores + me.correctResults;
            const theirHits = comparePlayer.exactScores + comparePlayer.correctResults;
            const myRate = finishedCount > 0 ? Math.round((myHits / finishedCount) * 100) : 0;
            const theirRate = finishedCount > 0 ? Math.round((theirHits / finishedCount) * 100) : 0;

            const metrics = [
              { label: t('stats.metricPoints'),  myVal: me.totalPoints,      themVal: comparePlayer.totalPoints,      unit: 'pts', color: '#F97316' },
              { label: t('stats.metricExact'),    myVal: me.exactScores,      themVal: comparePlayer.exactScores,      unit: '',    color: '#22C55E' },
              { label: t('stats.metricCorrect'),  myVal: me.correctResults,   themVal: comparePlayer.correctResults,   unit: '',    color: '#D97706' },
              { label: t('stats.metricRate'),     myVal: myRate,              themVal: theirRate,                      unit: '%',   color: '#A855F7' },
            ];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* VS header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#F97316,#EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', margin: '0 auto 4px' }}>
                      {me.userName.charAt(0).toUpperCase()}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#F97316' }}>{t('stats.you')}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 10, color: '#9CA3AF' }}>#{me.position} · {me.totalPoints}pts</p>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#9CA3AF', padding: '6px 12px', background: '#E5E7EB', borderRadius: 8, flexShrink: 0 }}>VS</div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#6B7280', margin: '0 auto 4px' }}>
                      {comparePlayer.userName.charAt(0).toUpperCase()}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#111827' }}>{comparePlayer.userName}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 10, color: '#9CA3AF' }}>#{comparePlayer.position} · {comparePlayer.totalPoints}pts</p>
                  </div>
                </div>

                {/* Metrics */}
                {metrics.map(metric => {
                  const max = Math.max(metric.myVal, metric.themVal, 1);
                  const iWin = metric.myVal > metric.themVal;
                  const theyWin = metric.themVal > metric.myVal;
                  return (
                    <div key={metric.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: iWin ? metric.color : '#374151' }}>{metric.myVal}{metric.unit}</span>
                        <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>{metric.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: theyWin ? metric.color : '#374151' }}>{metric.themVal}{metric.unit}</span>
                      </div>
                      <div style={{ position: 'relative', height: 5, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(metric.myVal / max) * 50}%`, background: iWin ? metric.color : '#9CA3AF', borderRadius: 3, transition: 'width 0.6s ease' }} />
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${(metric.themVal / max) * 50}%`, background: theyWin ? '#6B7280' : '#9CA3AF', borderRadius: 3, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
