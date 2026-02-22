/**
 * Zustand store for statistics and achievements.
 * Persists to AsyncStorage. recordGame/recordPuzzle update stats; checkAchievements unlocks achievements.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildAchievements,
  getDefaultStatsForAchievements,
  ACHIEVEMENT_DEFINITIONS,
  type Achievement,
  type StatsForAchievements,
} from '../game/achievements';
import type { GameResult, PuzzleResult } from '../types/stats';
import { difficultyToLevel } from '../game/ai';
import { useSettingsStore } from './settingsStore';

const STORAGE_KEY = 'muhle_stats_v1';

interface PersistedState {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  winStreak: number;
  bestWinStreak: number;
  lastPlayedDate: string | null;
  totalMills: number;
  totalMoves: number;
  fastestWin: number;
  puzzlesSolved: number;
  dailyStreak: number;
  bestDailyStreak: number;
  lastDailyDate: string | null;
  puzzlesWithThreeStars: number;
  onlineElo: number;
  onlineGamesPlayed: number;
  unlockedAchievementAt: Record<string, number>;
  maxMillsInSingleGame: number;
  blitzWins: number;
  lastWinWasPerfect: boolean;
  lastWinWasComeback: boolean;
  maxAILevelBeaten: number;
  aiWinStreak: number;
  tagTeamWins: number;
  tagTeamLosses: number;
  tagTeamDraws: number;
}

interface StatsStoreState extends PersistedState {
  recordWin: () => void;
  recordLoss: () => void;
  recordGamePlayed: () => void;
  recordGame: (result: GameResult) => void;
  recordPuzzle: (result: PuzzleResult) => void;
  checkAchievements: () => Achievement[];
  getAchievements: () => Achievement[];
  getUnlockedThemeIds: () => string[];
  resetStats: () => void;
  recordTagTeamMatch: (result: 'win' | 'draw' | 'loss') => void;
  _hydrated: boolean;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const defaultPersisted: PersistedState = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  gamesDraw: 0,
  winStreak: 0,
  bestWinStreak: 0,
  lastPlayedDate: null,
  totalMills: 0,
  totalMoves: 0,
  fastestWin: 0,
  puzzlesSolved: 0,
  dailyStreak: 0,
  bestDailyStreak: 0,
  lastDailyDate: null,
  puzzlesWithThreeStars: 0,
  onlineElo: 1000,
  onlineGamesPlayed: 0,
  unlockedAchievementAt: {},
  maxMillsInSingleGame: 0,
  blitzWins: 0,
  lastWinWasPerfect: false,
  lastWinWasComeback: false,
  maxAILevelBeaten: 0,
  aiWinStreak: 0,
  tagTeamWins: 0,
  tagTeamLosses: 0,
  tagTeamDraws: 0,
};

const PERSISTED_KEYS: (keyof PersistedState)[] = [
  'gamesPlayed', 'gamesWon', 'gamesLost', 'gamesDraw', 'winStreak', 'bestWinStreak', 'lastPlayedDate',
  'totalMills', 'totalMoves', 'fastestWin', 'puzzlesSolved', 'dailyStreak', 'bestDailyStreak', 'lastDailyDate',
  'puzzlesWithThreeStars', 'onlineElo', 'onlineGamesPlayed', 'unlockedAchievementAt', 'maxMillsInSingleGame',
  'blitzWins', 'lastWinWasPerfect', 'lastWinWasComeback', 'maxAILevelBeaten', 'aiWinStreak',
  'tagTeamWins', 'tagTeamLosses', 'tagTeamDraws',
];

function toPersisted(s: StatsStoreState): PersistedState {
  const o: Record<string, unknown> = {};
  for (const k of PERSISTED_KEYS) o[k] = s[k];
  return o as PersistedState;
}

function persist(state: PersistedState): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

export const useStatsStore = create<StatsStoreState>((set, get) => ({
  ...defaultPersisted,
  _hydrated: false,

  recordWin: () => {
    get().recordGame({ outcome: 'win' });
  },

  recordLoss: () => {
    get().recordGame({ outcome: 'loss' });
  },

  recordTagTeamMatch: (result: 'win' | 'draw' | 'loss') => {
    set((s) => {
      const next = { ...s };
      if (result === 'win') next.tagTeamWins = s.tagTeamWins + 1;
      else if (result === 'loss') next.tagTeamLosses = s.tagTeamLosses + 1;
      else next.tagTeamDraws = s.tagTeamDraws + 1;
      persist(toPersisted(next as StatsStoreState));
      return next;
    });
  },

  recordGamePlayed: () => {
    set((s) => ({ gamesPlayed: s.gamesPlayed + 1 }));
    persist(toPersisted(get()));
  },

  /**
   * Records a completed game and updates all stats and one-off flags (perfection, comeback, mills in game).
   */
  recordGame: (result: GameResult) => {
    const s = get();
    const today = getToday();
    const { outcome, millsClosed = 0, moveCount = 0, gameTimeSeconds = 0, stonesLost, opponentStonesAtEnd, mode, aiDifficulty } = result;

    const isWin = outcome === 'win';
    const isLoss = outcome === 'loss';
    const isDraw = outcome === 'draw';

    let nextWinStreak = s.winStreak;
    let nextBestStreak = s.bestWinStreak;
    let nextLastPlayed = s.lastPlayedDate;
    if (isWin) {
      nextWinStreak = s.lastPlayedDate === today ? s.winStreak + 1 : s.winStreak + 1;
      nextBestStreak = Math.max(s.bestWinStreak, nextWinStreak);
      nextLastPlayed = today;
    } else if (isLoss || isDraw) {
      nextWinStreak = 0;
      nextLastPlayed = today;
    }

    let nextAILevel = s.maxAILevelBeaten;
    let nextAIStreak = s.aiWinStreak;
    if (mode === 'ai' && aiDifficulty) {
      const level = difficultyToLevel(aiDifficulty);
      if (isWin) {
        nextAILevel = Math.max(s.maxAILevelBeaten, level);
        nextAIStreak = s.aiWinStreak + 1;
      } else if (isLoss) {
        nextAIStreak = 0;
      }
    }

    const nextBlitzWins = mode === 'blitz' && isWin ? s.blitzWins + 1 : s.blitzWins;
    const nextMaxMills = isWin && millsClosed > s.maxMillsInSingleGame ? millsClosed : s.maxMillsInSingleGame;
    const perfect = isWin && stonesLost !== undefined && stonesLost === 0;
    const comeback = isWin && opponentStonesAtEnd !== undefined && opponentStonesAtEnd >= 6;

    let nextFastest = s.fastestWin;
    if (isWin && gameTimeSeconds > 0 && (s.fastestWin === 0 || gameTimeSeconds < s.fastestWin)) {
      nextFastest = gameTimeSeconds;
    }

    const next: PersistedState = {
      ...s,
      gamesPlayed: s.gamesPlayed + 1,
      gamesWon: s.gamesWon + (isWin ? 1 : 0),
      gamesLost: s.gamesLost + (isLoss ? 1 : 0),
      gamesDraw: s.gamesDraw + (isDraw ? 1 : 0),
      winStreak: nextWinStreak,
      bestWinStreak: nextBestStreak,
      lastPlayedDate: nextLastPlayed,
      totalMills: s.totalMills + millsClosed,
      totalMoves: s.totalMoves + moveCount,
      fastestWin: nextFastest,
      maxMillsInSingleGame: nextMaxMills,
      blitzWins: nextBlitzWins,
      lastWinWasPerfect: perfect,
      lastWinWasComeback: comeback,
      maxAILevelBeaten: nextAILevel,
      aiWinStreak: nextAIStreak,
    };

    set(next);
    persist(toPersisted({ ...get(), ...next }));
  },

  /**
   * Records a puzzle result (solved, stars, daily). Updates puzzlesSolved, daily streak, three-star count.
   */
  recordPuzzle: (result: PuzzleResult) => {
    const s = get();
    if (!result.solved) return;

    const today = getToday();
    let nextDailyStreak = s.dailyStreak;
    let nextBestDaily = s.bestDailyStreak;
    let nextLastDaily = s.lastDailyDate;

    if (result.isDaily) {
      if (s.lastDailyDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        nextDailyStreak = s.lastDailyDate === yesterdayStr ? s.dailyStreak + 1 : 1;
      }
      nextBestDaily = Math.max(s.bestDailyStreak, nextDailyStreak);
      nextLastDaily = today;
    }

    const nextThreeStars = result.stars === 3 ? s.puzzlesWithThreeStars + 1 : s.puzzlesWithThreeStars;

    const next: PersistedState = {
      ...s,
      puzzlesSolved: s.puzzlesSolved + 1,
      dailyStreak: nextDailyStreak,
      bestDailyStreak: nextBestDaily,
      lastDailyDate: nextLastDaily,
      puzzlesWithThreeStars: nextThreeStars,
    };

    set(next);
    persist(toPersisted({ ...get(), ...next }));
  },

  /**
   * Builds stats snapshot (including tutorialCompleted from settings), computes achievements, unlocks newly done ones. Returns newly unlocked achievements.
   */
  checkAchievements: () => {
    const s = get();
    const tutorialCompleted = useSettingsStore.getState().tutorialCompleted;
    const stats: StatsForAchievements = {
      gamesPlayed: s.gamesPlayed,
      gamesWon: s.gamesWon,
      gamesLost: s.gamesLost,
      gamesDraw: s.gamesDraw,
      winStreak: s.winStreak,
      bestWinStreak: s.bestWinStreak,
      totalMills: s.totalMills,
      totalMoves: s.totalMoves,
      fastestWin: s.fastestWin,
      puzzlesSolved: s.puzzlesSolved,
      dailyStreak: s.dailyStreak,
      bestDailyStreak: s.bestDailyStreak,
      puzzlesWithThreeStars: s.puzzlesWithThreeStars,
      onlineElo: s.onlineElo,
      onlineGamesPlayed: s.onlineGamesPlayed,
      tutorialCompleted,
      maxAILevelBeaten: s.maxAILevelBeaten,
      aiWinStreak: s.aiWinStreak,
      maxMillsInSingleGame: s.maxMillsInSingleGame,
      blitzWins: s.blitzWins,
      lastWinWasPerfect: s.lastWinWasPerfect,
      lastWinWasComeback: s.lastWinWasComeback,
    };

    const achievements = buildAchievements(stats, s.unlockedAchievementAt);
    const newlyUnlocked: Achievement[] = [];
    let nextUnlocked = { ...s.unlockedAchievementAt };
    const now = Date.now();
    for (const a of achievements) {
      if (a.progress.done && !nextUnlocked[a.id]) {
        nextUnlocked[a.id] = now;
        newlyUnlocked.push({ ...a, unlockedAt: now });
      }
    }
    if (newlyUnlocked.length > 0) {
      set({ unlockedAchievementAt: nextUnlocked });
      persist(toPersisted(get()));
    }
    return newlyUnlocked;
  },

  /**
   * Returns theme IDs unlocked by achievements (neon, pixel, vintage when implemented).
   */
  getUnlockedThemeIds: (): string[] => {
    const u = get().unlockedAchievementAt;
    const ids: string[] = [];
    if (u['zwickmuehlen_meister']) ids.push('neon');
    if (u['blitz_koenig']) ids.push('pixel');
    if (u['puzzle_meister']) ids.push('vintage');
    return ids;
  },

  /**
   * Returns current achievements with progress and unlocked timestamps.
   */
  getAchievements: (): Achievement[] => {
    const s = get();
    const tutorialCompleted = useSettingsStore.getState().tutorialCompleted;
    const stats: StatsForAchievements = {
      gamesPlayed: s.gamesPlayed,
      gamesWon: s.gamesWon,
      gamesLost: s.gamesLost,
      gamesDraw: s.gamesDraw,
      winStreak: s.winStreak,
      bestWinStreak: s.bestWinStreak,
      totalMills: s.totalMills,
      totalMoves: s.totalMoves,
      fastestWin: s.fastestWin,
      puzzlesSolved: s.puzzlesSolved,
      dailyStreak: s.dailyStreak,
      bestDailyStreak: s.bestDailyStreak,
      puzzlesWithThreeStars: s.puzzlesWithThreeStars,
      onlineElo: s.onlineElo,
      onlineGamesPlayed: s.onlineGamesPlayed,
      tutorialCompleted,
      maxAILevelBeaten: s.maxAILevelBeaten,
      aiWinStreak: s.aiWinStreak,
      maxMillsInSingleGame: s.maxMillsInSingleGame,
      blitzWins: s.blitzWins,
      lastWinWasPerfect: s.lastWinWasPerfect,
      lastWinWasComeback: s.lastWinWasComeback,
    };
    return buildAchievements(stats, s.unlockedAchievementAt);
  },

  resetStats: () => {
    set(defaultPersisted);
    persist(defaultPersisted);
  },
}));

/** Hydrate store from AsyncStorage on app start. Call once from root layout. */
export async function hydrateStatsStore(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      useStatsStore.setState({ _hydrated: true });
      return;
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const state = { ...defaultPersisted, ...parsed };
    useStatsStore.setState({ ...state, _hydrated: true });
  } catch {
    useStatsStore.setState({ _hydrated: true });
  }
}
