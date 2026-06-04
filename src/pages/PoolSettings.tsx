import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPut } from '../services/api';
import { Save, Info } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiGet<ScoringConfig>(`/pools/${poolId}/scoring-config`)
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [poolId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await apiPut(`/pools/${poolId}/scoring-config`, config);
      setMsg(t('settings.saveSuccess'));
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg(t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setConfig(DEFAULTS);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#111827' }}>{t('settings.title')} </span>
          <span style={{ color: '#F97316' }}>{t('settings.titleHighlight')}</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280' }}>
          {t('settings.subtitle')}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 16px', background: '#F9731610', border: '1px solid #F9731620', borderRadius: 10 }}>
        <Info size={15} color="#F97316" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
          {t('settings.infoText')}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280', fontSize: 14 }}>
          <div className="spinner" style={{ width: 18, height: 18 }} /> {t('common.loading')}
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {FIELDS.map(f => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>{f.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B7280' }}>{f.description}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button type="button" onClick={() => setConfig(p => ({ ...p, [f.key]: Math.max(0, p[f.key] - 1) }))}
                      style={{ width: 30, height: 30, background: '#E5E7EB', border: 'none', borderRadius: 7, color: '#111827', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      −
                    </button>
                    <input
                      type="number" min={0} max={100}
                      value={config[f.key]}
                      onChange={e => setConfig(p => ({ ...p, [f.key]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) }))}
                      style={{ width: 56, textAlign: 'center', padding: '6px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, color: '#F97316', fontSize: 15, fontWeight: 800, outline: 'none' }}
                    />
                    <button type="button" onClick={() => setConfig(p => ({ ...p, [f.key]: Math.min(100, p[f.key] + 1) }))}
                      style={{ width: 30, height: 30, background: '#E5E7EB', border: 'none', borderRadius: 7, color: '#111827', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button type="submit" disabled={saving}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 24px', background: '#F97316', border: 'none', borderRadius: 9, color: '#F9FAFB', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                <Save size={14} /> {saving ? t('settings.saving') : t('settings.saveBtn')}
              </button>
              <button type="button" onClick={handleReset}
                style={{ padding: '11px 20px', background: 'none', border: '1px solid #E5E7EB', borderRadius: 9, color: '#6B7280', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {t('settings.resetBtn')}
              </button>
            </div>

            {msg && (
              <p style={{ margin: '12px 0 0', fontSize: 13, color: msg.includes('Erro') ? '#EF4444' : '#22C55E', fontWeight: 600 }}>
                {msg}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
