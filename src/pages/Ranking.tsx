import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RankingTable } from '../components/RankingTable';
import { apiGet } from '../services/api';
import type { RankingItem } from '../types';

type Props = { poolId: string };

export function Ranking({ poolId }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiGet<RankingItem[]>(`/pools/${poolId}/ranking`)
      .then(setItems)
      .catch(() => setError(t('ranking.loadError')))
      .finally(() => setLoading(false));
  }, [poolId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#111827' }}>{t('ranking.title')}</span>
          <span style={{ color: '#F97316' }}>{t('ranking.titleHighlight')}</span>
        </h1>
        {items.length > 0 && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280' }}>
            {t('ranking.subtitle', { count: items.length })}
          </p>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, flexDirection: 'column', gap: 12, color: '#D1D5DB' }}>
          <div className="spinner" />
          <span style={{ fontSize: 13, color: '#6B7280' }}>{t('ranking.loading')}</span>
        </div>
      )}
      {error && <div className="card" style={{ padding: 20, color: '#EF4444', fontSize: 14, textAlign: 'center' }}>{error}</div>}
      {!loading && !error && <RankingTable items={items} poolId={poolId} />}
    </div>
  );
}
