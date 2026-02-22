/**
 * Core game engine for Mühle (Nine Men's Morris).
 * Pure TypeScript – no React/UI. All functions immutable.
 */

import { BOARD_SIZE, DEFAULT_STONES_PER_PLAYER } from './constants';
import {
  createEmptyBoard,
  getAdjacentPositions,
  getPlayerStones,
  countStones,
  isInMill,
  boardToHash,
} from './board';
import type { BoardState, GameState, Move, Player, Position } from './types';

const FORTY_MOVE_DRAW = 40;
const REPETITION_DRAW = 3;

/**
 * Returns the opponent player.
 */
export function getOpponent(player: Player): Player {
  return player === 1 ? 2 : 1;
}

/**
 * Creates initial game state: empty board, player 1 starts, placing phase.
 * @param stonesPerPlayer Stones each player has to place (default 9; use 7 for Tag Team).
 */
export function createInitialState(stonesPerPlayer: number = DEFAULT_STONES_PER_PLAYER): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: stonesPerPlayer, 2: stonesPerPlayer },
    stonesOnBoard: { 1: 0, 2: 0 },
    mustRemove: false,
    selectedStone: null,
    moveHistory: [],
    moveCount: 0,
    gameOver: false,
    winner: null,
    isDraw: false,
    lastMove: null,
    lastMillAtMove: -1,
    movesSinceLastMill: 0,
    positionCount: {},
  };
}

/**
 * Checks whether the given position is part of a mill for the given player.
 */
export function checkMill(board: BoardState, position: Position, player: Player): boolean {
  return isInMill(board, position, player);
}

/**
 * Returns empty positions where placing the current player's stone would NOT form a mill.
 * Used for Tag Team bonus stone placement (bonus stone must not close a mill).
 */
export function getValidBonusPlacements(state: GameState): Position[] {
  const { board, currentPlayer } = state;
  const empty: Position[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] !== 0) continue;
    const pos = i as Position;
    const boardAfter = [...board] as BoardState;
    boardAfter[pos] = currentPlayer;
    if (!checkMill(boardAfter, pos, currentPlayer)) empty.push(pos);
  }
  return empty;
}

/**
 * Returns positions of opponent stones that may be removed after closing a mill.
 * Normal rule: stones that are part of an opponent's mill are protected and may NOT be removed.
 * Exception: if ALL opponent stones are in mills (no unprotected stone exists), the player
 * may remove ANY opponent stone, including one from a mill.
 */
export function getRemovableStones(state: GameState): Position[] {
  const opponent = getOpponent(state.currentPlayer);
  const board = state.board;
  const opponentStones = getPlayerStones(board, opponent);
  if (opponentStones.length === 0) return [];
  const unprotected = opponentStones.filter((pos) => !isInMill(board, pos, opponent));
  if (unprotected.length > 0) return unprotected;
  return opponentStones;
}

/**
 * Returns true if the given player (default: current player) has at least one legal move.
 * Used for game-over detection (player blocked = no valid moves) and UI messages.
 */
export function hasValidMoves(state: GameState, player?: Player): boolean {
  const p = player ?? state.currentPlayer;
  const stateForPlayer = p === state.currentPlayer ? state : { ...state, currentPlayer: p };
  if (stateForPlayer.mustRemove) return getRemovableStones(stateForPlayer).length > 0;
  if (stateForPlayer.phase === 'placing') {
    if (stateForPlayer.stonesInHand[p] <= 0) return false;
    return stateForPlayer.board.some((v) => v === 0);
  }
  const myStones = getPlayerStones(stateForPlayer.board, p);
  const canFly =
    stateForPlayer.phase === 'flying' && stateForPlayer.stonesOnBoard[p] === 3;
  for (const from of myStones) {
    const targets = canFly
      ? (stateForPlayer.board
          .map((v, i) => (v === 0 ? (i as Position) : -1))
          .filter((i) => i >= 0) as Position[])
      : getAdjacentPositions(from).filter((pos) => stateForPlayer.board[pos] === 0);
    if (targets.length > 0) return true;
  }
  return false;
}

/** Internal alias for checkGameOver. */
function hasAnyMove(state: GameState): boolean {
  return hasValidMoves(state);
}

/**
 * Returns valid target positions for the current player (where to place, move to, or which stone to remove).
 * When phase is moving/flying and selectedStone is null, returns [] (UI must handle stone selection separately).
 */
export function getValidMoves(state: GameState): Position[] {
  if (state.gameOver) return [];

  if (state.mustRemove) return getRemovableStones(state);

  const { board, currentPlayer, phase, stonesInHand, stonesOnBoard, selectedStone } = state;

  if (phase === 'placing') {
    if (stonesInHand[currentPlayer] <= 0) return [];
    const empty: Position[] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (board[i] === 0) empty.push(i as Position);
    }
    return empty;
  }

  if (phase === 'moving' || phase === 'flying') {
    if (selectedStone === null) return [];
    const canFly = phase === 'flying' && stonesOnBoard[currentPlayer] === 3;
    if (canFly) {
      const empty: Position[] = [];
      for (let i = 0; i < BOARD_SIZE; i++) {
        if (board[i] === 0) empty.push(i as Position);
      }
      return empty;
    }
    return getAdjacentPositions(selectedStone).filter((p) => board[p] === 0) as Position[];
  }

  return [];
}

/**
 * Updates position count and returns new count record. Detects 3-fold repetition.
 */
function updatePositionCount(
  state: GameState,
  hash: string
): { positionCount: Record<string, number>; isRepetitionDraw: boolean } {
  const count = (state.positionCount[hash] ?? 0) + 1;
  const next = { ...state.positionCount, [hash]: count };
  return { positionCount: next, isRepetitionDraw: count >= REPETITION_DRAW };
}

/**
 * Applies a move to the given position and returns new state. Immutable.
 * If mustRemove: position = stone to remove.
 * Otherwise: position = where to place (placing) or where to move to (moving/flying).
 */
export function makeMove(state: GameState, position: Position): GameState {
  if (state.gameOver) return state;

  const opponent = getOpponent(state.currentPlayer);

  if (state.mustRemove) {
    const removable = getRemovableStones(state);
    if (!removable.includes(position)) return state;
    const board = [...state.board] as BoardState;
    board[position] = 0;
    const stonesOnBoard = { 1: countStones(board, 1), 2: countStones(board, 2) };
    const move: Move = {
      type: 'remove',
      player: state.currentPlayer,
      to: position,
      formedMill: false,
    };
    const moveHistory = [...state.moveHistory, move];
    const nextPlayer = opponent;
    const moveCount = state.moveCount + 1;
    const phase = computePhase({ ...state, board, stonesOnBoard });
    const positionCount = state.skipDrawDetection ? state.positionCount : updatePositionCount(state, `${boardToHash(board, nextPlayer)}|${phase}`).positionCount;
    const next: GameState = {
      ...state,
      board,
      currentPlayer: nextPlayer,
      phase,
      stonesOnBoard,
      mustRemove: false,
      selectedStone: null,
      moveHistory,
      moveCount,
      lastMove: move,
      positionCount,
      movesSinceLastMill: state.movesSinceLastMill ?? 0,
    };
    const result = checkGameOver(next);
    return { ...next, ...result };
  }

  if (state.phase === 'placing') {
    if (state.stonesInHand[state.currentPlayer] <= 0 || state.board[position] !== 0) return state;
    const board = [...state.board] as BoardState;
    board[position] = state.currentPlayer;
    const stonesInHand = { ...state.stonesInHand };
    stonesInHand[state.currentPlayer] = Math.max(0, stonesInHand[state.currentPlayer] - 1);
    const stonesOnBoard = { 1: countStones(board, 1), 2: countStones(board, 2) };
    const formedMill = checkMill(board, position, state.currentPlayer);
    const move: Move = {
      type: 'place',
      player: state.currentPlayer,
      to: position,
      formedMill,
    };
    const moveHistory = [...state.moveHistory, move];
    const moveCount = state.moveCount + 1;
    const lastMillAtMove = formedMill ? moveCount : state.lastMillAtMove;
    const next: GameState = {
      ...state,
      board,
      currentPlayer: formedMill ? state.currentPlayer : opponent,
      stonesInHand,
      stonesOnBoard,
      mustRemove: formedMill,
      moveHistory,
      moveCount,
      lastMove: move,
      lastMillAtMove,
      positionCount: state.positionCount,
      movesSinceLastMill: state.movesSinceLastMill ?? 0,
    };
    if (formedMill) return next;
    const phase = computePhase(next);
    const full: GameState = { ...next, phase };
    const positionCount = state.skipDrawDetection ? full.positionCount : updatePositionCount(full, `${boardToHash(board, full.currentPlayer)}|${phase}`).positionCount;
    const withCount: GameState = { ...full, positionCount };
    const result = checkGameOver(withCount);
    return { ...withCount, ...result };
  }

  if (state.phase === 'moving' || state.phase === 'flying') {
    const from = state.selectedStone;
    if (from === null || state.board[from] !== state.currentPlayer || state.board[position] !== 0)
      return state;
    const board = [...state.board] as BoardState;
    board[from] = 0;
    board[position] = state.currentPlayer;
    const stonesOnBoard = { 1: countStones(board, 1), 2: countStones(board, 2) };
    const formedMill = checkMill(board, position, state.currentPlayer);
    const move: Move = {
      type: 'move',
      player: state.currentPlayer,
      from,
      to: position,
      formedMill,
    };
    const moveHistory = [...state.moveHistory, move];
    const moveCount = state.moveCount + 1;
    const lastMillAtMove = formedMill ? moveCount : state.lastMillAtMove;
    const movesSinceLastMill = state.skipDrawDetection
      ? (state.movesSinceLastMill ?? 0)
      : state.phase === 'moving' || state.phase === 'flying'
        ? formedMill ? 0 : (state.movesSinceLastMill ?? 0) + 1
        : (state.movesSinceLastMill ?? 0);
    const next: GameState = {
      ...state,
      board,
      currentPlayer: formedMill ? state.currentPlayer : opponent,
      stonesOnBoard,
      mustRemove: formedMill,
      selectedStone: null,
      moveHistory,
      moveCount,
      lastMove: move,
      lastMillAtMove,
      movesSinceLastMill,
      positionCount: state.positionCount,
    };
    if (formedMill) return next;
    const phase = computePhase(next);
    const full: GameState = { ...next, phase };
    const positionCount = state.skipDrawDetection ? full.positionCount : updatePositionCount(full, `${boardToHash(board, full.currentPlayer)}|${phase}`).positionCount;
    const withCount: GameState = { ...full, positionCount };
    const result = checkGameOver(withCount);
    return { ...withCount, ...result };
  }

  return state;
}

/**
 * Computes phase after a move: placing → moving when both have placed all; moving → flying when a player has 3 stones.
 */
export function computePhase(state: GameState): 'placing' | 'moving' | 'flying' {
  const { stonesInHand, stonesOnBoard } = state;
  if (stonesInHand[1] > 0 || stonesInHand[2] > 0) return 'placing';
  if (stonesOnBoard[1] <= 3 || stonesOnBoard[2] <= 3) return 'flying';
  return 'moving';
}

/**
 * Checks game over and draw conditions. Returns { gameOver, winner, isDraw, drawReason? }.
 */
export function checkGameOver(
  state: GameState
): { gameOver: boolean; winner: Player | null; isDraw: boolean; drawReason?: 'repetition' | 'fortyMoveRule' } {
  const opponent = getOpponent(state.currentPlayer);
  const myStones = state.stonesOnBoard[state.currentPlayer];
  const oppStones = state.stonesOnBoard[opponent];
  const oppInHand = state.stonesInHand[opponent];

  if (oppStones < 3 && oppInHand === 0) {
    return { gameOver: true, winner: state.currentPlayer, isDraw: false };
  }
  if (myStones < 3 && state.stonesInHand[state.currentPlayer] === 0) {
    return { gameOver: true, winner: opponent, isDraw: false };
  }

  if (!state.skipDrawDetection) {
    const movesSince = state.movesSinceLastMill ?? 0;
    if (movesSince >= FORTY_MOVE_DRAW && (state.phase === 'moving' || state.phase === 'flying')) {
      return { gameOver: true, winner: null, isDraw: true, drawReason: 'fortyMoveRule' };
    }
    const repetition = Object.values(state.positionCount).some((c) => c >= REPETITION_DRAW);
    if (repetition) {
      return { gameOver: true, winner: null, isDraw: true, drawReason: 'repetition' };
    }
  }

  // Only in moving/flying can "no valid moves" end the game; in placing, phase may not have been updated yet.
  if (
    !state.mustRemove &&
    (state.phase === 'moving' || state.phase === 'flying') &&
    state.stonesInHand[state.currentPlayer] === 0
  ) {
    if (!hasAnyMove(state)) {
      return { gameOver: true, winner: opponent, isDraw: false };
    }
  }

  return { gameOver: false, winner: null, isDraw: false };
}

/**
 * Applies a full Move to the given state and returns the new state.
 * Used for puzzle mode to advance state by solution moves.
 */
export function applyMove(state: GameState, move: Move): GameState {
  if (move.type === 'remove') return makeMove(state, move.to);
  if (move.type === 'place') return makeMove(state, move.to);
  if (move.type === 'move' && move.from !== undefined) {
    return makeMove({ ...state, selectedStone: move.from }, move.to);
  }
  return state;
}
