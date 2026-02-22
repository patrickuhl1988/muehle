/**
 * Zustand store for puzzle mode: current puzzle, attempts, hints, daily, stars.
 * Implements loadPuzzle, loadDailyPuzzle, attemptMove, getHint, resetPuzzle.
 * Persists completedPuzzles, stars, lastDailyDate, dailyStreak to AsyncStorage.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PuzzleDefinition, GameState, Move, Position } from '../game/types';
import {
  getPuzzleById,
  getDailyPuzzle,
  getLocalDateString,
  puzzleDefinitionToGameState,
} from '../game/puzzles';
import { applyMove, getRemovableStones } from '../game/engine';

/** Result of attemptMove. */
export type AttemptResult = 'correct' | 'wrong' | 'partial';

/** Hint result: positions to highlight (from = stone to move, to = target). */
export type HintResult = { from?: Position; to?: Position } | null;

function moveMatches(user: Move, expected: Move): boolean {
  if (user.type !== expected.type || user.to !== expected.to) return false;
  if (expected.type === 'move') {
    return user.from === expected.from;
  }
  return true;
}

/** Stars by try number (1-based): 3★ = 1st try, 2★ = 2nd–3rd try, 1★ = 4+ or hint used. */
function computeStars(tryNumber: number, hintUsed: boolean): 1 | 2 | 3 {
  if (hintUsed) return 1;
  if (tryNumber === 1) return 3;
  if (tryNumber <= 3) return 2;
  return 1;
}

interface PuzzleStoreState {
  currentPuzzle: PuzzleDefinition | null;
  /** Current board state while solving (advances with correct moves). */
  puzzleState: GameState | null;
  /** Index into solution (number of solution moves already played). */
  solutionIndex: number;
  attempts: number;
  solved: boolean;
  hintUsed: boolean;
  /** For current step: 0 = no hint shown, 1 = showed from (or to for place/remove), 2 = showed to (move only). */
  hintShownStep: number;
  dailyPuzzle: PuzzleDefinition | null;
  dailyStreak: number;
  /** Last date (YYYY-MM-DD) the daily was solved (for streak). */
  lastDailyDate: string | null;
  completedPuzzles: string[];
  stars: Record<string, 1 | 2 | 3>;

  loadPuzzle: (id: string) => void;
  loadDailyPuzzle: () => void;
  attemptMove: (move: Move) => AttemptResult;
  getHint: () => HintResult;
  resetPuzzle: () => void;
  /** In moving/flying phase: set selected stone (or null to deselect). */
  selectStone: (position: Position | null) => void;
  /** Mark daily as solved and update streak. */
  markDailySolved: (attempts: number, hintUsed: boolean) => void;
  /** Get stars for a puzzle id. */
  getStars: (id: string) => 0 | 1 | 2 | 3;
  /** Count completed per difficulty (for unlocking). */
  getCompletedCount: (difficulty: 1 | 2 | 3 | 4 | 5) => number;
}

const STORAGE_KEY = 'muhle_puzzle_progress';

interface PersistedPuzzleProgress {
  completedPuzzles: string[];
  stars: Record<string, 1 | 2 | 3>;
  lastDailyDate: string | null;
  dailyStreak: number;
}

function persist(state: PersistedPuzzleProgress): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

export const usePuzzleStore = create<PuzzleStoreState>((set, get) => ({
  currentPuzzle: null,
  puzzleState: null,
  solutionIndex: 0,
  attempts: 0,
  solved: false,
  hintUsed: false,
  hintShownStep: 0,
  dailyPuzzle: null,
  dailyStreak: 0,
  lastDailyDate: null,
  completedPuzzles: [],
  stars: {},

  loadPuzzle(id: string) {
    const puzzle = getPuzzleById(id);
    if (!puzzle) {
      set({ currentPuzzle: null, puzzleState: null });
      return;
    }
    const state = puzzleDefinitionToGameState(puzzle);
    set({
      currentPuzzle: puzzle,
      puzzleState: state,
      solutionIndex: 0,
      attempts: 0,
      solved: false,
      hintUsed: false,
      hintShownStep: 0,
    });
  },

  loadDailyPuzzle() {
    const daily = getDailyPuzzle();
    const state = puzzleDefinitionToGameState(daily);
    set({
      dailyPuzzle: daily,
      currentPuzzle: daily,
      puzzleState: state,
      solutionIndex: 0,
      attempts: 0,
      solved: false,
      hintUsed: false,
      hintShownStep: 0,
    });
  },

  attemptMove(move: Move): AttemptResult {
    const { currentPuzzle, puzzleState, solutionIndex, attempts, hintUsed } = get();
    if (!currentPuzzle || !puzzleState || currentPuzzle.solution.length === 0) return 'wrong';

    const expected = currentPuzzle.solution[solutionIndex];
    if (!expected) return 'wrong';

    // For remove moves: accept any legally removable stone (engine rules), not only the solution position.
    if (expected.type === 'remove') {
      if (move.type !== 'remove') {
        set({ attempts: attempts + 1 });
        return 'wrong';
      }
      const removable = getRemovableStones(puzzleState);
      if (!removable.includes(move.to)) {
        set({ attempts: attempts + 1 });
        return 'wrong';
      }
      // Valid removal: apply user's choice and advance (same as below).
    } else if (!moveMatches(move, expected)) {
      set({ attempts: attempts + 1 });
      return 'wrong';
    }

    const nextState = applyMove(puzzleState, move);
    const newIndex = solutionIndex + 1;
    const isComplete = newIndex >= currentPuzzle.solution.length;

    if (isComplete) {
      /** Solved on try (attempts + 1): 0 wrong = 1st try, 1 wrong = 2nd try, etc. */
      const tryNumber = attempts + 1;
      const star = computeStars(tryNumber, hintUsed);
      const { completedPuzzles, stars } = get();
      const newCompleted = completedPuzzles.includes(currentPuzzle.id)
        ? completedPuzzles
        : [...completedPuzzles, currentPuzzle.id];
      const newStars = { ...stars, [currentPuzzle.id]: star };
      set({
        puzzleState: nextState,
        solutionIndex: newIndex,
        solved: true,
        completedPuzzles: newCompleted,
        stars: newStars,
      });
      persist({
        completedPuzzles: newCompleted,
        stars: newStars,
        lastDailyDate: get().lastDailyDate,
        dailyStreak: get().dailyStreak,
      });
      return 'correct';
    }

    set({
      puzzleState: nextState,
      solutionIndex: newIndex,
      hintShownStep: 0,
    });
    return 'partial';
  },

  getHint(): HintResult {
    const { currentPuzzle, solutionIndex, hintShownStep } = get();
    if (!currentPuzzle || solutionIndex >= currentPuzzle.solution.length) return null;

    const move = currentPuzzle.solution[solutionIndex];
    set({ hintUsed: true });

    if (move.type === 'move' && move.from !== undefined) {
      if (hintShownStep === 0) {
        set({ hintShownStep: 1 });
        return { from: move.from };
      }
      if (hintShownStep === 1) {
        set({ hintShownStep: 2 });
        return { to: move.to };
      }
      return null;
    }
    if (hintShownStep === 0) {
      set({ hintShownStep: 1 });
      return { to: move.to };
    }
    return null;
  },

  resetPuzzle() {
    const { currentPuzzle } = get();
    if (!currentPuzzle) return;
    const state = puzzleDefinitionToGameState(currentPuzzle);
    set({
      puzzleState: state,
      solutionIndex: 0,
      attempts: 0,
      solved: false,
      hintUsed: false,
      hintShownStep: 0,
    });
  },

  selectStone(position: Position | null) {
    const { puzzleState } = get();
    if (!puzzleState || puzzleState.solved) return;
    set({ puzzleState: { ...puzzleState, selectedStone: position } });
  },

  markDailySolved(attempts: number, hintUsed: boolean) {
    const { lastDailyDate, dailyStreak, currentPuzzle } = get();
    if (!currentPuzzle) return;
    const today = getLocalDateString();
    let newStreak = dailyStreak;
    if (lastDailyDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      newStreak = lastDailyDate === yesterdayStr ? dailyStreak + 1 : 1;
    }
    const newCompleted = get().completedPuzzles.includes(currentPuzzle.id)
      ? get().completedPuzzles
      : [...get().completedPuzzles, currentPuzzle.id];
    const newStars = { ...get().stars, [currentPuzzle.id]: computeStars(attempts, hintUsed) };
    set({
      lastDailyDate: today,
      dailyStreak: newStreak,
      completedPuzzles: newCompleted,
      stars: newStars,
    });
    persist({
      completedPuzzles: newCompleted,
      stars: newStars,
      lastDailyDate: today,
      dailyStreak: newStreak,
    });
  },

  getStars(id: string): 0 | 1 | 2 | 3 {
    const s = get().stars[id];
    return s ?? 0;
  },

  getCompletedCount(difficulty: 1 | 2 | 3 | 4 | 5): number {
    const { completedPuzzles } = get();
    return completedPuzzles.filter((id) => {
      const p = getPuzzleById(id);
      return p?.difficulty === difficulty;
    }).length;
  },
}));

/** Hydrate puzzle progress (completed, stars, daily streak) from AsyncStorage. Call once from root layout. */
export async function hydratePuzzleStore(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as PersistedPuzzleProgress;
    if (
      Array.isArray(data.completedPuzzles) &&
      data.stars &&
      typeof data.stars === 'object' &&
      typeof data.dailyStreak === 'number'
    ) {
      usePuzzleStore.setState({
        completedPuzzles: data.completedPuzzles,
        stars: data.stars,
        lastDailyDate: data.lastDailyDate ?? null,
        dailyStreak: data.dailyStreak,
      });
    }
  } catch {
    // ignore
  }
}
