export type Team = {
  id: string;
  name: string;
  code: string;
  isoCode?: string;
  groupName?: string;
};

export type Match = {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  kickoffAt: string;
  stage: string;
  groupName?: string;
  homeScore?: number;
  awayScore?: number;
  isFinished: boolean;
};

export type RankingItem = {
  userId: string;
  userName: string;
  position: number;
  totalPoints: number;
  exactScores: number;
  correctResults: number;
};

export type Player = {
  id: string;
  teamId: string;
  name: string;
  position: string;
  club?: string;
  age?: number;
  goals?: number;
  assists?: number;
};

export type Pool = {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  inviteCode: string;
  participantCount: number;
  ownerUserId: string;
};

export type Prediction = {
  id: string;
  matchId: string;
  homeScorePrediction: number;
  awayScorePrediction: number;
  pointsEarned: number;
  status: string;
};

export type ChampionPrediction = {
  id: string;
  poolId: string;
  championTeamId: string;
  championTeamName: string;
  championTeamIsoCode?: string;
  runnerUpTeamId?: string;
  runnerUpTeamName?: string;
  runnerUpTeamIsoCode?: string;
  thirdPlaceTeamId?: string;
  thirdPlaceTeamName?: string;
  thirdPlaceTeamIsoCode?: string;
  pointsEarned: number;
};

export type FeedEvent = {
  id: string;
  userName: string;
  matchLabel: string;
  eventType: number;
  eventTypeName: string;
  points: number;
  occurredAt: string;
  predictionLabel: string;
};

export type GroupStanding = {
  teamId: string;
  teamName: string;
  isoCode?: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
};

export type ChampionPickStats = {
  teamId: string;
  teamName: string;
  isoCode?: string;
  count: number;
};

export type RankingEvolution = {
  round: string;
  totalPoints: number;
};
