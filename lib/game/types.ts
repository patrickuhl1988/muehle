/**
 * Game types for Mühle (Nine Men's Morris).
 * All type definitions used by the game engine. No React/UI dependencies.
 */

/** Board position index (0-23). */
export type Position = number;

/** Player identifier. */
export type Player = 1 | 2;

/** Phase of the game: Setzen, Ziehen, Springen. */
export type Phase = 'placing' | 'moving' | 'flying';

/** Board state: 24 positions, 0 = empty, 1 = player1, 2 = player2. */
export type BoardState = (0 | 1 | 2)[];

/** Single mill line: three positions that form a mill. */
export type MillLine = [Position, Position, Position];

/**
 * Recorded move with type and optional from/removed.
 */
export interface Move {
  type: 'place' | 'move' | 'remove';
  player: Player;
  from?: Position;
  to: Position;
  removed?: Position;
  formedMill: boolean;
}

/**
 * Full game state. Immutable; engine returns new state on each move.
 */
export interface GameState {
  board: BoardState;
  currentPlayer: Player;
  phase: Phase;
  /** Stones still to place (at start each player has 9). */
  stonesInHand: { 1: number; 2: number };
  stonesOnBoard: { 1: number; 2: number };
  /** True when current player just formed a mill and must remove an opponent stone. */
  mustRemove: boolean;
  /** In moving/flying phase: stone selected to move (null = none selected). */
  selectedStone: Position | null;
  moveHistory: Move[];
  moveCount: number;
  gameOver: boolean;
  winner: Player | null;
  isDraw: boolean;
  /** Reason for draw: threefold repetition or 40 moves without a mill. */
  drawReason?: 'repetition' | 'fortyMoveRule';
  lastMove: Move | null;
  /** Move number when last mill was formed (legacy; 40-move rule uses movesSinceLastMill). */
  lastMillAtMove: number;
  /** Moves (in moving/flying only) since last mill; 40 = draw. */
  movesSinceLastMill: number;
  /** Hash -> count for position repetition (3-fold = draw). */
  positionCount: Record<string, number>;
  /** When true, draw rules (repetition, 40-move) are not applied (e.g. puzzle mode). */
  skipDrawDetection?: boolean;
}

/**
 * Puzzle definition for puzzle mode.
 */
export interface PuzzleDefinition {
  id: string;
  board: BoardState;
  currentPlayer: Player;
  phase: Phase;
  stonesInHand: { 1: number; 2: number };
  objective: 'win_in_1' | 'win_in_2' | 'win_in_3' | 'defend' | 'maximize';
  solution: Move[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
}

/** Game mode (UI/context). */
export type GameMode = 'ai' | 'local' | 'online' | 'blitz' | 'tagteam';

/** AI difficulty (maps to levels 1–5 in ai.ts). */
export type AIDifficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'unfair';

/**
 * App-friendly puzzle (id, title, difficulty, solution as moves).
 */
export interface Puzzle {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  board: BoardState;
  currentPlayer: Player;
  phase: Phase;
  stonesInHand: { 1: number; 2: number };
  stonesOnBoard: { 1: number; 2: number };
  solution: Move[];
  hint?: string;
}
