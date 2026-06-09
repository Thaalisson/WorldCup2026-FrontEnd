import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../services/api';

type Props = { poolId: string };

type ScoringConfig = {
  pointsExactScore: number;
  pointsCorrectResult: number;
  pointsChampion: number;
  pointsRunnerUp: number;
  pointsThirdPlace: number;
  pointsGroupQualifier: number;
};

const DEFAULTS: ScoringConfig = {
  pointsExactScore: 10,
  pointsCorrectResult: 5,
  pointsChampion: 15,
  pointsRunnerUp: 10,
  pointsThirdPlace: 5,
  pointsGroupQualifier: 3,
};

function getFields(t: ReturnType<typeof import('react-i18next').useTranslation>['t']) {
  return [
    { key: 'pointsExactScore',     label: t('settings.fieldExactScore'),      description: t('settings.fieldExactScoreDesc') },
    { key: 'pointsCorrectResult',  label: t('settings.fieldCorrectResult'),   description: t('settings.fieldCorrectResultDesc') },
    { key: 'pointsChampion',       label: t('settings.fieldChampion'),        description: t('settings.fieldChampionDesc') },
    { key: 'pointsRunnerUp',       label: t('settings.fieldRunnerUp'),        description: t('settings.fieldRunnerUpDesc') },
    { key: 'pointsThirdPlace',     label: t('settings.fieldThirdPlace'),      description: t('settings.fieldThirdPlaceDesc') },
    { key: 'pointsGroupQualifier', label: t('settings.fieldGroupQualifier'),  description: t('settings.fieldGroupQualifierDesc') },
  ] as const;
}

export function PoolSettings({ poolId }: Props) {
  const { t } = useTranslation();
  const FIELDS = getFields(t);
  const [config, setConfig] = useState<ScoringConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<ScoringConfig>(`/pools/${poolId}/scoring-config`)
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [poolId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 560 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#111827' }}>{t('settings.title')} </span>
          <span style={{ color: '#F97316' }}>{t('settings.titleHighlight')}</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280' }}>
          {t('settings.subtitle')}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280', fontSize: 14 }}>
          <div className="spinner" style={{ width: 18, height: 18 }} /> {t('common.loading')}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {FIELDS.map((f, i) => (
            <div
              key={f.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderTop: i > 0 ? '1px solid #F3F4F6' : 'none',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>{f.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9CA3AF' }}>{f.description}</p>
              </div>
              <span style={{
                minWidth: 44, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#FFF7ED',
                border: '1px solid #FED7AA',
                borderRadius: 8,
                color: '#F97316',
                fontSize: 16, fontWeight: 900,
                padding: '0 10px',
              }}>
                {config[f.key]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
