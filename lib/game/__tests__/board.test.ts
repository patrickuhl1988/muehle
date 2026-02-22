/**
 * Board helper tests: getMillsForPosition, isAdjacent, getAdjacentPositions, getPlayerStones, countStones, boardToHash.
 */

import {
  getMillsForPosition,
  isAdjacent,
  getAdjacentPositions,
  getPlayerStones,
  countStones,
  boardToHash,
  createEmptyBoard,
  isInMill,
} from '../board';
import { MILL_LINES } from '../constants';
import type { BoardState, Player, Position } from '../types';

describe('getMillsForPosition', () => {
  it('returns arrays of length 3', () => {
    for (let pos = 0; pos < 24; pos++) {
      const mills = getMillsForPosition(pos as Position);
      mills.forEach((line) => expect(line).toHaveLength(3));
    }
  });

  it('every returned line contains the position', () => {
    for (let pos = 0; pos < 24; pos++) {
      const mills = getMillsForPosition(pos as Position);
      mills.forEach((line) => expect(line).toContain(pos));
    }
  });

  it('matches MILL_LINES that contain the position', () => {
    for (let pos = 0; pos < 24; pos++) {
      const fromHelper = getMillsForPosition(pos as Position);
      const fromConst = MILL_LINES.filter((line) => line.includes(pos));
      expect(fromHelper.length).toBe(fromConst.length);
    }
  });
});

describe('isAdjacent', () => {
  it('0 is adjacent to 1 and 7 only', () => {
    expect(isAdjacent(0, 1)).toBe(true);
    expect(isAdjacent(0, 7)).toBe(true);
    expect(isAdjacent(0, 2)).toBe(false);
    expect(isAdjacent(0, 8)).toBe(false);
  });

  it('symmetry', () => {
    expect(isAdjacent(1, 0)).toBe(true);
    expect(isAdjacent(1, 2)).toBe(true);
    expect(isAdjacent(1, 9)).toBe(true);
  });

  it('center 17 is adjacent to 9, 16, 18', () => {
    expect(isAdjacent(17, 9)).toBe(true);
    expect(isAdjacent(17, 16)).toBe(true);
    expect(isAdjacent(17, 18)).toBe(true);
    expect(isAdjacent(17, 10)).toBe(false);
  });
});

describe('getAdjacentPositions', () => {
  it('returns 2 for corners of outer square', () => {
    expect(getAdjacentPositions(0)).toHaveLength(2);
    expect(getAdjacentPositions(2)).toHaveLength(2);
  });

  it('returns 4 for center of sides (e.g. 9)', () => {
    const adj9 = getAdjacentPositions(9);
    expect(adj9).toHaveLength(4);
    expect(adj9).toContain(1);
    expect(adj9).toContain(8);
    expect(adj9).toContain(10);
    expect(adj9).toContain(17);
  });

  it('all positions have at least 1 and at most 4 adjacent', () => {
    for (let pos = 0; pos < 24; pos++) {
      const adj = getAdjacentPositions(pos as Position);
      expect(adj.length).toBeGreaterThanOrEqual(1);
      expect(adj.length).toBeLessThanOrEqual(4);
    }
  });
});

describe('getPlayerStones', () => {
  it('empty board returns empty for both players', () => {
    const board = createEmptyBoard();
    expect(getPlayerStones(board, 1)).toEqual([]);
    expect(getPlayerStones(board, 2)).toEqual([]);
  });

  it('returns positions where player has stone', () => {
    const board = createEmptyBoard();
    board[0] = 1;
    board[1] = 1;
    board[5] = 2;
    expect(getPlayerStones(board, 1)).toEqual([0, 1]);
    expect(getPlayerStones(board, 2)).toEqual([5]);
  });
});

describe('countStones', () => {
  it('empty board is 0', () => {
    expect(countStones(createEmptyBoard(), 1)).toBe(0);
    expect(countStones(createEmptyBoard(), 2)).toBe(0);
  });

  it('counts correctly', () => {
    const board = createEmptyBoard();
    board[0] = 1;
    board[1] = 1;
    board[2] = 2;
    expect(countStones(board, 1)).toBe(2);
    expect(countStones(board, 2)).toBe(1);
  });
});

describe('boardToHash', () => {
  it('same board and player gives same hash', () => {
    const b = createEmptyBoard();
    b[0] = 1;
    expect(boardToHash(b, 1)).toBe(boardToHash(b, 1));
  });

  it('different player gives different hash', () => {
    const b = createEmptyBoard();
    expect(boardToHash(b, 1)).not.toBe(boardToHash(b, 2));
  });

  it('different board gives different hash', () => {
    const b1 = createEmptyBoard();
    const b2 = createEmptyBoard();
    b2[0] = 1;
    expect(boardToHash(b1, 1)).not.toBe(boardToHash(b2, 1));
  });
});

describe('isInMill', () => {
  it('full line is mill', () => {
    const board = createEmptyBoard();
    board[0] = 1;
    board[1] = 1;
    board[2] = 1;
    expect(isInMill(board, 0, 1)).toBe(true);
    expect(isInMill(board, 1, 1)).toBe(true);
    expect(isInMill(board, 2, 1)).toBe(true);
  });

  it('two stones is not mill', () => {
    const board = createEmptyBoard();
    board[0] = 1;
    board[1] = 1;
    expect(isInMill(board, 0, 1)).toBe(false);
  });
});
