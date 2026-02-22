/**
 * Tag Team mode store: two boards, 2v2, bonus stones from captures.
 */

import { create } from 'zustand';
import { createInitialState, getValidMoves, getValidBonusPlacements, makeMove, getRemovableStones, checkGameOver } from '../game/engine';
import { TAG_TEAM_STONES_PER_PLAYER } from '../game/constants';
import { getPlayerStones } from '../game/board';
import { getAIMove, getAIMoveDelay } from '../game/ai';
import type { GameState, Player, Position } from '../game/types';
import type { AIDifficulty } from '../game/types';
import type { BoardId, TagTeamConfig, TagTeamState, TagTeamUndoSnapshot, BonusStonesPerBoard, BoardBonus } from '../game/tagTeamTypes';
import { MAX_BONUS_STONES, MAX_BONUS_STONES_PER_GAME } from '../game/tagTeamTypes';

const defaultBoardBonus: BoardBonus = {
  player: { available: 0, totalGenerated: 0 },
  opponent: { available: 0, totalGenerated: 0 },
};

const defaultBonusStones: BonusStonesPerBoard = {
  boardA: { ...defaultBoardBonus, player: { ...defaultBoardBonus.player }, opponent: { ...defaultBoardBonus.opponent } },
  boardB: { ...defaultBoardBonus, player: { ...defaultBoardBonus.player }, opponent: { ...defaultBoardBonus.opponent } },
};

/** Recipient of a bonus is the OTHER board, same team. */
function getRecipientBoard(captureBoard: BoardId): BoardId {
  return captureBoard === 'A' ? 'B' : 'A';
}

/** BonusStonesPerBoard uses keys 'boardA' | 'boardB'; BoardId is 'A' | 'B'. */
function bonusBoardKey(board: BoardId): 'boardA' | 'boardB' {
  return board === 'A' ? 'boardA' : 'boardB';
}

function getBonusForBoardTeam(bs: BonusStonesPerBoard, board: BoardId, team: 1 | 2) {
  const side = team === 1 ? 'player' : 'opponent';
  if (!bs) return defaultBoardBonus[side];
  const boardBonus = bs[bonusBoardKey(board)];
  if (!boardBonus) return defaultBoardBonus[side];
  return boardBonus[side] ?? defaultBoardBonus[side];
}

const MAX_UNDO_HISTORY = 20;
const MAX_UNDOS_PER_GAME = 2;

function takeSnapshot(s: TagTeamStoreState): TagTeamUndoSnapshot {
  return {
    boardA: JSON.parse(JSON.stringify(s.boardA)),
    boardB: JSON.parse(JSON.stringify(s.boardB)),
    turnOrder: s.turnOrder,
    mustPlaceBonus: s.mustPlaceBonus,
    bonusStones: JSON.parse(JSON.stringify(s.bonusStones)),
    teamCaptures: { ...s.teamCaptures },
    roundsPlayed: s.roundsPlayed,
    boardAFinished: s.boardAFinished,
    boardBFinished: s.boardBFinished,
  };
}

function getMaxBonusPerGame(config: TagTeamConfig): number {
  return config.maxBonusStones ?? MAX_BONUS_STONES_PER_GAME;
}

function getTeamForPlayer(board: BoardId, player: Player, config: TagTeamConfig): 1 | 2 {
  if (board === 'A') return player === config.team1.boardAPlayer ? 1 : 2;
  return player === config.team1.boardBPlayer ? 1 : 2;
}

function getActiveFromTurn(turnOrder: number, config?: TagTeamConfig): { board: BoardId; team: 1 | 2; isHuman: boolean } {
  // 0: Board A Team 1 (human), 1: Board B Team 2, 2: Board A Team 2, 3: Board B Team 1
  const board: BoardId = turnOrder % 2 === 0 ? 'A' : 'B';
  const team: 1 | 2 = turnOrder < 2 ? 1 : 2;
  const isHuman = turnOrder === 0 || (turnOrder === 3 && config?.team1?.boardBPartner === 'human');
  return { board, team, isHuman };
}

function getCurrentPlayerForBoard(board: BoardId, turnOrder: number, config: TagTeamConfig): Player {
  if (board === 'A') return turnOrder === 0 ? config.team1.boardAPlayer : config.team2.boardAPlayer;
  return turnOrder === 1 ? config.team2.boardBPlayer : config.team1.boardBPlayer;
}

/** Returns next turn order index, skipping boards that are already finished. */
function getNextTurnOrder(s: TagTeamStoreState): number {
  let next = (s.turnOrder + 1) % 4;
  for (let i = 0; i < 4; i++) {
    const { board } = getActiveFromTurn(next, s.config);
    if (board === 'A' && s.boardAFinished) next = (next + 1) % 4;
    else if (board === 'B' && s.boardBFinished) next = (next + 1) % 4;
    else return next;
  }
  return next;
}

/** Sets mustPlaceBonus only when next player has bonus, phase is moving/flying, and next player is AI. */
function getMustPlaceBonusForNext(merged: TagTeamStoreState, nextTurn: number): BoardId | null {
  const nextActive = getActiveFromTurn(nextTurn, merged.config);
  const bonus = getBonusForBoardTeam(merged.bonusStones, nextActive.board, nextActive.team);
  if (bonus.available <= 0) return null;
  const stateForNext = nextTurn % 2 === 0 ? merged.boardA : merged.boardB;
  const phaseOk = stateForNext.phase === 'moving' || stateForNext.phase === 'flying';
  if (!phaseOk) return null;
  if (nextActive.isHuman) return null;
  return nextActive.board;
}

interface TagTeamStoreState extends TagTeamState {
  /** Human tap on a board position. Returns true if handled. */
  handlePositionPress: (board: BoardId, position: Position) => boolean;
  /** Human places a bonus stone (only in moving/flying, position must not form a mill). Returns true if placed, false if invalid (show bonusNoMill). */
  handleBonusPlace: (board: BoardId, position: Position) => boolean;
  /** Apply one AI move for the current turn. Call when it's AI's turn. */
  applyAIMove: () => void;
  /** Start a new Tag Team game. */
  startTagTeamGame: (config: TagTeamConfig) => void;
  /** Reset (leave game). */
  resetTagTeam: () => void;
  /** Run remaining board to finish with minimal delay (AI vs AI). */
  startFastFinish: () => void;
  /** Undo last human move on Board A (and the following AI move). Max 2 per game. */
  undoTwoMoves: () => void;
}

const initialTagTeamState: TagTeamState = {
  boardA: createInitialState(TAG_TEAM_STONES_PER_PLAYER),
  boardB: createInitialState(TAG_TEAM_STONES_PER_PLAYER),
  config: {
    team1: { boardAPlayer: 1, boardBPlayer: 2, boardBPartner: 'ai', boardBAiDifficulty: 'easy' },
    team2: { boardAAiDifficulty: 'medium', boardBAiDifficulty: 'medium' },
  },
  bonusStones: JSON.parse(JSON.stringify(defaultBonusStones)),
  turnOrder: 0,
  mustPlaceBonus: null,
  gameOver: false,
  winningTeam: null,
  matchResult: null,
  boardAFinished: false,
  boardBFinished: false,
  fastFinishActive: false,
  roundsPlayed: 0,
  teamCaptures: { 1: 0, 2: 0 },
  stateHistoryForUndo: [],
  undosUsedThisGame: 0,
};

export const useTagTeamStore = create<TagTeamStoreState>((set, get) => ({
  ...initialTagTeamState,

  startTagTeamGame(config) {
    const boardA = createInitialState(TAG_TEAM_STONES_PER_PLAYER);
    const boardB = createInitialState(TAG_TEAM_STONES_PER_PLAYER);
    set({
      boardA,
      boardB,
      config,
      bonusStones: JSON.parse(JSON.stringify(defaultBonusStones)),
      turnOrder: 0,
      mustPlaceBonus: null,
      gameOver: false,
      winningTeam: null,
      matchResult: null,
      boardAFinished: false,
      boardBFinished: false,
      fastFinishActive: false,
      roundsPlayed: 0,
      teamCaptures: { 1: 0, 2: 0 },
      stateHistoryForUndo: [],
      undosUsedThisGame: 0,
    });
  },

  resetTagTeam() {
    set(initialTagTeamState);
  },

  handlePositionPress(board, position) {
    const s = get();
    if (s.gameOver) return false;
    const { board: activeBoard, team, isHuman } = getActiveFromTurn(s.turnOrder, s.config);
    if ((activeBoard === 'A' && s.boardAFinished) || (activeBoard === 'B' && s.boardBFinished)) {
      set({ turnOrder: getNextTurnOrder(s) });
      return false;
    }
    if (board !== activeBoard || !isHuman) return false;

    const state = board === 'A' ? s.boardA : s.boardB;
    if (state.currentPlayer !== getCurrentPlayerForBoard(board, s.turnOrder, s.config)) return false;

    // After closing a mill: mustRemove is true, selectedStone is already null – next tap removes opponent stone (no extra tap on own stone).
    if (state.mustRemove) {
      const removable = getRemovableStones(state);
      if (!removable.includes(position)) return false;
      const next = makeMove(state, position);
      const capturingTeam = getTeamForPlayer(board, state.currentPlayer, s.config);
      const recipientBoard = getRecipientBoard(board);
      const side = capturingTeam === 1 ? 'player' : 'opponent';
      const currentRecipient = getBonusForBoardTeam(s.bonusStones, recipientBoard, capturingTeam);
      const maxPerGame = getMaxBonusPerGame(s.config);
      const canGrant =
        currentRecipient.totalGenerated < maxPerGame && currentRecipient.available < MAX_BONUS_STONES;
      const newBonusStones: BonusStonesPerBoard = canGrant
        ? {
            ...s.bonusStones,
            [bonusBoardKey(recipientBoard)]: {
              ...s.bonusStones[bonusBoardKey(recipientBoard)],
              [side]: {
                available: currentRecipient.available + 1,
                totalGenerated: currentRecipient.totalGenerated + 1,
              },
            },
          }
        : s.bonusStones;
      const newCaptures = { ...s.teamCaptures, [capturingTeam]: s.teamCaptures[capturingTeam] + 1 };
      const updates: Partial<TagTeamStoreState> = {
        [board === 'A' ? 'boardA' : 'boardB']: next,
        bonusStones: newBonusStones,
        teamCaptures: newCaptures,
      };
      if (board === 'A') {
        const history = [...(s.stateHistoryForUndo ?? []), takeSnapshot(s)];
        if (history.length > MAX_UNDO_HISTORY) history.shift();
        updates.stateHistoryForUndo = history;
      }
      if (!next.mustRemove) {
        const merged = { ...s, ...updates } as TagTeamStoreState;
        const nextTurn = getNextTurnOrder(merged);
        updates.turnOrder = nextTurn;
        updates.mustPlaceBonus = getMustPlaceBonusForNext(merged, nextTurn);
        if (nextTurn === 0) updates.roundsPlayed = (s.roundsPlayed ?? 0) + 1;
        Object.assign(updates, checkTagTeamGameOver(merged));
      }
      set(updates);
      return true;
    }

    if (state.phase === 'moving' || state.phase === 'flying') {
      const myStones = getPlayerStones(state.board, state.currentPlayer);
      if (state.selectedStone === null) {
        if (myStones.includes(position)) {
          const nextState: GameState = { ...state, selectedStone: position };
          set({ [board === 'A' ? 'boardA' : 'boardB']: nextState });
          return true;
        }
        return false;
      }
      if (position === state.selectedStone) {
        const nextState: GameState = { ...state, selectedStone: null };
        set({ [board === 'A' ? 'boardA' : 'boardB']: nextState });
        return true;
      }
      const validTargets = getValidMoves(state);
      if (!validTargets.includes(position)) return false;
    }

    const next = makeMove(state, position);
    if (next === state) return false;

    const capturingTeam =
      next.lastMove?.type === 'remove'
        ? getTeamForPlayer(board, state.currentPlayer, s.config)
        : null;
    let newBonusStones = s.bonusStones;
    if (capturingTeam != null) {
      const recipientBoard = getRecipientBoard(board);
      const side = capturingTeam === 1 ? 'player' : 'opponent';
      const currentRecipient = getBonusForBoardTeam(s.bonusStones, recipientBoard, capturingTeam);
      const maxPerGame = getMaxBonusPerGame(s.config);
      const canGrant =
        currentRecipient.totalGenerated < maxPerGame && currentRecipient.available < MAX_BONUS_STONES;
      if (canGrant) {
        newBonusStones = {
          ...s.bonusStones,
          [bonusBoardKey(recipientBoard)]: {
            ...s.bonusStones[bonusBoardKey(recipientBoard)],
            [side]: {
              available: currentRecipient.available + 1,
              totalGenerated: currentRecipient.totalGenerated + 1,
            },
          },
        };
      }
    }
    const newCaptures =
      capturingTeam != null
        ? { ...s.teamCaptures, [capturingTeam]: s.teamCaptures[capturingTeam] + 1 }
        : s.teamCaptures;

    const updates: Partial<TagTeamStoreState> = {
      [board === 'A' ? 'boardA' : 'boardB']: next,
      bonusStones: newBonusStones,
      teamCaptures: newCaptures,
    };
    if (board === 'A') {
      const history = [...(s.stateHistoryForUndo ?? []), takeSnapshot(s)];
      if (history.length > MAX_UNDO_HISTORY) history.shift();
      updates.stateHistoryForUndo = history;
    }
    if (!next.mustRemove) {
        const merged = { ...s, ...updates } as TagTeamStoreState;
        const nextTurn = getNextTurnOrder(merged);
        updates.turnOrder = nextTurn;
        updates.mustPlaceBonus = getMustPlaceBonusForNext(merged, nextTurn);
        if (nextTurn === 0) updates.roundsPlayed = (s.roundsPlayed ?? 0) + 1;
        const gameOverResult = checkTagTeamGameOver(merged);
        Object.assign(updates, gameOverResult);
      }
    set(updates);
    return true;
  },

  handleBonusPlace(board, position) {
    const s = get();
    if (s.gameOver) return false;
    const { board: activeBoard, team, isHuman } = getActiveFromTurn(s.turnOrder, s.config);
    if (board !== activeBoard || !isHuman) return false;
    if ((board === 'A' && s.boardAFinished) || (board === 'B' && s.boardBFinished)) return false;
    const state = board === 'A' ? s.boardA : s.boardB;
    if (state.phase !== 'moving' && state.phase !== 'flying') return false;
    const bonusHere = getBonusForBoardTeam(s.bonusStones, board, team);
    if (bonusHere.available <= 0) return false;
    const currentPlayer = state.currentPlayer;
    const stateForBonus: GameState = {
      ...state,
      phase: 'placing',
      stonesInHand: {
        ...state.stonesInHand,
        [currentPlayer]: state.stonesInHand[currentPlayer] + 1,
      },
    };
    const valid = getValidBonusPlacements(stateForBonus);
    if (!valid.includes(position)) return false;
    const next = makeMove(stateForBonus, position);
    if (next === state) return false;
    if (next.lastMove?.type === 'place' && next.lastMove.formedMill) return false;
    const bonusKey = board === 'A' ? 'boardA' : 'boardB';
    const side = team === 1 ? 'player' : 'opponent';
    const newBonusStones: BonusStonesPerBoard = {
      ...s.bonusStones,
      [bonusBoardKey(board)]: {
        ...s.bonusStones[bonusBoardKey(board)],
        [side]: {
          ...s.bonusStones[bonusBoardKey(board)][side],
          available: s.bonusStones[bonusBoardKey(board)][side].available - 1,
        },
      },
    };
    const updates: Partial<TagTeamStoreState> = {
      [bonusKey]: next,
      bonusStones: newBonusStones,
      mustPlaceBonus: null,
    };
    if (board === 'A') {
      const history = [...(s.stateHistoryForUndo ?? []), takeSnapshot(s)];
      if (history.length > MAX_UNDO_HISTORY) history.shift();
      updates.stateHistoryForUndo = history;
    }
    if (!next.mustRemove) {
      const merged = { ...s, ...updates } as TagTeamStoreState;
      const nextTurn = getNextTurnOrder(merged);
      updates.turnOrder = nextTurn;
      updates.mustPlaceBonus = getMustPlaceBonusForNext(merged, nextTurn);
      if (nextTurn === 0) updates.roundsPlayed = (s.roundsPlayed ?? 0) + 1;
      Object.assign(updates, checkTagTeamGameOver(merged));
    }
    set(updates);
    return true;
  },

  undoTwoMoves() {
    const s = get();
    if (s.gameOver || s.boardAFinished) return;
    if (s.turnOrder !== 0) return;
    const history = s.stateHistoryForUndo ?? [];
    if (history.length === 0) return;
    if ((s.undosUsedThisGame ?? 0) >= MAX_UNDOS_PER_GAME) return;
    const snap = history[history.length - 1];
    set({
      boardA: snap.boardA,
      boardB: snap.boardB,
      turnOrder: snap.turnOrder,
      mustPlaceBonus: snap.mustPlaceBonus,
      bonusStones: snap.bonusStones,
      teamCaptures: snap.teamCaptures,
      roundsPlayed: snap.roundsPlayed,
      boardAFinished: snap.boardAFinished,
      boardBFinished: snap.boardBFinished,
      stateHistoryForUndo: history.slice(0, -1),
      undosUsedThisGame: (s.undosUsedThisGame ?? 0) + 1,
    });
  },

  applyAIMove() {
    const s = get();
    if (s.gameOver) return;
    const { board, team, isHuman } = getActiveFromTurn(s.turnOrder, s.config);
    if ((board === 'A' && s.boardAFinished) || (board === 'B' && s.boardBFinished)) {
      set({ turnOrder: getNextTurnOrder(s) });
      return;
    }
    if (isHuman) return;

    const state = board === 'A' ? s.boardA : s.boardB;
    const difficulty =
      board === 'A' ? s.config.team2.boardAAiDifficulty : team === 1 ? s.config.team1.boardBAiDifficulty : s.config.team2.boardBAiDifficulty;

    if (s.mustPlaceBonus === board && getBonusForBoardTeam(s.bonusStones, board, team).available > 0 && (state.phase === 'moving' || state.phase === 'flying')) {
      const currentPlayer = state.currentPlayer;
      const stateForBonus: GameState = {
        ...state,
        phase: 'placing',
        stonesInHand: {
          ...state.stonesInHand,
          [currentPlayer]: state.stonesInHand[currentPlayer] + 1,
        },
      };
      const normalMove = getAIMove(state, difficulty);
      const normalWouldCloseMill =
        normalMove != null &&
        (() => {
          const next = normalMove.from != null
            ? makeMove({ ...state, selectedStone: normalMove.from }, normalMove.position)
            : makeMove(state, normalMove.position);
          return next.lastMove?.formedMill === true;
        })();
      const bonusMoves = getValidBonusPlacements(stateForBonus);
      const doBonus = !normalWouldCloseMill && bonusMoves.length > 0 && Math.random() < 0.5;
      if (!doBonus && normalMove != null) {
        const move = normalMove;
        let next: GameState = state;
        if (move.from != null) {
          next = makeMove({ ...state, selectedStone: move.from }, move.position);
        } else {
          next = makeMove(state, move.position);
        }
        if (next.mustRemove && move.remove !== undefined) {
          next = makeMove(next, move.remove);
        }
        const capturingTeam =
          next.lastMove?.type === 'remove'
            ? getTeamForPlayer(board, state.currentPlayer, s.config)
            : null;
        let newBonusStones = s.bonusStones;
        if (capturingTeam != null) {
          const recipientBoard = getRecipientBoard(board);
          const side = capturingTeam === 1 ? 'player' : 'opponent';
          const currentRecipient = getBonusForBoardTeam(s.bonusStones, recipientBoard, capturingTeam);
          const maxPerGame = getMaxBonusPerGame(s.config);
          const canGrant =
            currentRecipient.totalGenerated < maxPerGame && currentRecipient.available < MAX_BONUS_STONES;
          if (canGrant) {
            newBonusStones = {
              ...s.bonusStones,
              [bonusBoardKey(recipientBoard)]: {
                ...s.bonusStones[bonusBoardKey(recipientBoard)],
                [side]: {
                  available: currentRecipient.available + 1,
                  totalGenerated: currentRecipient.totalGenerated + 1,
                },
              },
            };
          }
        }
        const newCaptures =
          capturingTeam != null
            ? { ...s.teamCaptures, [capturingTeam]: s.teamCaptures[capturingTeam] + 1 }
            : s.teamCaptures;
        const updates: Partial<TagTeamStoreState> = {
          [board === 'A' ? 'boardA' : 'boardB']: next,
          bonusStones: newBonusStones,
          teamCaptures: newCaptures,
        };
        const merged = { ...s, ...updates } as TagTeamStoreState;
        const nextTurn = getNextTurnOrder(merged);
        updates.turnOrder = nextTurn;
        updates.mustPlaceBonus = getMustPlaceBonusForNext(merged, nextTurn);
        if (nextTurn === 0) updates.roundsPlayed = (s.roundsPlayed ?? 0) + 1;
        Object.assign(updates, checkTagTeamGameOver(merged));
        set(updates);
        return;
      }
      if (bonusMoves.length === 0) return;
      const pos = bonusMoves[Math.floor(Math.random() * bonusMoves.length)];
      const next = makeMove(stateForBonus, pos);
      const side = team === 1 ? 'player' : 'opponent';
      const newBonusStones: BonusStonesPerBoard = {
        ...s.bonusStones,
        [bonusBoardKey(board)]: {
          ...s.bonusStones[bonusBoardKey(board)],
          [side]: {
            ...s.bonusStones[bonusBoardKey(board)][side],
            available: s.bonusStones[bonusBoardKey(board)][side].available - 1,
          },
        },
      };
      const updates: Partial<TagTeamStoreState> = {
        [board === 'A' ? 'boardA' : 'boardB']: next,
        bonusStones: newBonusStones,
        mustPlaceBonus: next.mustRemove ? board : null,
      };
      if (!next.mustRemove) {
        const merged = { ...s, ...updates } as TagTeamStoreState;
        const nextTurn = getNextTurnOrder(merged);
        updates.turnOrder = nextTurn;
        updates.mustPlaceBonus = getMustPlaceBonusForNext(merged, nextTurn);
        if (nextTurn === 0) updates.roundsPlayed = (s.roundsPlayed ?? 0) + 1;
        Object.assign(updates, checkTagTeamGameOver(merged));
      }
      set(updates);
      return;
    }

    const move = getAIMove(state, difficulty);
    if (!move) return;
    let next: GameState = state;
    if (move.from != null) {
      next = makeMove({ ...state, selectedStone: move.from }, move.position);
    } else {
      next = makeMove(state, move.position);
    }
    if (next.mustRemove && move.remove !== undefined) {
      next = makeMove(next, move.remove);
    }
    const capturingTeam =
      next.lastMove?.type === 'remove'
        ? getTeamForPlayer(board, state.currentPlayer, s.config)
        : null;
    let newBonusStones = s.bonusStones;
    if (capturingTeam != null) {
      const recipientBoard = getRecipientBoard(board);
      const side = capturingTeam === 1 ? 'player' : 'opponent';
      const currentRecipient = getBonusForBoardTeam(s.bonusStones, recipientBoard, capturingTeam);
      const maxPerGame = getMaxBonusPerGame(s.config);
      const canGrant =
        currentRecipient.totalGenerated < maxPerGame && currentRecipient.available < MAX_BONUS_STONES;
      if (canGrant) {
        newBonusStones = {
          ...s.bonusStones,
          [bonusBoardKey(recipientBoard)]: {
            ...s.bonusStones[bonusBoardKey(recipientBoard)],
            [side]: {
              available: currentRecipient.available + 1,
              totalGenerated: currentRecipient.totalGenerated + 1,
            },
          },
        };
      }
    }
    const newCaptures =
      capturingTeam != null
        ? { ...s.teamCaptures, [capturingTeam]: s.teamCaptures[capturingTeam] + 1 }
        : s.teamCaptures;

    const updates: Partial<TagTeamStoreState> = {
      [board === 'A' ? 'boardA' : 'boardB']: next,
      bonusStones: newBonusStones,
      teamCaptures: newCaptures,
    };
    const merged = { ...s, ...updates } as TagTeamStoreState;
    const nextTurn = getNextTurnOrder(merged);
    updates.turnOrder = nextTurn;
    updates.mustPlaceBonus = getMustPlaceBonusForNext(merged, nextTurn);
    if (nextTurn === 0) updates.roundsPlayed = (s.roundsPlayed ?? 0) + 1;
    Object.assign(updates, checkTagTeamGameOver(merged));
    set(updates);
  },

  startFastFinish() {
    set({ fastFinishActive: true });
  },
}));

type BoardResult = 'team1' | 'team2' | 'draw';

function getBoardResult(winner: 1 | 2 | null, isDraw: boolean, team1Player: 1 | 2, team2Player: 1 | 2): BoardResult {
  if (isDraw || winner == null) return 'draw';
  return winner === team1Player ? 'team1' : 'team2';
}

function checkTagTeamGameOver(s: TagTeamStoreState): Partial<TagTeamStoreState> {
  const rA = checkGameOver(s.boardA);
  const rB = checkGameOver(s.boardB);
  const updates: Partial<TagTeamStoreState> = {};
  if (rA.gameOver) updates.boardAFinished = true;
  if (rB.gameOver) updates.boardBFinished = true;

  const boardAFinished = s.boardAFinished || updates.boardAFinished === true;
  const boardBFinished = s.boardBFinished || updates.boardBFinished === true;
  if (!boardAFinished || !boardBFinished) return updates;

  updates.gameOver = true;
  updates.fastFinishActive = false;
  const resultA: BoardResult = getBoardResult(
    rA.winner,
    rA.isDraw ?? false,
    s.config.team1.boardAPlayer,
    s.config.team2.boardAPlayer
  );
  const resultB: BoardResult = getBoardResult(
    rB.winner,
    rB.isDraw ?? false,
    s.config.team1.boardBPlayer,
    s.config.team2.boardBPlayer
  );
  if (resultA === 'team1' && resultB === 'team1') {
    updates.matchResult = 'win';
    updates.winningTeam = 1;
  } else if (resultA === 'team2' && resultB === 'team2') {
    updates.matchResult = 'loss';
    updates.winningTeam = 2;
  } else if ((resultA === 'team1' && resultB === 'draw') || (resultA === 'draw' && resultB === 'team1')) {
    updates.matchResult = 'win';
    updates.winningTeam = 1;
  } else if ((resultA === 'team2' && resultB === 'draw') || (resultA === 'draw' && resultB === 'team2')) {
    updates.matchResult = 'loss';
    updates.winningTeam = 2;
  } else {
    updates.matchResult = 'draw';
    updates.winningTeam = null;
  }
  return updates;
}

export function getTagTeamAIMoveDelay(
  turnOrder: number,
  config: TagTeamConfig,
  fastFinishActive?: boolean
): number {
  if (fastFinishActive) return 0;
  const { board, team } = getActiveFromTurn(turnOrder, config);
  const d =
    board === 'A' ? config.team2.boardAAiDifficulty : team === 1 ? config.team1.boardBAiDifficulty : config.team2.boardBAiDifficulty;
  return getAIMoveDelay(d);
}
