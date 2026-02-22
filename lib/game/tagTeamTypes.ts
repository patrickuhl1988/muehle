/**
 * Types for Tag Team mode: 2v2 on two linked boards with stone transfer.
 */

import type { GameState, Player } from './types';
import type { AIDifficulty } from './types';

export type BoardId = 'A' | 'B';

/** Team 1 = human team (Board A: human, Board B: AI partner or human). Team 2 = opponent AIs. */
export interface TagTeamConfig {
  /** Team 1: human on Board A is player 1, partner on Board B is player 2. */
  team1: {
    boardAPlayer: Player;   // 1 (human)
    boardBPlayer: Player;   // 2 (AI partner or human when boardBPartner === 'human')
    /** Who plays Team 1 on Board B: AI (default) or the same human (plays both boards). */
    boardBPartner?: 'ai' | 'human';
    boardBAiDifficulty: AIDifficulty;
  };
  /** Team 2: Board A AI is player 2, Board B AI is player 1. */
  team2: {
    boardAAiDifficulty: AIDifficulty;
    boardBAiDifficulty: AIDifficulty;
  };
  /** Max bonus stones per player (per board) per game. Default 3. */
  maxBonusStones?: number;
}

/** Bonus state for one side (team 1 = player, team 2 = opponent) on one board. Max 3 total per game. */
export interface BoardBonusSide {
  available: number;
  totalGenerated: number;
}

/** Bonus stones for both sides on one board. */
export interface BoardBonus {
  player: BoardBonusSide;
  opponent: BoardBonusSide;
}

/** Per-board, per-side bonus stones. Each side (player/opponent) has max 3 per game. */
export type BonusStonesPerBoard = {
  boardA: BoardBonus;
  boardB: BoardBonus;
};

/** Full Tag Team game state. */
export interface TagTeamState {
  boardA: GameState;
  boardB: GameState;
  config: TagTeamConfig;
  /** Bonus stones per board, per side (player = team 1, opponent = team 2). Max 3 totalGenerated per side per board. */
  bonusStones: BonusStonesPerBoard;
  /** Turn order 0–3: 0 = Board A Team 1, 1 = Board B Team 2, 2 = Board A Team 2, 3 = Board B Team 1. */
  turnOrder: number;
  /** If set, this board's current player must place a bonus stone before normal move. */
  mustPlaceBonus: BoardId | null;
  gameOver: boolean;
  /** 1 = team 1 won match, 2 = team 2 won, null = draw or not yet finished. */
  winningTeam: 1 | 2 | null;
  /** Set when both boards are finished: win = 2-0, loss = 0-2, draw = 1-1. */
  matchResult: 'win' | 'draw' | 'loss' | null;
  boardAFinished: boolean;
  boardBFinished: boolean;
  /** When true, AI moves run with minimal delay (fast-finish remaining board). */
  fastFinishActive?: boolean;
  /** Total rounds (full cycles 0->1->2->3) for stats. */
  roundsPlayed: number;
  /** Team captures (stones removed by that team) for stats. */
  teamCaptures: { 1: number; 2: number };
  /** History of state snapshots before each human move on Board A (for undo). */
  stateHistoryForUndo: TagTeamUndoSnapshot[];
  /** Number of undos used in this game (max 2). */
  undosUsedThisGame: number;
}

/** Snapshot for undo (state before human move on Board A). */
export interface TagTeamUndoSnapshot {
  boardA: GameState;
  boardB: GameState;
  turnOrder: number;
  mustPlaceBonus: BoardId | null;
  bonusStones: BonusStonesPerBoard;
  teamCaptures: { 1: number; 2: number };
  roundsPlayed: number;
  boardAFinished: boolean;
  boardBFinished: boolean;
}

/** Max bonus stones a player can hold pending at once (UI cap). */
export const MAX_BONUS_STONES = 3;
/** Max bonus stones per player (per board) per game. */
export const MAX_BONUS_STONES_PER_GAME = 3;
