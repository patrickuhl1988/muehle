/**
 * Coach analysis: suggests strategic moves for the human player.
 * Returns a single tip (highest priority) or null. No deep search – fast evaluation.
 */

import { MILL_LINES } from './constants';
import { getAdjacentPositions, getPlayerStones } from './board';
import { getValidMoves, makeMove, getOpponent } from './engine';
import type { GameState, Player, Position } from './types';

export type CoachReason =
  | 'close_mill'
  | 'block_opponent_mill'
  | 'setup_double_mill'
  | 'control_center'
  | 'increase_mobility'
  | 'trap_opponent'
  | 'avoid_edge'
  | 'break_opponent_mill'
  | 'general_strategy';

export interface CoachTip {
  action: 'place' | 'move' | 'remove';
  from?: Position;
  to: Position;
  reason: CoachReason;
  priority: number;
}

const CENTER_POSITIONS: Position[] = [1, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15];

function findMillClosingMoves(state: GameState, player: Player): CoachTip[] {
  const tips: CoachTip[] = [];
  const opponent = getOpponent(player);

  if (state.mustRemove) {
    const removable = getValidMoves(state);
    if (removable.length > 0) {
      tips.push({
        action: 'remove',
        to: removable[0],
        reason: 'close_mill',
        priority: 100,
      });
    }
    return tips;
  }

  if (state.phase === 'placing') {
    const validMoves = getValidMoves(state);
    for (const pos of validMoves) {
      const next = makeMove(state, pos);
      if (next.mustRemove) {
        tips.push({ action: 'place', to: pos, reason: 'close_mill', priority: 100 });
      }
    }
    return tips;
  }

  if (state.phase === 'moving' || state.phase === 'flying') {
    const myStones = getPlayerStones(state.board, player);
    const canFly = state.phase === 'flying' && state.stonesOnBoard[player] === 3;
    for (const from of myStones) {
      const stateWithSel = { ...state, selectedStone: from };
      const targets = getValidMoves(stateWithSel);
      for (const to of targets) {
        const next = makeMove(stateWithSel, to);
        if (next.mustRemove) {
          tips.push({
            action: 'move',
            from,
            to,
            reason: 'close_mill',
            priority: 100,
          });
        }
      }
    }
  }

  return tips;
}

function findMillThreats(state: GameState, opponent: Player): CoachTip[] {
  const tips: CoachTip[] = [];
  if (state.mustRemove) return tips;

  for (const line of MILL_LINES) {
    const opponentCount = line.filter((p) => state.board[p] === opponent).length;
    const emptyPos = line.find((p) => state.board[p] === 0) as Position | undefined;
    if (opponentCount === 2 && emptyPos !== undefined) {
      if (state.phase === 'placing') {
        tips.push({
          action: 'place',
          to: emptyPos,
          reason: 'block_opponent_mill',
          priority: 90,
        });
      } else {
        const myStones = getPlayerStones(state.board, state.currentPlayer);
        const canFly =
          state.phase === 'flying' && state.stonesOnBoard[state.currentPlayer] === 3;
        for (const from of myStones) {
          const stateWithSel = { ...state, selectedStone: from };
          const targets = getValidMoves(stateWithSel);
          if (targets.includes(emptyPos)) {
            tips.push({
              action: 'move',
              from,
              to: emptyPos,
              reason: 'block_opponent_mill',
              priority: 90,
            });
          }
        }
      }
    }
  }
  return tips;
}

function findControlCenterTip(state: GameState): CoachTip | null {
  if (state.phase !== 'placing' || state.mustRemove) return null;
  const validMoves = getValidMoves(state);
  const centerEmpty = validMoves.filter((p) => CENTER_POSITIONS.includes(p));
  if (centerEmpty.length === 0) return null;
  const pos = centerEmpty[0];
  return {
    action: 'place',
    to: pos,
    reason: 'control_center',
    priority: 50,
  };
}

function findIncreaseMobilityTip(state: GameState, player: Player): CoachTip | null {
  if (state.phase !== 'moving' && state.phase !== 'flying') return null;
  if (state.mustRemove) return null;
  const myStones = getPlayerStones(state.board, player);
  const canFly = state.phase === 'flying' && state.stonesOnBoard[player] === 3;
  let best: { from: Position; to: Position; neighbors: number } | null = null;
  for (const from of myStones) {
    const stateWithSel = { ...state, selectedStone: from };
    const targets = getValidMoves(stateWithSel);
    for (const to of targets) {
      const adj = getAdjacentPositions(to);
      const freeNeighbors = adj.filter((p) => state.board[p] === 0).length;
      if (best === null || freeNeighbors > best.neighbors) {
        best = { from, to, neighbors: freeNeighbors };
      }
    }
  }
  if (best == null) return null;
  return {
    action: 'move',
    from: best.from,
    to: best.to,
    reason: 'increase_mobility',
    priority: 40,
  };
}

function findGeneralPlaceTip(state: GameState): CoachTip | null {
  if (state.phase !== 'placing' || state.mustRemove) return null;
  const validMoves = getValidMoves(state);
  const centerFirst = validMoves.filter((p) => CENTER_POSITIONS.includes(p));
  const candidates = centerFirst.length > 0 ? centerFirst : validMoves;
  if (candidates.length === 0) return null;
  return {
    action: 'place',
    to: candidates[0],
    reason: 'general_strategy',
    priority: 10,
  };
}

/**
 * Returns the best coach tip for the current position, or null if nothing useful.
 * Human player is the one we're giving advice to (1 or 2).
 */
export function getCoachTip(state: GameState, humanPlayer: Player): CoachTip | null {
  if (state.gameOver || state.currentPlayer !== humanPlayer) return null;
  if (state.mustRemove && state.currentPlayer === humanPlayer) {
    const closeMill = findMillClosingMoves(state, humanPlayer);
    if (closeMill.length > 0) return closeMill[0];
    return null;
  }

  const closeMill = findMillClosingMoves(state, humanPlayer);
  if (closeMill.length > 0) return closeMill[0];

  const opponent = getOpponent(humanPlayer);
  const blockMill = findMillThreats(state, opponent);
  if (blockMill.length > 0) return blockMill[0];

  const center = findControlCenterTip(state);
  if (center) return center;

  const mobility = findIncreaseMobilityTip(state, humanPlayer);
  if (mobility) return mobility;

  const general = findGeneralPlaceTip(state);
  if (general) return general;

  return null;
}
