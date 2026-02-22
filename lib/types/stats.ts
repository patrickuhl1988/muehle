/**
 * Types for game and puzzle results used by the stats store.
 */

import type { AIDifficulty } from '../game/types';

/** Outcome of a single game. */
export type GameOutcome = 'win' | 'loss' | 'draw';

/** Result of a completed game for recording stats and achievements. */
export interface GameResult {
  outcome: GameOutcome;
  /** Mills closed by the human (player 1) in this game. */
  millsClosed?: number;
  /** Total move count of the game. */
  moveCount?: number;
  /** Game duration in seconds. */
  gameTimeSeconds?: number;
  /** Stones lost by the winner (for perfection: 0). */
  stonesLost?: number;
  /** Opponent stones on board at game end (for comeback: 6+ when we had 3). */
  opponentStonesAtEnd?: number;
  mode?: 'ai' | 'local' | 'blitz' | 'online';
  aiDifficulty?: AIDifficulty;
}

/** Result of a puzzle attempt for recording stats. */
export interface PuzzleResult {
  solved: boolean;
  /** Stars earned (1–3). */
  stars?: 1 | 2 | 3;
  /** True if this was the daily puzzle. */
  isDaily?: boolean;
}
