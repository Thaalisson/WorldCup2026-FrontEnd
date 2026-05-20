import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../services/api';
import type { ChampionPrediction, Team } from '../types';
import { Trophy, Medal, Star } from 'lucide-react';

type Props = { poolId: string };
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// Tournament starts June 11, 2026 — predictions locked from that date
const TOURNAMENT_START = new Date('2026-06-11T12:00:00Z');

function FlagImg({ isoCode, name }: { isoCode?: string; name: string }) {
  if (!isoCode) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${isoCode.toLowerCase()}.png`}
      alt={name}
      width={24}
      height={16}
      style={{ borderRadius: 3, objectFit: 'cover', display: 'inline-block', verticalAlign: 'middle' }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

function TeamSelect({
  label, icon, color, value, onChange, teams, disabled,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  value: string;
  onChange: (id: string) => void;
  teams: Team[];
  disabled: boolean;
}) {
  const selected = teams.find(t => t.id === value);
  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 36, height: 36, background: `${color}15`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>{label}</p>
          {selected && (
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FlagImg isoCode={selected.isoCode} name={selected.name} />
              {' '}{selected.name}
            </p>
          )}
        </div>
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%',
          background: '#F3F4F6',
          border: `1px solid ${disabled ? '#E5E7EB' : color + '40'}`,
          borderRadius: 8,
          color: disabled ? '#6B7280' : '#111827',
          padding: '10px 12px',
          fontSize: 13,
          fontWeight: 600,
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <option value="">— Escolher seleção —</option>
        {teams.map(t => (
          <option key={t.id} value={t.id}>
            {t.groupName ? `Grupo ${t.groupName} — ` : ''}{t.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ChampionPick({ poolId }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [champion, setChampion] = useState('');
  const [runnerUp, setRunnerUp] = useState('');
  const [thirdPlace, setThirdPlace] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isLocked = new Date() >= TOURNAMENT_START;

  useEffect(() => {
    Promise.all([
      apiGet<Team[]>('/teams'),
      apiGet<ChampionPrediction | null>(`/champion-predictions/me?poolId=${poolId}`).catch(() => null),
    ])
      .then(([teamData, existing]) => {
        setTeams(teamData);
        if (existing) {
          setChampion(existing.championTeamId);
          setRunnerUp(existing.runnerUpTeamId ?? '');
          setThirdPlace(existing.thirdPlaceTeamId ?? '');
          setSaveState('saved');
        }
      })
      .catch(() => setError('Não foi possível carregar os dados.'))
      .finally(() => setLoading(false));
  }, [poolId]);

  async function handleSave() {
    if (!champion) return;
    setSaveState('saving');
    try {
      await apiPost('/champion-predictions', {
        poolId,
        championTeamId: champion,
        runnerUpTeamId: runnerUp || null,
        thirdPlaceTeamId: thirdPlace || null,
      });
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 12 }}>
        <div className="spinner" />
        <span style={{ fontSize: 13, color: '#6B7280' }}>Carregando...</span>
      </div>
    );
  }

  if (error) return <div className="card" style={{ padding: 20, color: '#EF4444', textAlign: 'center', fontSize: 14 }}>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#111827' }}>PRÉ-</span>
          <span style={{ color: '#F97316' }}>COPA</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280' }}>
          Palpite de campeão, vice e 3º lugar. Pontuação extra ao final do torneio.
        </p>
      </div>

      {isLocked && (
        <div style={{ background: '#EF444415', border: '1px solid #EF444430', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#EF4444', fontWeight: 600 }}>
          🔒 Torneio em andamento — palpites de campeão bloqueados.
        </div>
      )}

      {/* Scoring info */}
      <div className="card-soft" style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
        {[
          { label: 'Campeão acertado', pts: '+15', color: '#D97706' },
          { label: 'Vice acertado', pts: '+10', color: '#6B7280' },
          { label: '3º Lugar acertado', pts: '+5', color: '#CD7C2F' },
        ].map(item => (
          <div key={item.label}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: item.color }}>{item.pts}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Team pickers */}
      <TeamSelect
        label="Campeão"
        icon={<Trophy size={18} />}
        color="#D97706"
        value={champion}
        onChange={setChampion}
        teams={teams}
        disabled={isLocked}
      />
      <TeamSelect
        label="Vice-Campeão"
        icon={<Medal size={18} />}
        color="#6B7280"
        value={runnerUp}
        onChange={setRunnerUp}
        teams={teams}
        disabled={isLocked}
      />
      <TeamSelect
        label="3º Lugar"
        icon={<Star size={18} />}
        color="#CD7C2F"
        value={thirdPlace}
        onChange={setThirdPlace}
        teams={teams}
        disabled={isLocked}
      />

      {/* Save button */}
      {!isLocked && (
        <button
          onClick={handleSave}
          disabled={!champion || saveState === 'saving'}
          className="btn-primary"
          style={{ opacity: (!champion || saveState === 'saving') ? 0.5 : 1 }}
        >
          {saveState === 'saving' ? 'SALVANDO...' : saveState === 'saved' ? '✓ PALPITE SALVO' : 'SALVAR PALPITE PRÉ-COPA'}
        </button>
      )}

      {saveState === 'error' && (
        <p style={{ margin: 0, fontSize: 12, color: '#EF4444', textAlign: 'center' }}>Erro ao salvar. Tente novamente.</p>
      )}
    </div>
  );
}
