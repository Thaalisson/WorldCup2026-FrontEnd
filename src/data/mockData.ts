import type { Match, Player, RankingItem, Team } from '../types';

export const teams: Team[] = [
  { id: 'bra', name: 'Brasil',    code: 'BRA', isoCode: 'br',     groupName: 'C' },
  { id: 'mar', name: 'Marrocos',  code: 'MAR', isoCode: 'ma',     groupName: 'C' },
  { id: 'sco', name: 'Escócia',   code: 'SCO', isoCode: 'gb-sct', groupName: 'C' },
  { id: 'hai', name: 'Haiti',     code: 'HAI', isoCode: 'ht',     groupName: 'C' },
  { id: 'arg', name: 'Argentina', code: 'ARG', isoCode: 'ar',     groupName: 'J' },
  { id: 'por', name: 'Portugal',  code: 'POR', isoCode: 'pt',     groupName: 'K' }
];

export const matches: Match[] = [
  {
    id: 'm1',
    homeTeam: teams[0],
    awayTeam: teams[1],
    kickoffAt: '2026-06-12T19:00:00Z',
    stage: 'Fase de grupos',
    groupName: 'C',
    isFinished: false
  },
  {
    id: 'm2',
    homeTeam: teams[2],
    awayTeam: teams[3],
    kickoffAt: '2026-06-13T16:00:00Z',
    stage: 'Fase de grupos',
    groupName: 'C',
    isFinished: false
  },
  {
    id: 'm3',
    homeTeam: teams[4],
    awayTeam: teams[5],
    kickoffAt: '2026-06-14T22:00:00Z',
    stage: 'Fase de grupos',
    groupName: 'J/K',
    isFinished: false
  }
];

export const ranking: RankingItem[] = [
  { userId: 'u1', userName: 'Thalisson', position: 1, totalPoints: 42, exactScores: 3, correctResults: 6 },
  { userId: 'u2', userName: 'Rato',      position: 2, totalPoints: 35, exactScores: 2, correctResults: 5 },
  { userId: 'u3', userName: 'Convidado', position: 3, totalPoints: 28, exactScores: 1, correctResults: 5 }
];

export const players: Player[] = [
  { id: 'p1', teamId: 'bra', name: 'Jogador exemplo',   position: 'Atacante', club: 'Clube exemplo', age: 25, goals: 0, assists: 0 },
  { id: 'p2', teamId: 'arg', name: 'Jogador exemplo 2', position: 'Meia',    club: 'Clube exemplo', age: 28, goals: 0, assists: 0 }
];
