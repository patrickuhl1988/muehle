/**
 * Achievement definitions and progress calculation for Mühle.
 * 20 achievements across Anfaenger, Fortgeschritten, Puzzle, KI, Online.
 * Achievements with requiresFeature are hidden when that feature is disabled.
 */

import type { AIDifficulty } from './types';
import { difficultyToLevel } from './ai';
import type { FeatureId } from '../features';

/** Category for grouping achievements in UI. */
export type AchievementCategory =
  | 'anfaenger'
  | 'fortgeschritten'
  | 'puzzle'
  | 'ki'
  | 'online';

/** Progress for one achievement: current value, target, and whether unlocked. */
export interface AchievementProgress {
  current: number;
  target: number;
  done: boolean;
}

/** Single achievement definition. */
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  /** Computes progress from stats. */
  getProgress: (stats: StatsForAchievements) => AchievementProgress;
  /** Optional reward label (Badge, Theme name, etc.). No developer comments like "(wenn vorhanden)". */
  reward?: string;
  /** If set, this achievement is only shown when the feature is enabled. */
  requiresFeature?: FeatureId | null;
}

/** Snapshot of stats used to evaluate achievement progress. */
export interface StatsForAchievements {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  winStreak: number;
  bestWinStreak: number;
  totalMills: number;
  totalMoves: number;
  fastestWin: number;
  puzzlesSolved: number;
  dailyStreak: number;
  bestDailyStreak: number;
  puzzlesWithThreeStars: number;
  onlineElo: number;
  onlineGamesPlayed: number;
  tutorialCompleted: boolean;
  /** Max AI level beaten (1–5). */
  maxAILevelBeaten: number;
  /** Current win streak vs AI (reset on loss). */
  aiWinStreak: number;
  /** Mills closed in a single game (for Zwickmühlen). */
  maxMillsInSingleGame: number;
  /** Blitz games won. */
  blitzWins: number;
  /** Whether last win was "perfection" (no stones lost). */
  lastWinWasPerfect: boolean;
  /** Whether last win was "comeback" (won with 3 stones vs 6+). */
  lastWinWasComeback: boolean;
}

/** Achievement with current progress and unlocked timestamp. */
export interface Achievement extends AchievementDefinition {
  progress: AchievementProgress;
  unlockedAt: number | null;
}

const TUTORIAL_ID = 'erste_schritte';
const FIRST_MILL_ID = 'erste_muehle';
const FIRST_WIN_ID = 'erster_sieg';
const MUEHLENBAUER_ID = 'muehlenbauer';
const ZWICKMUEHLEN_ID = 'zwickmuehlen_meister';
const BLITZ_KOENIG_ID = 'blitz_koenig';
const PERFEKTIONIST_ID = 'perfektionist';
const COMEBACK_KING_ID = 'comeback_king';
const MARATHON_ID = 'marathon';
const PUZZLE_NEULING_ID = 'puzzle_neuling';
const PUZZLE_MEISTER_ID = 'puzzle_meister';
const STREAK_7_ID = 'streak_7';
const STREAK_30_ID = 'streak_30';
const DREI_STERNE_ID = 'drei_sterne_sammler';
const KI_BEZWINGER_ID = 'ki_bezwinger';
const UNBESIEGBAR_ID = 'unbesiegbar';
const SERIENSIEGER_ID = 'seriensieger';
const ONLINE_DEBUET_ID = 'online_debuet';
const ELO_1200_ID = 'elo_1200';
const ELO_1500_ID = 'elo_1500';

/** All 20 achievement definitions in display order. */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Anfaenger
  {
    id: TUTORIAL_ID,
    name: 'Erste Schritte',
    description: 'Tutorial abgeschlossen',
    category: 'anfaenger',
    getProgress: (s) => ({
      current: s.tutorialCompleted ? 1 : 0,
      target: 1,
      done: s.tutorialCompleted,
    }),
  },
  {
    id: FIRST_MILL_ID,
    name: 'Erste Mühle',
    description: 'Erste Mühle im Spiel geschlossen',
    category: 'anfaenger',
    getProgress: (s) => ({
      current: s.totalMills >= 1 ? 1 : 0,
      target: 1,
      done: s.totalMills >= 1,
    }),
  },
  {
    id: FIRST_WIN_ID,
    name: 'Erster Sieg',
    description: 'Erstes Spiel gewonnen',
    category: 'anfaenger',
    getProgress: (s) => ({
      current: s.gamesWon >= 1 ? 1 : 0,
      target: 1,
      done: s.gamesWon >= 1,
    }),
  },
  // Fortgeschritten
  {
    id: MUEHLENBAUER_ID,
    name: 'Mühlenbauer',
    description: '50 Mühlen insgesamt geschlossen',
    category: 'fortgeschritten',
    reward: 'Badge',
    getProgress: (s) => ({
      current: Math.min(50, s.totalMills),
      target: 50,
      done: s.totalMills >= 50,
    }),
  },
  {
    id: ZWICKMUEHLEN_ID,
    name: 'Zwickmühlen-Meister',
    description: '3 Zwickmühlen in einem Spiel',
    category: 'fortgeschritten',
    reward: 'Badge',
    getProgress: (s) => ({
      current: Math.min(3, s.maxMillsInSingleGame),
      target: 3,
      done: s.maxMillsInSingleGame >= 3,
    }),
  },
  {
    id: BLITZ_KOENIG_ID,
    name: 'Blitz-König',
    description: '10 Blitz-Partien gewonnen',
    category: 'fortgeschritten',
    reward: 'Pixel-Theme',
    requiresFeature: 'blitz',
    getProgress: (s) => ({
      current: Math.min(10, s.blitzWins),
      target: 10,
      done: s.blitzWins >= 10,
    }),
  },
  {
    id: PERFEKTIONIST_ID,
    name: 'Perfektionist',
    description: 'Gewonnen ohne eigenen Stein zu verlieren',
    category: 'fortgeschritten',
    reward: 'Spezial-Avatar',
    getProgress: (s) => ({
      current: s.lastWinWasPerfect ? 1 : 0,
      target: 1,
      done: s.lastWinWasPerfect,
    }),
  },
  {
    id: COMEBACK_KING_ID,
    name: 'Comeback-King',
    description: 'Mit nur 3 Steinen gegen 6+ gewonnen',
    category: 'fortgeschritten',
    reward: 'Spezial-Animation',
    getProgress: (s) => ({
      current: s.lastWinWasComeback ? 1 : 0,
      target: 1,
      done: s.lastWinWasComeback,
    }),
  },
  {
    id: MARATHON_ID,
    name: 'Marathon',
    description: '100 Spiele gespielt',
    category: 'fortgeschritten',
    reward: 'Badge',
    getProgress: (s) => ({
      current: Math.min(100, s.gamesPlayed),
      target: 100,
      done: s.gamesPlayed >= 100,
    }),
  },
  // Puzzle
  {
    id: PUZZLE_NEULING_ID,
    name: 'Puzzle-Neuling',
    description: '10 Puzzles gelöst',
    category: 'puzzle',
    reward: 'Badge',
    getProgress: (s) => ({
      current: Math.min(10, s.puzzlesSolved),
      target: 10,
      done: s.puzzlesSolved >= 10,
    }),
  },
  {
    id: PUZZLE_MEISTER_ID,
    name: 'Puzzle-Meister',
    description: 'Alle 50 Puzzles gelöst',
    category: 'puzzle',
    reward: 'Vintage-Theme',
    getProgress: (s) => ({
      current: Math.min(50, s.puzzlesSolved),
      target: 50,
      done: s.puzzlesSolved >= 50,
    }),
  },
  {
    id: STREAK_7_ID,
    name: 'Streak 7',
    description: '7 Tage Daily Puzzle Streak',
    category: 'puzzle',
    reward: 'Badge',
    getProgress: (s) => ({
      current: Math.min(7, s.dailyStreak),
      target: 7,
      done: s.dailyStreak >= 7,
    }),
  },
  {
    id: STREAK_30_ID,
    name: 'Streak 30',
    description: '30 Tage Daily Puzzle Streak',
    category: 'puzzle',
    reward: 'Exklusiver Theme-Rahmen',
    getProgress: (s) => ({
      current: Math.min(30, s.bestDailyStreak),
      target: 30,
      done: s.bestDailyStreak >= 30,
    }),
  },
  {
    id: DREI_STERNE_ID,
    name: 'Drei-Sterne-Sammler',
    description: '30 Puzzles mit 3 Sternen',
    category: 'puzzle',
    reward: 'Badge',
    getProgress: (s) => ({
      current: Math.min(30, s.puzzlesWithThreeStars),
      target: 30,
      done: s.puzzlesWithThreeStars >= 30,
    }),
  },
  // KI
  {
    id: KI_BEZWINGER_ID,
    name: 'KI-Bezwinger',
    description: 'KI Stufe 4 besiegt',
    category: 'ki',
    reward: 'Badge',
    getProgress: (s) => ({
      current: Math.min(4, s.maxAILevelBeaten),
      target: 4,
      done: s.maxAILevelBeaten >= 4,
    }),
  },
  {
    id: UNBESIEGBAR_ID,
    name: 'Unbesiegbar',
    description: 'KI Stufe 5 ("Unfair") besiegt',
    category: 'ki',
    reward: 'Goldener Profilrahmen',
    getProgress: (s) => ({
      current: s.maxAILevelBeaten >= 5 ? 1 : 0,
      target: 1,
      done: s.maxAILevelBeaten >= 5,
    }),
  },
  {
    id: SERIENSIEGER_ID,
    name: 'Seriensieger',
    description: '5 Siege in Folge gegen KI',
    category: 'ki',
    reward: 'Badge',
    getProgress: (s) => ({
      current: Math.min(5, s.aiWinStreak),
      target: 5,
      done: s.aiWinStreak >= 5,
    }),
  },
  // Online (V1.1) – only shown when online mode is enabled
  {
    id: ONLINE_DEBUET_ID,
    name: 'Online-Debüt',
    description: 'Erstes Online-Spiel',
    category: 'online',
    reward: 'Badge',
    requiresFeature: 'online',
    getProgress: (s) => ({
      current: s.onlineGamesPlayed >= 1 ? 1 : 0,
      target: 1,
      done: s.onlineGamesPlayed >= 1,
    }),
  },
  {
    id: ELO_1200_ID,
    name: 'Aufsteiger',
    description: 'ELO-Rating 1200 erreicht',
    category: 'online',
    reward: 'Silberner Rahmen',
    requiresFeature: 'online',
    getProgress: (s) => ({
      current: Math.min(1200, s.onlineElo),
      target: 1200,
      done: s.onlineElo >= 1200,
    }),
  },
  {
    id: ELO_1500_ID,
    name: 'Meisterklasse',
    description: 'ELO-Rating 1500 erreicht',
    category: 'online',
    reward: 'Goldener Rahmen',
    requiresFeature: 'online',
    getProgress: (s) => ({
      current: Math.min(1500, s.onlineElo),
      target: 1500,
      done: s.onlineElo >= 1500,
    }),
  },
];

/** Category display labels. */
export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  anfaenger: 'Anfänger',
  fortgeschritten: 'Fortgeschritten',
  puzzle: 'Puzzle',
  ki: 'KI',
  online: 'Online',
};

/** Default stats snapshot for achievement progress. */
export function getDefaultStatsForAchievements(): StatsForAchievements {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDraw: 0,
    winStreak: 0,
    bestWinStreak: 0,
    totalMills: 0,
    totalMoves: 0,
    fastestWin: 0,
    puzzlesSolved: 0,
    dailyStreak: 0,
    bestDailyStreak: 0,
    puzzlesWithThreeStars: 0,
    onlineElo: 1000,
    onlineGamesPlayed: 0,
    tutorialCompleted: false,
    maxAILevelBeaten: 0,
    aiWinStreak: 0,
    maxMillsInSingleGame: 0,
    blitzWins: 0,
    lastWinWasPerfect: false,
    lastWinWasComeback: false,
  };
}

/**
 * Builds full Achievement list with progress from current stats and unlocked timestamps.
 */
export function buildAchievements(
  stats: StatsForAchievements,
  unlockedAtMap: Record<string, number>
): Achievement[] {
  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    const progress = def.getProgress(stats);
    return {
      ...def,
      progress,
      unlockedAt: unlockedAtMap[def.id] ?? null,
    };
  });
}
