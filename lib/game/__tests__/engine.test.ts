/**
 * Engine tests: initial state, place, mill detection, phase transition, game over, mustRemove, draw.
 */

import {
  createInitialState,
  getValidMoves,
  makeMove,
  checkMill,
  checkGameOver,
  getRemovableStones,
  getOpponent,
  computePhase,
  hasValidMoves,
} from '../engine';
import { createEmptyBoard, isInMill, getMillsForPosition, boardToHash } from '../board';
import { MILL_LINES } from '../constants';
import type { GameState, Position, BoardState, Player } from '../types';

describe('createInitialState', () => {
  it('creates empty board and player 1 to move', () => {
    const state = createInitialState();
    expect(state.board.every((c) => c === 0)).toBe(true);
    expect(state.currentPlayer).toBe(1);
    expect(state.phase).toBe('placing');
    expect(state.stonesInHand[1]).toBe(9);
    expect(state.stonesInHand[2]).toBe(9);
    expect(state.stonesOnBoard[1]).toBe(0);
    expect(state.stonesOnBoard[2]).toBe(0);
    expect(state.mustRemove).toBe(false);
    expect(state.selectedStone).toBe(null);
    expect(state.moveCount).toBe(0);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBe(null);
    expect(state.isDraw).toBe(false);
    expect(state.lastMove).toBe(null);
  });
});

describe('getValidMoves', () => {
  it('returns 24 positions in placing phase at start', () => {
    const state = createInitialState();
    const moves = getValidMoves(state);
    expect(moves.length).toBe(24);
    expect(new Set(moves).size).toBe(24);
    moves.forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(24);
    });
  });

  it('returns empty when mustRemove and no removable stones (should not happen in valid game)', () => {
    const state = createInitialState();
    const withRemove = { ...state, mustRemove: true };
    const moves = getValidMoves(withRemove);
    expect(moves).toEqual([]);
  });

  it('returns empty in moving phase when selectedStone is null', () => {
    const state: GameState = {
      ...createInitialState(),
      phase: 'moving',
      stonesInHand: { 1: 0, 2: 0 },
      stonesOnBoard: { 1: 3, 2: 3 },
      selectedStone: null,
    };
    expect(getValidMoves(state)).toEqual([]);
  });
});

describe('makeMove - place', () => {
  it('places stone and switches player', () => {
    const state = createInitialState();
    const next = makeMove(state, 0);
    expect(next.board[0]).toBe(1);
    expect(next.currentPlayer).toBe(2);
    expect(next.stonesInHand[1]).toBe(8);
    expect(next.stonesOnBoard[1]).toBe(1);
    expect(next.moveCount).toBe(1);
    expect(next.lastMove?.type).toBe('place');
    expect(next.lastMove?.to).toBe(0);
  });

  it('does not mutate original state', () => {
    const state = createInitialState();
    const next = makeMove(state, 0);
    expect(state.board[0]).toBe(0);
    expect(state.currentPlayer).toBe(1);
  });

  it('rejects place on occupied position', () => {
    const state = createInitialState();
    const after = makeMove(state, 0);
    const same = makeMove(after, 0);
    expect(same.board[0]).toBe(1);
    expect(same.currentPlayer).toBe(2);
  });
});

describe('checkMill and mill lines', () => {
  it('detects mill on line [0,1,2]', () => {
    const board = createEmptyBoard();
    board[0] = 1;
    board[1] = 1;
    board[2] = 1;
    expect(checkMill(board, 0, 1)).toBe(true);
    expect(checkMill(board, 1, 1)).toBe(true);
    expect(checkMill(board, 2, 1)).toBe(true);
    expect(checkMill(board, 0, 2)).toBe(false);
  });

  it('all 16 mill lines are detected', () => {
    const board = createEmptyBoard();
    for (const line of MILL_LINES) {
      board[line[0]] = 1;
      board[line[1]] = 1;
      board[line[2]] = 1;
      expect(checkMill(board, line[0], 1)).toBe(true);
      expect(checkMill(board, line[1], 1)).toBe(true);
      expect(checkMill(board, line[2], 1)).toBe(true);
      board[line[0]] = 0;
      board[line[1]] = 0;
      board[line[2]] = 0;
    }
  });

  it('no mill when only two of three', () => {
    const board = createEmptyBoard();
    board[0] = 1;
    board[1] = 1;
    expect(checkMill(board, 0, 1)).toBe(false);
    expect(checkMill(board, 1, 1)).toBe(false);
  });
});

describe('mustRemove after mill', () => {
  it('setting 0,1,2 sets mustRemove and current player stays', () => {
    const state = createInitialState();
    const s1 = makeMove(state, 0);
    const s2 = makeMove(s1, 8);
    const s3 = makeMove(s2, 1);
    const s4 = makeMove(s3, 9);
    const s5 = makeMove(s4, 2);
    expect(s5.mustRemove).toBe(true);
    expect(s5.currentPlayer).toBe(1);
    const removable = getRemovableStones(s5);
    expect(removable.length).toBeGreaterThan(0);
  });

  it('after remove, mustRemove is false and player switches', () => {
    const state = createInitialState();
    const s1 = makeMove(state, 0);
    const s2 = makeMove(s1, 8);
    const s3 = makeMove(s2, 1);
    const s4 = makeMove(s3, 9);
    const s5 = makeMove(s4, 2);
    const removable = getRemovableStones(s5);
    const pos = removable[0];
    const s6 = makeMove(s5, pos);
    expect(s6.mustRemove).toBe(false);
    expect(s6.currentPlayer).toBe(2);
    expect(s6.board[pos]).toBe(0);
  });

  it('stones in a mill cannot be removed unless all opponent stones are in mills', () => {
    const board = createEmptyBoard();
    board[0] = 1;
    board[1] = 1;
    board[2] = 1;
    board[8] = 2;
    board[9] = 2;
    board[10] = 2;
    const state: GameState = {
      board,
      currentPlayer: 1,
      phase: 'moving',
      stonesInHand: { 1: 0, 2: 0 },
      stonesOnBoard: { 1: 3, 2: 3 },
      mustRemove: true,
      selectedStone: null,
      moveHistory: [],
      moveCount: 0,
      gameOver: false,
      winner: null,
      isDraw: false,
      lastMove: null,
      lastMillAtMove: 0,
      positionCount: {},
    };
    const removable = getRemovableStones(state);
    expect(removable.length).toBe(3);
    expect(removable).toContain(8);
    expect(removable).toContain(9);
    expect(removable).toContain(10);
  });
});

describe('phase transition', () => {
  it('computePhase returns moving when both have 0 in hand and more than 3 on board', () => {
    const state = createInitialState();
    const withAllPlaced = {
      ...state,
      stonesInHand: { 1: 0, 2: 0 },
      stonesOnBoard: { 1: 9, 2: 9 },
    };
    expect(computePhase(withAllPlaced)).toBe('moving');
  });

  it('computePhase returns flying when a player has 3 stones on board', () => {
    const state = createInitialState();
    const withThree = {
      ...state,
      stonesInHand: { 1: 0, 2: 0 },
      stonesOnBoard: { 1: 3, 2: 9 },
    };
    expect(computePhase(withThree)).toBe('flying');
  });

  it('computePhase returns placing when either has stones in hand', () => {
    expect(computePhase(createInitialState())).toBe('placing');
    const s = { ...createInitialState(), stonesInHand: { 1: 1, 2: 0 } };
    expect(computePhase(s)).toBe('placing');
  });
});

describe('game over', () => {
  it('winner when opponent has fewer than 3 stones and none in hand', () => {
    const board = createEmptyBoard();
    board[0] = 1;
    board[1] = 1;
    board[2] = 1;
    board[3] = 2;
    board[4] = 2;
    const state: GameState = {
      board,
      currentPlayer: 1,
      phase: 'moving',
      stonesInHand: { 1: 0, 2: 0 },
      stonesOnBoard: { 1: 3, 2: 2 },
      mustRemove: false,
      selectedStone: null,
      moveHistory: [],
      moveCount: 0,
      gameOver: false,
      winner: null,
      isDraw: false,
      lastMove: null,
      lastMillAtMove: -1,
      positionCount: {},
    };
    const result = checkGameOver(state);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe(1);
    expect(result.isDraw).toBe(false);
  });

  it('game not over at start', () => {
    const state = createInitialState();
    const result = checkGameOver(state);
    expect(result.gameOver).toBe(false);
    expect(result.winner).toBe(null);
  });

  it('winner when current player has no valid moves (blocked)', () => {
    const board = createEmptyBoard();
    board[0] = 1;
    board[2] = 1;
    board[4] = 1;
    board[6] = 1;
    board[1] = 2;
    board[3] = 2;
    board[5] = 2;
    board[7] = 2;
    const state: GameState = {
      board,
      currentPlayer: 1,
      phase: 'moving',
      stonesInHand: { 1: 0, 2: 0 },
      stonesOnBoard: { 1: 4, 2: 4 },
      mustRemove: false,
      selectedStone: null,
      moveHistory: [],
      moveCount: 0,
      gameOver: false,
      winner: null,
      isDraw: false,
      lastMove: null,
      lastMillAtMove: -1,
      positionCount: {},
    };
    expect(hasValidMoves(state, 1)).toBe(false);
    const result = checkGameOver(state);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe(2);
    expect(result.isDraw).toBe(false);
  });
});

describe('hasValidMoves', () => {
  it('returns false when player has 4+ stones but no adjacent empty in moving phase', () => {
    const board = createEmptyBoard();
    board[0] = 1;
    board[2] = 1;
    board[4] = 1;
    board[6] = 1;
    board[1] = 2;
    board[3] = 2;
    board[5] = 2;
    board[7] = 2;
    const state: GameState = {
      board,
      currentPlayer: 1,
      phase: 'moving',
      stonesInHand: { 1: 0, 2: 0 },
      stonesOnBoard: { 1: 4, 2: 4 },
      mustRemove: false,
      selectedStone: null,
      moveHistory: [],
      moveCount: 0,
      gameOver: false,
      winner: null,
      isDraw: false,
      lastMove: null,
      lastMillAtMove: -1,
      positionCount: {},
    };
    expect(hasValidMoves(state, 1)).toBe(false);
  });
});

describe('flying phase', () => {
  it('when selectedStone is set and player has 3 stones, all empty positions are valid', () => {
    const board = createEmptyBoard();
    board[0] = 1;
    board[1] = 1;
    board[2] = 1;
    for (let i = 3; i < 24; i++) board[i] = 2;
    board[5] = 0;
    board[6] = 0;
    const state: GameState = {
      board,
      currentPlayer: 1,
      phase: 'flying',
      stonesInHand: { 1: 0, 2: 0 },
      stonesOnBoard: { 1: 3, 2: 9 },
      mustRemove: false,
      selectedStone: 0,
      moveHistory: [],
      moveCount: 0,
      gameOver: false,
      winner: null,
      isDraw: false,
      lastMove: null,
      lastMillAtMove: -1,
      positionCount: {},
    };
    const moves = getValidMoves(state);
    expect(moves).toContain(5);
    expect(moves).toContain(6);
    expect(moves.length).toBe(2);
  });
});

describe('board helpers', () => {
  it('getMillsForPosition returns lines containing position', () => {
    const lines0 = getMillsForPosition(0);
    expect(lines0.length).toBeGreaterThan(0);
    lines0.forEach((line) => expect(line).toContain(0));
    const lines17 = getMillsForPosition(17);
    expect(lines17.some((l) => l.includes(9) && l.includes(1))).toBe(true);
  });

  it('boardToHash is deterministic', () => {
    const b = createEmptyBoard();
    b[0] = 1;
    expect(boardToHash(b, 1)).toBe(boardToHash(b, 1));
    expect(boardToHash(b, 1)).not.toBe(boardToHash(b, 2));
  });
});

describe('draw detection', () => {
  it('50 moves without mill can lead to draw', () => {
    let state = createInitialState();
    state = { ...state, lastMillAtMove: 0 };
    for (let i = 0; i < 49; i++) {
      state = { ...state, moveCount: i + 1 };
    }
    state = { ...state, moveCount: 50 };
    const result = checkGameOver(state);
    expect(result.gameOver).toBe(true);
    expect(result.isDraw).toBe(true);
    expect(result.winner).toBe(null);
  });

  it('repetition count is updated in makeMove', () => {
    const state = createInitialState();
    const s1 = makeMove(state, 0);
    const hash = s1.positionCount ? Object.keys(s1.positionCount)[0] : null;
    expect(hash).toBeTruthy();
  });
});

describe('invalid moves rejected', () => {
  it('place on occupied returns same state', () => {
    const state = createInitialState();
    const next = makeMove(state, 0);
    const invalid = makeMove(next, 0);
    expect(invalid.board[0]).toBe(1);
    expect(invalid.currentPlayer).toBe(2);
  });

  it('move without selectedStone does nothing when clicking empty', () => {
    const state: GameState = {
      ...createInitialState(),
      phase: 'moving',
      stonesInHand: { 1: 0, 2: 0 },
      stonesOnBoard: { 1: 3, 2: 3 },
      board: (() => {
        const b = createEmptyBoard();
        b[0] = 1;
        b[1] = 1;
        b[2] = 1;
        b[8] = 2;
        b[9] = 2;
        b[10] = 2;
        return b;
      })(),
      selectedStone: null,
    };
    const moves = getValidMoves(state);
    expect(moves).toEqual([]);
  });
});
