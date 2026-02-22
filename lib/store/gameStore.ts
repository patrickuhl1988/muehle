/**
 * Zustand store for the active Mühle game.
 * Holds state, validMoves, handlePositionPress, applyAIMove, startGame, undo, etc.
 */

import { create } from 'zustand';
import { createInitialState, getValidMoves, makeMove, getRemovableStones, getOpponent } from '../game/engine';
import { getAIMove, getAIMoveDelay, getAITargetTotalDuration } from '../game/ai';
import type { AIMove } from '../game/ai';
import { getPlayerStones } from '../game/board';
import type { AIDifficulty, GameMode, GameState, Position } from '../game/types';
import type { TimerConfig } from '../game/timerConfig';
import { persistGameStateSync, deleteSavedGame, type SavedGame } from '../utils/savedGame';

/** Result of handlePositionPress for UI feedback (sound, haptics). */
export interface HandlePositionResult {
  handled: boolean;
  action?: 'place' | 'move' | 'remove' | 'select' | 'deselect';
  formedMill?: boolean;
  error?: string;
}

interface GameStoreState {
  state: GameState | null;
  validMoves: Position[];
  mode: GameMode | null;
  aiDifficulty: AIDifficulty;
  gameStartTime: number | null;
  history: GameState[];
  stateHistory: GameState[];
  undosUsedThisGame: number;
  /** Blitz only: config (null if not blitz). */
  timerConfig: TimerConfig | null;
  /** Blitz only: seconds left per player. */
  timeLeftP1: number;
  timeLeftP2: number;
  /** Blitz only: last timestamp when we ticked (ms). */
  lastBlitzTickAt: number | null;

  /** Start a new game. For blitz, pass timerConfig. */
  startGame: (mode: GameMode, aiDifficulty?: AIDifficulty, timerConfig?: TimerConfig) => void;
  /** Restore from a saved AI game (e.g. after app reopen). */
  restoreGame: (saved: SavedGame) => void;
  /** Reset store (state = null, clear history). */
  resetGame: () => void;
  /** Start new game with given mode/difficulty (same as startGame but used after game over). */
  newGame: (mode: GameMode, aiDifficulty?: AIDifficulty, timerConfig?: TimerConfig) => void;
  /** Blitz only: tick timer (call from UI interval). Pauses during mustRemove. Timeout = loss. */
  tickBlitzTimer: () => void;
  /** Handle tap on a board position. Returns result for UI feedback. */
  handlePositionPress: (position: Position) => HandlePositionResult;
  /** Apply one AI move (called by useGame after delay). */
  applyAIMove: () => void;
  /** Undo last move (only in local/human vs human or for testing). */
  undoMove: () => void;
  /** Undo last 2 moves (player + AI) in AI mode. Restores to state before player's last move. */
  undoTwoMoves: () => void;
  /** Select a stone in moving/flying phase (optional; handlePositionPress can do it). */
  selectStone: (position: Position | null) => void;
}

const MAX_UNDO_HISTORY = 10;
const MAX_UNDOS_PER_GAME = 2;

function computeValidMoves(state: GameState | null): Position[] {
  if (!state || state.gameOver) return [];
  return getValidMoves(state);
}

function saveGameIfAi(getSnapshot: () => GameStoreState): void {
  const g = getSnapshot();
  const state = g.state;
  const mode = g.mode;
  if (mode !== 'ai' || !state) return;
  if (state.gameOver) {
    deleteSavedGame();
    return;
  }
  const elapsedTime = g.gameStartTime != null ? Math.floor((Date.now() - g.gameStartTime) / 1000) : 0;
  persistGameStateSync({
    gameState: state,
    mode: 'ai',
    aiDifficulty: g.aiDifficulty,
    humanPlayer: 1,
    stateHistory: g.stateHistory ?? [],
    undosUsedThisGame: g.undosUsedThisGame ?? 0,
    elapsedTime,
    savedAt: new Date().toISOString(),
  });
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  state: null,
  validMoves: [],
  mode: null,
  aiDifficulty: 'medium',
  gameStartTime: null,
  history: [],
  stateHistory: [],
  undosUsedThisGame: 0,
  timerConfig: null,
  timeLeftP1: 0,
  timeLeftP2: 0,
  lastBlitzTickAt: null,

  startGame(mode, aiDifficulty, timerConfig) {
    deleteSavedGame();
    const initialState = createInitialState();
    const difficulty = aiDifficulty ?? get().aiDifficulty;
    const now = Date.now();
    const isBlitz = mode === 'blitz' && timerConfig;
    set({
      state: initialState,
      validMoves: computeValidMoves(initialState),
      mode,
      aiDifficulty: difficulty,
      gameStartTime: now,
      history: [initialState],
      stateHistory: [],
      undosUsedThisGame: 0,
      timerConfig: isBlitz ? timerConfig : null,
      timeLeftP1: isBlitz ? timerConfig.secondsPerPlayer : 0,
      timeLeftP2: isBlitz ? timerConfig.secondsPerPlayer : 0,
      lastBlitzTickAt: isBlitz ? now : null,
    });
  },

  restoreGame(saved: SavedGame) {
    const gameStartTime = Date.now() - saved.elapsedTime * 1000;
    set({
      state: saved.gameState,
      validMoves: computeValidMoves(saved.gameState),
      mode: 'ai',
      aiDifficulty: saved.aiDifficulty,
      gameStartTime,
      history: [saved.gameState],
      stateHistory: saved.stateHistory ?? [],
      undosUsedThisGame: saved.undosUsedThisGame ?? 0,
      timerConfig: null,
      timeLeftP1: 0,
      timeLeftP2: 0,
      lastBlitzTickAt: null,
    });
  },

  resetGame() {
    set({
      state: null,
      validMoves: [],
      mode: null,
      gameStartTime: null,
      history: [],
      stateHistory: [],
      undosUsedThisGame: 0,
      timerConfig: null,
      timeLeftP1: 0,
      timeLeftP2: 0,
      lastBlitzTickAt: null,
    });
  },

  newGame(mode, aiDifficulty, timerConfig) {
    get().startGame(mode, aiDifficulty, timerConfig);
  },

  tickBlitzTimer() {
    const { state, mode, timerConfig, timeLeftP1, timeLeftP2, lastBlitzTickAt } = get();
    if (mode !== 'blitz' || !timerConfig || !state || state.gameOver || lastBlitzTickAt == null) return;
    if (state.mustRemove) return;
    const now = Date.now();
    const elapsedSec = (now - lastBlitzTickAt) / 1000;
    const current = state.currentPlayer;
    const currentTime = current === 1 ? timeLeftP1 : timeLeftP2;
    const newTime = Math.max(0, currentTime - elapsedSec);
    if (current === 1) {
      if (newTime <= 0) {
        set({
          state: { ...state, gameOver: true, winner: 2 },
          timeLeftP1: 0,
          lastBlitzTickAt: now,
        });
        return;
      }
      set({ timeLeftP1: newTime, lastBlitzTickAt: now });
    } else {
      if (newTime <= 0) {
        set({
          state: { ...state, gameOver: true, winner: 1 },
          timeLeftP2: 0,
          lastBlitzTickAt: now,
        });
        return;
      }
      set({ timeLeftP2: newTime, lastBlitzTickAt: now });
    }
  },

  handlePositionPress(position) {
    const { state, mode } = get();
    if (!state || state.gameOver) {
      return { handled: false, error: 'Kein laufendes Spiel.' };
    }
    if (mode === 'ai' && state.currentPlayer === 2) {
      return { handled: false, error: 'KI ist am Zug.' };
    }

    if (state.mustRemove) {
      const removable = getRemovableStones(state);
      if (!removable.includes(position)) {
        return { handled: false, error: 'Ungültiger Stein zum Schlagen.' };
      }
      const { stateHistory: sh } = get();
      const nextHistory = [...sh, JSON.parse(JSON.stringify(state))].slice(-MAX_UNDO_HISTORY);
      const next = makeMove(state, position);
      const history = [...get().history, next];
      set({ state: next, validMoves: computeValidMoves(next), history, stateHistory: nextHistory });
      saveGameIfAi(get);
      return { handled: true, action: 'remove' };
    }

    const validMoves = getValidMoves(state);
    if (state.phase === 'placing') {
      if (!validMoves.includes(position)) {
        return { handled: false, error: 'Ungültige Position.' };
      }
      const { stateHistory: sh } = get();
      const nextHistory = [...sh, JSON.parse(JSON.stringify(state))].slice(-MAX_UNDO_HISTORY);
      const next = makeMove(state, position);
      const history = [...get().history, next];
      set({ state: next, validMoves: computeValidMoves(next), history, stateHistory: nextHistory });
      saveGameIfAi(get);
      return {
        handled: true,
        action: 'place',
        formedMill: next.lastMove?.formedMill ?? false,
      };
    }

    if (state.phase === 'moving' || state.phase === 'flying') {
      const myStones = getPlayerStones(state.board, state.currentPlayer);
      if (state.selectedStone === null) {
        if (myStones.includes(position)) {
          set({
            state: { ...state, selectedStone: position },
            validMoves: getValidMoves({ ...state, selectedStone: position }),
          });
          return { handled: true, action: 'select' };
        }
        return { handled: false };
      }
      if (position === state.selectedStone) {
        set({
          state: { ...state, selectedStone: null },
          validMoves: [],
        });
        return { handled: true, action: 'deselect' };
      }
      if (validMoves.includes(position)) {
        const { stateHistory: sh } = get();
        const nextHistory = [...sh, JSON.parse(JSON.stringify(state))].slice(-MAX_UNDO_HISTORY);
        const next = makeMove(state, position);
        const history = [...get().history, next];
        set({ state: next, validMoves: computeValidMoves(next), history, stateHistory: nextHistory });
        saveGameIfAi(get);
        return {
          handled: true,
          action: 'move',
          formedMill: next.lastMove?.formedMill ?? false,
        };
      }
      return { handled: false, error: 'Ungültiger Zug.' };
    }

    return { handled: false };
  },

  applyAIMove() {
    const { state, mode, aiDifficulty, stateHistory: sh } = get();
    if (!state || mode !== 'ai' || state.gameOver || state.currentPlayer !== 2) return;

    const thinkStart = Date.now();
    const move = getAIMove(state, aiDifficulty);
    if (!move) return;

    const thinkDuration = Date.now() - thinkStart;
    const target = getAITargetTotalDuration(aiDifficulty);
    const randomTarget = target.min + Math.random() * (target.max - target.min);
    const delay = Math.max(100, Math.round(randomTarget - thinkDuration));

    const doApply = (m: AIMove) => {
      const s = get();
      if (!s.state || s.mode !== 'ai' || s.state.gameOver || s.state.currentPlayer !== 2) return;
      const st = s.state;
      let nextHistory = [...(s.stateHistory ?? []), JSON.parse(JSON.stringify(st))].slice(-MAX_UNDO_HISTORY);
      const stateWithSel = m.from != null ? { ...st, selectedStone: m.from } : st;
      let next = makeMove(stateWithSel, m.position);
      if (next.mustRemove && m.remove !== undefined) {
        nextHistory = [...nextHistory, JSON.parse(JSON.stringify(next))].slice(-MAX_UNDO_HISTORY);
        next = makeMove(next, m.remove);
      }
      const history = [...get().history, next];
      set({ state: next, validMoves: computeValidMoves(next), history, stateHistory: nextHistory });
      saveGameIfAi(get);
    };

    if (delay <= 0) {
      doApply(move);
    } else {
      setTimeout(() => doApply(move), delay);
    }
  },

  undoMove() {
    const { history } = get();
    if (history.length <= 1) return;
    const prev = history[history.length - 2];
    set({
      state: prev,
      validMoves: computeValidMoves(prev),
      history: history.slice(0, -1),
    });
  },

  undoTwoMoves() {
    const { state, mode, stateHistory, history, undosUsedThisGame } = get();
    if (mode !== 'ai' || !state || state.currentPlayer !== 1 || state.mustRemove || state.gameOver) return;
    if (stateHistory.length < 2 || undosUsedThisGame >= MAX_UNDOS_PER_GAME) return;

    let stepsBack = 0;
    let targetState: GameState | null = null;
    const stack = [...stateHistory];

    while (stack.length > 0 && stepsBack < 5) {
      const popped = stack.pop();
      stepsBack++;
      if (popped && popped.currentPlayer === 1 && !popped.mustRemove) {
        targetState = popped;
        break;
      }
    }

    if (targetState == null) return;

    const newStateHistory = stateHistory.slice(0, stateHistory.length - stepsBack);
    const newHistory = history.slice(0, history.length - stepsBack);
    set({
      state: targetState,
      validMoves: computeValidMoves(targetState),
      history: newHistory,
      stateHistory: newStateHistory,
      undosUsedThisGame: undosUsedThisGame + 1,
    });
    saveGameIfAi(get);
  },

  selectStone(position) {
    const { state } = get();
    if (!state || state.gameOver) return;
    if (state.mustRemove || state.phase === 'placing') return;
    const next = { ...state, selectedStone: position };
    set({
      state: next,
      validMoves: position != null ? getValidMoves(next) : [],
    });
  },
}));

/** Returns delay in ms for AI move (for use in useGame). */
export { getAIMoveDelay };
