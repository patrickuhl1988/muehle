/**
 * Constants tests: adjacency and mill lines match board layout.
 */

import { ADJACENCY, MILL_LINES, BOARD_SIZE } from '../constants';
import { isAdjacent } from '../board';
import type { Position } from '../types';

describe('constants', () => {
  it('BOARD_SIZE is 24', () => {
    expect(BOARD_SIZE).toBe(24);
  });

  it('every position has adjacency list', () => {
    for (let i = 0; i < BOARD_SIZE; i++) {
      expect(ADJACENCY[i as Position]).toBeDefined();
      expect(Array.isArray(ADJACENCY[i as Position])).toBe(true);
    }
  });

  it('adjacency is symmetric', () => {
    for (let a = 0; a < BOARD_SIZE; a++) {
      const adj = ADJACENCY[a as Position];
      for (const b of adj) {
        expect(ADJACENCY[b as Position]).toContain(a);
      }
    }
  });

  it('mill lines have exactly 3 positions', () => {
    expect(MILL_LINES).toHaveLength(16);
    MILL_LINES.forEach((line) => {
      expect(line).toHaveLength(3);
      line.forEach((p) => {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(BOARD_SIZE);
      });
    });
  });

  it('each mill line forms connected positions (consecutive pairs adjacent)', () => {
    for (const [a, b, c] of MILL_LINES) {
      expect(isAdjacent(a, b) || isAdjacent(b, a)).toBe(true);
      expect(isAdjacent(b, c) || isAdjacent(c, b)).toBe(true);
    }
  });

  it('outer square mills: [0,1,2], [2,3,4], [4,5,6], [6,7,0]', () => {
    const outer = [
      [0, 1, 2],
      [2, 3, 4],
      [4, 5, 6],
      [6, 7, 0],
    ];
    outer.forEach((triple) => {
      const found = MILL_LINES.some(
        (line) =>
          line.includes(triple[0]) && line.includes(triple[1]) && line.includes(triple[2])
      );
      expect(found).toBe(true);
    });
  });

  it('connecting lines: [1,9,17], [3,11,19], [5,13,21], [7,15,23]', () => {
    const conn = [
      [1, 9, 17],
      [3, 11, 19],
      [5, 13, 21],
      [7, 15, 23],
    ];
    conn.forEach((triple) => {
      const found = MILL_LINES.some(
        (line) =>
          line.includes(triple[0]) && line.includes(triple[1]) && line.includes(triple[2])
      );
      expect(found).toBe(true);
    });
  });
});
