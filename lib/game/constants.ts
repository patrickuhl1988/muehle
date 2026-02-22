/**
 * Board constants for Mühle: positions 0-23, adjacency, mill lines.
 * Three concentric squares connected at midpoints.
 *
 * Layout (positions):
 * 0 -------- 1 -------- 2
 * |          |          |
 * |  8 ----- 9 ---- 10  |
 * |  |       |       |   |
 * |  | 16 - 17 - 18  |   |
 * 7--15             11--3
 * |  | 22 - 21 - 20  |   |
 * |  |       |       |   |
 * |  14 --- 13 --- 12    |
 * |          |          |
 * 6 -------- 5 -------- 4
 */

import type { MillLine, Position } from './types';

/** Number of board positions. */
export const BOARD_SIZE = 24;

/** Stones per player at game start (standard mode). */
export const DEFAULT_STONES_PER_PLAYER = 9;

/** Stones per player in Tag Team mode (smaller boards). */
export const TAG_TEAM_STONES_PER_PLAYER = 7;

/** @deprecated Use DEFAULT_STONES_PER_PLAYER. Kept for backwards compatibility. */
export const INITIAL_STONES = DEFAULT_STONES_PER_PLAYER;

/** Adjacency: for each position, list of adjacent positions (one step). */
export const ADJACENCY: Record<Position, Position[]> = {
  0: [1, 7],
  1: [0, 2, 9],
  2: [1, 3],
  3: [2, 4, 11],
  4: [3, 5],
  5: [4, 6, 13],
  6: [5, 7],
  7: [0, 6, 15],
  8: [9, 15],
  9: [1, 8, 10, 17],
  10: [9, 11],
  11: [3, 10, 12, 19],
  12: [11, 13],
  13: [5, 12, 14, 21],
  14: [13, 15],
  15: [7, 8, 14, 23],
  16: [17, 23],
  17: [9, 16, 18],
  18: [17, 19],
  19: [11, 18, 20],
  20: [19, 21],
  21: [13, 20, 22],
  22: [21, 23],
  23: [15, 16, 22],
};

/** All 16 mill lines (three-in-a-row). */
export const MILL_LINES: MillLine[] = [
  [0, 1, 2],
  [2, 3, 4],
  [4, 5, 6],
  [6, 7, 0],
  [8, 9, 10],
  [10, 11, 12],
  [12, 13, 14],
  [14, 15, 8],
  [16, 17, 18],
  [18, 19, 20],
  [20, 21, 22],
  [22, 23, 16],
  [1, 9, 17],
  [3, 11, 19],
  [5, 13, 21],
  [7, 15, 23],
];
