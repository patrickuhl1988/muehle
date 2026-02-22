/**
 * Board helpers for Mühle. Pure functions only – no UI, no side effects.
 */

import { ADJACENCY, BOARD_SIZE, MILL_LINES } from './constants';
import type { BoardState, Player, Position } from './types';

/**
 * Returns all mill lines (triples) that contain the given position.
 */
export function getMillsForPosition(position: Position): number[][] {
  return MILL_LINES.filter((line) => line.includes(position)).map((line) => [...line]);
}

/**
 * Returns true if positions a and b are adjacent on the board.
 */
export function isAdjacent(a: Position, b: Position): boolean {
  const adj = ADJACENCY[a as keyof typeof ADJACENCY];
  return adj !== undefined && adj.includes(b);
}

/**
 * Returns all positions adjacent to the given position.
 */
export function getAdjacentPositions(position: Position): Position[] {
  return (ADJACENCY[position as keyof typeof ADJACENCY] ?? []) as Position[];
}

/**
 * Returns positions of all stones belonging to the given player.
 */
export function getPlayerStones(board: BoardState, player: Player): Position[] {
  const positions: Position[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === player) positions.push(i as Position);
  }
  return positions;
}

/**
 * Counts stones on the board for the given player.
 */
export function countStones(board: BoardState, player: Player): number {
  return board.filter((v) => v === player).length;
}

/**
 * Creates a hash string for the board state plus current player (for repetition detection).
 */
export function boardToHash(board: BoardState, currentPlayer: Player): string {
  const b = board.join('');
  return `${b}-${currentPlayer}`;
}

/**
 * Creates an empty board (all zeros).
 */
export function createEmptyBoard(): BoardState {
  return Array(BOARD_SIZE).fill(0) as BoardState;
}

/**
 * Checks if the given position is part of a mill for the given player.
 */
export function isInMill(board: BoardState, position: Position, player: Player): boolean {
  return MILL_LINES.some(
    (line) => line.includes(position) && line.every((p) => board[p] === player)
  );
}
