/**
 * Mühle AI: Minimax with alpha-beta, 5 difficulty levels, evaluateBoard.
 * Time-limited iterative deepening; reduced depth in flying phase; move ordering.
 * AI is always player 2. Non-blocking: delay is applied by the UI.
 */

import { makeMove, getValidMoves, getRemovableStones } from './engine';
import type { AIDifficulty, BoardState, GameState, Player, Position } from './types';
import type { Phase } from './types';
import { MILL_LINES } from './constants';
import {
  getPlayerStones,
  getMillsForPosition,
  getAdjacentPositions,
} from './board';

/** Difficulty level 1–5 (Anfänger … Unfair). */
export type AIDifficultyLevel = 1 | 2 | 3 | 4 | 5;

/** Max think time per move (ms). When exceeded, best move so far is returned. */
const MAX_AI_THINK_TIME_MS: Record<AIDifficultyLevel, number> = {
  1: 200,
  2: 300,
  3: 400,
  4: 600,
  5: 800,
};

/** Max search depth per difficulty (before phase reduction). */
const BASE_DEPTH: Record<AIDifficultyLevel, number> = {
  1: 0,
  2: 0,
  3: 4,
  4: 5,
  5: 6,
};

const CHECK_DEADLINE_EVERY_N_NODES = 1000;

class AITimeoutError extends Error {
  constructor() {
    super('AI think time exceeded');
    this.name = 'AITimeoutError';
  }
}

const CENTRAL_POSITIONS: Position[] = [9, 11, 13, 15];
const CORNER_POSITIONS: Position[] = [0, 2, 4, 6];

const WEIGHT_STONE_DIFF = 100;
const WEIGHT_CLOSED_MILL = 50;
const WEIGHT_POTENTIAL_MILL = 30;
const WEIGHT_BLOCKED_OPPONENT = 20;
const WEIGHT_ZWICKMÜHLE = 80;
const WEIGHT_MOBILITY = 5;
const WEIGHT_CENTRAL = 10;
const WEIGHT_CORNER = 5;
const WEIGHT_OPPONENT_THREE_STONES = 200;
const WEIGHT_WIN = 1000;

/**
 * Maps AIDifficulty to numeric level 1–5.
 */
export function difficultyToLevel(d: AIDifficulty): AIDifficultyLevel {
  const map: Record<AIDifficulty, AIDifficultyLevel> = {
    beginner: 1,
    easy: 2,
    medium: 3,
    hard: 4,
    unfair: 5,
  };
  return map[d] ?? 3;
}

/**
 * Search depth by difficulty and phase. Flying phase has high branching factor → reduce depth.
 */
function getSearchDepth(difficulty: AIDifficulty, phase: Phase): number {
  const level = difficultyToLevel(difficulty);
  let depth = BASE_DEPTH[level];
  if (phase === 'flying') {
    depth = Math.max(2, depth - 2);
  }
  return depth;
}

/**
 * Returns recommended delay in ms before playing the AI move (for UI).
 * Used when dynamic delay is not applied (e.g. Tag Team).
 */
export function getAIMoveDelay(difficulty: AIDifficulty): number {
  const level = difficultyToLevel(difficulty);
  const delays: Record<AIDifficultyLevel, number> = {
    1: 600,
    2: 500,
    3: 450,
    4: 400,
    5: 350,
  };
  return delays[level];
}

/** Target total duration (think + delay) in ms: { min, max }. */
export function getAITargetTotalDuration(difficulty: AIDifficulty): { min: number; max: number } {
  const level = difficultyToLevel(difficulty);
  const target: Record<AIDifficultyLevel, { min: number; max: number }> = {
    1: { min: 300, max: 500 },
    2: { min: 400, max: 600 },
    3: { min: 400, max: 700 },
    4: { min: 500, max: 800 },
    5: { min: 600, max: 1000 },
  };
  return target[level];
}

/**
 * Counts closed mills for a player on the board.
 */
function countClosedMills(board: BoardState, player: Player): number {
  let count = 0;
  const seen = new Set<string>();
  for (const line of MILL_LINES) {
    if (line.every((p) => board[p] === player)) {
      const key = [...line].sort((a, b) => a - b).join(',');
      if (!seen.has(key)) {
        seen.add(key);
        count++;
      }
    }
  }
  return count;
}

/**
 * Counts potential mills (2 of 3 occupied by player, 3rd empty) for a player.
 */
function countPotentialMills(board: BoardState, player: Player): number {
  let count = 0;
  for (const line of MILL_LINES) {
    const ours = line.filter((p) => board[p] === player).length;
    const empty = line.filter((p) => board[p] === 0).length;
    if (ours === 2 && empty === 1) count++;
  }
  return count;
}

/**
 * Counts opponent stones that are blocked (no empty adjacent).
 */
function countBlockedStones(board: BoardState, opponent: Player): number {
  const stones = getPlayerStones(board, opponent);
  let blocked = 0;
  for (const pos of stones) {
    const adj = getAdjacentPositions(pos);
    const hasEmpty = adj.some((p) => board[p] === 0);
    if (!hasEmpty) blocked++;
  }
  return blocked;
}

/**
 * Detects Zwickmühle: two mills sharing one stone. Simplified: position completes two mills.
 */
function hasZwickmühlePotential(
  board: BoardState,
  player: Player,
  position: Position
): boolean {
  const lines = getMillsForPosition(position);
  let completes = 0;
  for (const line of lines) {
    const ours = line.filter((p) => board[p] === player || p === position).length;
    const empty = line.filter((p) => board[p] === 0).length;
    if (ours === 3 && empty === 0) completes++;
  }
  return completes >= 2;
}

/**
 * Evaluates board for player 2 (AI). Higher = better for AI.
 */
export function evaluateBoard(state: GameState): number {
  if (state.gameOver) {
    if (state.winner === 2) return WEIGHT_WIN;
    if (state.winner === 1) return -WEIGHT_WIN;
    return 0;
  }

  const board = state.board;
  const ai: Player = 2;
  const human: Player = 1;

  const stonesAi = state.stonesOnBoard[ai] + state.stonesInHand[ai];
  const stonesHuman = state.stonesOnBoard[human] + state.stonesInHand[human];
  let score = (stonesAi - stonesHuman) * WEIGHT_STONE_DIFF;

  const closedAi = countClosedMills(board, ai);
  const closedHuman = countClosedMills(board, human);
  score += (closedAi - closedHuman) * WEIGHT_CLOSED_MILL;

  const potentialAi = countPotentialMills(board, ai);
  const potentialHuman = countPotentialMills(board, human);
  score += (potentialAi - potentialHuman) * WEIGHT_POTENTIAL_MILL;

  const blockedHuman = countBlockedStones(board, human);
  const blockedAi = countBlockedStones(board, ai);
  score += (blockedHuman - blockedAi) * WEIGHT_BLOCKED_OPPONENT;

  for (let i = 0; i < board.length; i++) {
    const pos = i as Position;
    if (board[pos] === ai && hasZwickmühlePotential(board, ai, pos)) score += WEIGHT_ZWICKMÜHLE;
    if (board[pos] === human && hasZwickmühlePotential(board, human, pos)) score -= WEIGHT_ZWICKMÜHLE;
  }

  const stateForAi = { ...state, selectedStone: null };
  const stateForHuman = { ...state, currentPlayer: human, selectedStone: null };
  const mobilityAi = countMobility(stateForAi);
  const mobilityHuman = countMobility(stateForHuman);
  score += (mobilityAi - mobilityHuman) * WEIGHT_MOBILITY;

  for (const pos of CENTRAL_POSITIONS) {
    if (board[pos] === ai) score += WEIGHT_CENTRAL;
    if (board[pos] === human) score -= WEIGHT_CENTRAL;
  }
  for (const pos of CORNER_POSITIONS) {
    if (board[pos] === ai) score += WEIGHT_CORNER;
    if (board[pos] === human) score -= WEIGHT_CORNER;
  }

  if (state.stonesOnBoard[human] <= 3 && state.stonesInHand[human] === 0) score += WEIGHT_OPPONENT_THREE_STONES;
  if (state.stonesOnBoard[ai] <= 3 && state.stonesInHand[ai] === 0) score -= WEIGHT_OPPONENT_THREE_STONES;

  if (!hasAnyMove(stateForHuman)) score += WEIGHT_WIN;
  if (!hasAnyMove(stateForAi)) score -= WEIGHT_WIN;

  return score;
}

function hasAnyMove(state: GameState): boolean {
  if (state.mustRemove) return getRemovableStones(state).length > 0;
  if (state.phase === 'placing') {
    if (state.stonesInHand[state.currentPlayer] <= 0) return false;
    return state.board.some((v) => v === 0);
  }
  const myStones = getPlayerStones(state.board, state.currentPlayer);
  const canFly = state.phase === 'flying' && state.stonesOnBoard[state.currentPlayer] === 3;
  for (const from of myStones) {
    const targets: Position[] = canFly
      ? (state.board.map((v, i) => (v === 0 ? (i as Position) : -1)).filter((i) => i >= 0) as Position[])
      : getAdjacentPositions(from).filter((p) => state.board[p] === 0);
    if (targets.length > 0) return true;
  }
  return false;
}

function countMobility(state: GameState): number {
  if (state.mustRemove) return getRemovableStones(state).length;
  if (state.phase === 'placing') {
    if (state.stonesInHand[state.currentPlayer] <= 0) return 0;
    return state.board.filter((v) => v === 0).length;
  }
  const myStones = getPlayerStones(state.board, state.currentPlayer);
  const canFly = state.phase === 'flying' && state.stonesOnBoard[state.currentPlayer] === 3;
  let count = 0;
  for (const from of myStones) {
    const targets: Position[] = canFly
      ? (state.board.map((v, i) => (v === 0 ? (i as Position) : -1)).filter((i) => i >= 0) as Position[])
      : getAdjacentPositions(from).filter((p) => state.board[p] === 0);
    count += targets.length;
  }
  return count;
}

/** A single AI move: position to play; in moving phase also from; if move forms a mill, remove = stone to remove. */
export interface AIMove {
  position: Position;
  from?: Position;
  /** When set, this move forms a mill and the AI must remove this opponent stone (part of same turn). */
  remove?: Position;
}

/**
 * Chooses the best opponent stone to remove after forming a mill (maximize damage to opponent).
 */
export function chooseStoneToRemove(state: GameState): Position {
  const removable = getRemovableStones(state);
  if (removable.length === 0) return -1 as Position;
  if (removable.length === 1) return removable[0];
  const opponent = state.currentPlayer === 1 ? 2 : 1;
  let bestScore = -Infinity;
  let bestPosition = removable[0];
  for (const pos of removable) {
    let score = 0;
    const mills = getMillsForPosition(pos);
    for (const mill of mills) {
      const opponentCount = mill.filter((p) => state.board[p] === opponent).length;
      if (opponentCount === 2) score += 50;
      if (opponentCount === 1) score += 10;
    }
    score += getAdjacentPositions(pos).length * 5;
    if (score > bestScore) {
      bestScore = score;
      bestPosition = pos;
    }
  }
  return bestPosition;
}

/**
 * Returns all legal moves for the current player (AI). For place/move that form a mill, expands with each possible remove.
 */
export function getAIMoves(state: GameState): AIMove[] {
  if (state.gameOver) return [];

  if (state.mustRemove) {
    return getRemovableStones(state).map((position) => ({ position }));
  }

  if (state.phase === 'placing') {
    const positions = getValidMoves(state);
    const moves: AIMove[] = [];
    for (const position of positions) {
      const next = makeMove(state, position);
      if (next.mustRemove) {
        for (const remove of getRemovableStones(next)) {
          moves.push({ position, remove });
        }
      } else {
        moves.push({ position });
      }
    }
    return moves;
  }

  if (state.phase === 'moving' || state.phase === 'flying') {
    const myStones = getPlayerStones(state.board, state.currentPlayer);
    const moves: AIMove[] = [];
    for (const from of myStones) {
      const stateWithFrom = { ...state, selectedStone: from };
      const targets = getValidMoves(stateWithFrom);
      for (const to of targets) {
        const next = makeMove(stateWithFrom, to);
        if (next.mustRemove) {
          for (const remove of getRemovableStones(next)) {
            moves.push({ position: to, from, remove });
          }
        } else {
          moves.push({ position: to, from });
        }
      }
    }
    return moves;
  }

  return [];
}

/**
 * Quick score for move ordering: higher = try first (better for alpha-beta).
 */
function quickEvaluateMove(state: GameState, move: AIMove): number {
  let score = 0;
  if (move.remove != null) score += 100;
  const next = applyMoveForAI(state, move);
  if (next) {
    const humanPotentialBefore = countPotentialMills(state.board, 1);
    const humanPotentialAfter = countPotentialMills(next.board, 1);
    if (humanPotentialAfter < humanPotentialBefore) score += 50;
  }
  if (CENTRAL_POSITIONS.includes(move.position)) score += 10;
  if (CORNER_POSITIONS.includes(move.position)) score += 3;
  return score;
}

/**
 * Orders moves so that strong moves are tried first (better alpha-beta pruning).
 */
function orderMoves(state: GameState, moves: AIMove[]): AIMove[] {
  const result = [...moves];
  result.sort((a, b) => quickEvaluateMove(state, b) - quickEvaluateMove(state, a));
  return result;
}

/**
 * Applies a full AI move (place/move, and if it forms a mill, the remove step).
 */
function applyMoveForAI(state: GameState, move: AIMove): GameState | null {
  const stateWithSel = move.from != null ? { ...state, selectedStone: move.from } : state;
  let next = makeMove(stateWithSel, move.position);
  if (move.remove != null && next.mustRemove) {
    next = makeMove(next, move.remove);
  }
  return next;
}

/**
 * Stufe 1: Random, 30% chance to close a mill if possible.
 */
function getMoveLevel1(state: GameState): AIMove | null {
  const moves = getAIMoves(state);
  if (moves.length === 0) return null;

  const millMoves = moves.filter((m) => m.remove != null);

  if (millMoves.length > 0 && Math.random() < 0.3) {
    return millMoves[Math.floor(Math.random() * millMoves.length)];
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

/**
 * Stufe 2: Heuristic only – close mill > block opponent > central > random.
 */
function getMoveLevel2(state: GameState): AIMove | null {
  const moves = getAIMoves(state);
  if (moves.length === 0) return null;

  const withScore = moves.map((m) => {
    const next = applyMoveForAI(state, m);
    if (!next) return { move: m, score: -Infinity };
    let score = 0;
    if (m.remove != null) score += 1000;
    const humanPotentialBefore = countPotentialMills(state.board, 1);
    const humanPotentialAfter = countPotentialMills(next.board, 1);
    if (humanPotentialAfter < humanPotentialBefore) score += 500;
    if (CENTRAL_POSITIONS.includes(m.position)) score += 50;
    if (CORNER_POSITIONS.includes(m.position)) score += 20;
    score += Math.random() * 10;
    return { move: m, score };
  });

  withScore.sort((a, b) => b.score - a.score);
  return withScore[0].move;
}

/**
 * Minimax with alpha-beta. Returns { score, move }. AI is maximizing (player 2).
 * When deadline is set, throws AITimeoutError when time is up (caller uses best move from last iteration).
 */
function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  deadline?: number,
  nodeCount?: { n: number }
): { score: number; move: AIMove | null } {
  if (nodeCount) {
    nodeCount.n++;
    if (nodeCount.n % CHECK_DEADLINE_EVERY_N_NODES === 0 && deadline != null && Date.now() >= deadline) {
      throw new AITimeoutError();
    }
  }
  if (depth === 0 || state.gameOver) {
    return { score: evaluateBoard(state), move: null };
  }

  const moves = getAIMoves(state);
  if (moves.length === 0) return { score: evaluateBoard(state), move: null };

  const ordered = orderMoves(state, moves);

  if (isMaximizing) {
    let bestScore = -Infinity;
    let bestMove: AIMove | null = ordered[0] ?? null;
    for (const move of ordered) {
      const next = applyMoveForAI(state, move);
      if (!next) continue;
      const { score } = minimax(next, depth - 1, alpha, beta, false, deadline, nodeCount);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }
    return { score: bestScore, move: bestMove };
  } else {
    let bestScore = Infinity;
    let bestMove: AIMove | null = ordered[0] ?? null;
    for (const move of ordered) {
      const next = applyMoveForAI(state, move);
      if (!next) continue;
      const { score } = minimax(next, depth - 1, alpha, beta, true, deadline, nodeCount);
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, bestScore);
      if (beta <= alpha) break;
    }
    return { score: bestScore, move: bestMove };
  }
}

/** Opening book: first few moves for AI (player 2). */
const OPENING_BOOK: Position[] = [9, 1, 17, 3, 11, 5, 13, 7, 15];

/**
 * Returns book move for AI in placing phase if available, else null.
 */
function getOpeningBookMove(state: GameState): Position | null {
  if (state.phase !== 'placing' || state.currentPlayer !== 2) return null;
  const moves = getValidMoves(state);
  if (moves.length === 0) return null;
  const used = new Set(
    (state.board.map((_, i) => (state.board[i] === 2 ? i : -1)).filter((i) => i >= 0) as Position[])
  );
  const moveCount = state.moveHistory.filter((m) => m.player === 2).length;
  if (moveCount >= 4) return null;
  for (const pos of OPENING_BOOK) {
    if (used.has(pos)) continue;
    if (moves.includes(pos)) return pos;
  }
  return null;
}

/**
 * Picks the AI move for the given state and difficulty. Returns AIMove or null.
 * Levels 3–5: time-limited iterative deepening; depth reduced in flying phase.
 */
export function getAIMove(state: GameState, difficulty: AIDifficulty): AIMove | null {
  const start = Date.now();
  const level = difficultyToLevel(difficulty);
  const moves = getAIMoves(state);
  if (moves.length === 0) return null;

  if (level === 1) {
    const move = getMoveLevel1(state);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(`AI move took ${Date.now() - start}ms (${difficulty}, phase: ${state.phase})`);
    }
    return move;
  }
  if (level === 2) {
    const move = getMoveLevel2(state);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(`AI move took ${Date.now() - start}ms (${difficulty}, phase: ${state.phase})`);
    }
    return move;
  }

  if (level === 5) {
    const book = getOpeningBookMove(state);
    if (book != null) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log(`AI move took ${Date.now() - start}ms (${difficulty}, phase: ${state.phase}, book)`);
      }
      return { position: book };
    }
  }

  const maxDepth = getSearchDepth(difficulty, state.phase);
  const deadline = Date.now() + MAX_AI_THINK_TIME_MS[level];
  let bestMove: AIMove | null = null;
  const nodeCount = { n: 0 };

  for (let depth = 1; depth <= maxDepth; depth++) {
    try {
      const result = minimax(state, depth, -Infinity, Infinity, true, deadline, nodeCount);
      if (Date.now() >= deadline) break;
      bestMove = result.move;
    } catch (e) {
      if (e instanceof AITimeoutError) break;
      throw e;
    }
  }

  const move = bestMove ?? getMoveLevel2(state);
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`AI move took ${Date.now() - start}ms (${difficulty}, phase: ${state.phase})`);
  }
  return move;
}

/**
 * Returns a random valid move (for tests / fallback).
 */
export function getRandomMove(state: GameState): AIMove | null {
  const moves = getAIMoves(state);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}
