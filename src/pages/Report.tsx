import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../services/api';
import type { PoolReport } from '../types';

type Props = { poolId: string };

const OUTCOME = {
  exato:       { bg: '#22C55E18', color: '#22C55E', icon: '🎯' },
  vencedor:    { bg: '#F9731618', color: '#F97316', icon: '✓' },
  errou:       { bg: '#6B728018', color: '#6B7280', icon: '✗' },
  sem_palpite: { bg: '#9CA3AF18', color: '#9CA3AF', icon: '—' },
} as const;

export function Report({ poolId }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<PoolReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiGet<PoolReport>(`/pools/${poolId}/report`)
      .then(d => { setData(d); setOpen(d.players[0]?.userName ?? null); })
      .catch(() => setError(t('report.loadError')))
      .finally(() => setLoading(false));
  }, [poolId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#111827' }}>{t('report.title')}</span>
          <span style={{ color: '#F97316' }}>{t('report.titleHighlight')}</span>
        </h1>
        {data && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280' }}>
            {t('report.subtitle', { exact: data.exactPoints, correct: data.correctPoints, games: data.finishedCount })}
          </p>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, flexDirection: 'column', gap: 12 }}>
          <div className="spinner" />
          <span style={{ fontSize: 13, color: '#6B7280' }}>{t('report.loading')}</span>
        </div>
      )}
      {error && <div className="card" style={{ padding: 20, color: '#EF4444', fontSize: 14, textAlign: 'center' }}>{error}</div>}

      {!loading && !error && data && data.players.map(p => {
        const isOpen = open === p.userName;
        return (
          <div key={p.userName} className="card" style={{ overflow: 'hidden' }}>
            <button
              onClick={() => setOpen(isOpen ? null : p.userName)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: p.position <= 3 ? '#FFF7ED' : '#F3F4F6',
                color: p.position <= 3 ? '#F97316' : '#6B7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800,
              }}>{p.position}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.userName}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B7280' }}>
                  🎯 {p.exatos} · ✓ {p.vencedor} · ✗ {p.erros}{p.semPalpite > 0 ? ` · — ${p.semPalpite}` : ''}
                </p>
              </div>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#F97316' }}>{p.totalPoints}</span>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid #F3F4F6', padding: '8px 12px 12px' }}>
                {p.games.map((g, i) => {
                  const o = OUTCOME[g.outcome];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 4px', borderBottom: i < p.games.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                      <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>{o.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#374151' }}>{g.matchLabel}</p>
                        <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF' }}>
                          {g.outcome === 'sem_palpite' ? t('report.noGuess') : t('report.guess', { score: g.predictionLabel })}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 800, color: o.color, background: o.bg,
                        padding: '2px 8px', borderRadius: 6, flexShrink: 0, minWidth: 34, textAlign: 'center',
                      }}>+{g.points}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
