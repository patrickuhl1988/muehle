/**
 * Tutorial step definitions and predefined game states for the 7-step Mühle tutorial.
 * Pure data + helpers – no UI.
 */

import type { GameState, Position } from './types';
import type { MillLine } from './types';
import { createEmptyBoard } from './board';
import { countStones } from './board';
import { MILL_LINES } from './constants';

const TOTAL_STEPS = 7;

/** Builds a minimal GameState from board array and options. */
function stateFromBoard(
  board: (0 | 1 | 2)[],
  currentPlayer: 1 | 2,
  options: {
    phase?: GameState['phase'];
    mustRemove?: boolean;
    selectedStone?: Position | null;
  } = {}
): GameState {
  const stonesOnBoard = { 1: countStones(board, 1), 2: countStones(board, 2) };
  const totalPlaced = stonesOnBoard[1] + stonesOnBoard[2];
  const phase = options.phase ?? (totalPlaced < 18 ? 'placing' : 'moving');
  const stonesInHand = {
    1: Math.max(0, 9 - stonesOnBoard[1]),
    2: Math.max(0, 9 - stonesOnBoard[2]),
  };
  return {
    board: [...board] as GameState['board'],
    currentPlayer,
    phase,
    stonesInHand,
    stonesOnBoard,
    mustRemove: options.mustRemove ?? false,
    selectedStone: options.selectedStone ?? null,
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

/** Step 1: Empty board. */
export function getTutorialStateStep1(): GameState {
  const board = createEmptyBoard();
  return stateFromBoard(board, 1);
}

/** Step 2: Example position with 3 black, 2 white; user places on one of the highlighted frees. */
export function getTutorialStateStep2(): GameState {
  const board = createEmptyBoard();
  board[0] = 1;
  board[1] = 1;
  board[7] = 1;
  board[9] = 2;
  board[10] = 2;
  return stateFromBoard(board, 1);
}

/** Allowed positions for step 2 (free positions that do not complete a mill yet). */
export const TUTORIAL_STEP2_ALLOWED_POSITIONS: Position[] = [8, 14, 15];

/** AI "response" position for step 2 (after player places). */
export const TUTORIAL_STEP2_AI_POSITION: Position = 5;

/** Step 3: Predefined position showing a mill (e.g. 0,1,2 = player 1 mill). */
export function getTutorialStateStep3(): GameState {
  const board = createEmptyBoard();
  board[0] = 1;
  board[1] = 1;
  board[2] = 1;
  board[9] = 2;
  board[10] = 2;
  board[4] = 2;
  return stateFromBoard(board, 1);
}

/** Mill line to highlight in step 3. */
export const TUTORIAL_STEP3_MILL_LINE: MillLine = [0, 1, 2];

/** Step 4: Player just formed a mill, must remove opponent stone. */
export function getTutorialStateStep4(): GameState {
  const board = createEmptyBoard();
  board[0] = 1;
  board[1] = 1;
  board[2] = 1;
  board[9] = 2;
  board[10] = 2;
  board[4] = 2;
  return stateFromBoard(board, 1, { mustRemove: true });
}

/** Step 5: Moving phase – midgame, one black stone (1) highlighted; adjacent 0, 2, 9 empty so valid moves show. */
export function getTutorialStateStep5(): GameState {
  const board = createEmptyBoard();
  board[1] = 1;
  board[7] = 1;
  board[10] = 1;
  board[15] = 1;
  board[17] = 1;
  board[3] = 2;
  board[4] = 2;
  board[5] = 2;
  board[11] = 2;
  board[13] = 2;
  return stateFromBoard(board, 1, { phase: 'moving', selectedStone: 1 });
}

/** Suggested stone to select in step 5 (has adjacent empty). */
export const TUTORIAL_STEP5_SELECT_POSITION: Position = 1;
/** Valid moves from position 1: adjacent empty. */
export const TUTORIAL_STEP5_VALID_MOVES: Position[] = [0, 2, 9];

/** Step 6: Flying – 3 black stones, many white; one black highlighted, many jump targets. */
export function getTutorialStateStep6(): GameState {
  const board = createEmptyBoard();
  board[0] = 1;
  board[9] = 1;
  board[21] = 1;
  board[1] = 2;
  board[2] = 2;
  board[3] = 2;
  board[11] = 2;
  board[4] = 2;
  board[5] = 2;
  return stateFromBoard(board, 1, { phase: 'flying', selectedStone: 0 });
}

/** Step 6: from position (selected stone). */
export const TUTORIAL_STEP6_FROM: Position = 0;
/** Step 6: example jump targets for overlay spotlight (subset so overlay stays readable). */
export const TUTORIAL_STEP6_SPOTLIGHT: Position[] = [0, 12, 15, 20, 23];

/** Step 7: End position – black has 5 stones, white has 2 (clear win). */
export function getTutorialStateStep7(): GameState {
  const board = createEmptyBoard();
  board[0] = 1;
  board[1] = 1;
  board[2] = 1;
  board[9] = 1;
  board[17] = 1;
  board[4] = 2;
  board[5] = 2;
  return stateFromBoard(board, 1);
}

/** Step 7: white stones to highlight (only 2 left). */
export const TUTORIAL_STEP7_WHITE_STONES: Position[] = [4, 5];

/**
 * Returns the initial game state for a tutorial step (1–7).
 */
export function getTutorialStateForStep(step: number): GameState {
  switch (step) {
    case 1:
      return getTutorialStateStep1();
    case 2:
      return getTutorialStateStep2();
    case 3:
      return getTutorialStateStep3();
    case 4:
      return getTutorialStateStep4();
    case 5:
      return getTutorialStateStep5();
    case 6:
      return getTutorialStateStep6();
    case 7:
      return getTutorialStateStep7();
    default:
      return getTutorialStateStep1();
  }
}

export interface TutorialStepConfig {
  title: string;
  text: string;
  /** If true, "Weiter" is shown and user must tap to advance. */
  waitForButton: boolean;
  /** Positions to spotlight (empty circle cutout). If null, no spotlight. */
  spotlightPositions: Position[] | null;
  /** Mill line to highlight (step 3). */
  millLine: MillLine | null;
  /** For step 2: allowed positions to place. */
  allowedPositions: Position[] | null;
  /** Removable positions (step 4). */
  removablePositions: Position[] | null;
}

const STEP_CONFIGS: TutorialStepConfig[] = [
  {
    title: 'Das Spielfeld',
    text: 'Dies ist das Mühle-Brett. Es hat 24 Positionen, auf die du Steine setzen kannst.',
    waitForButton: true,
    spotlightPositions: null,
    millLine: null,
    allowedPositions: null,
    removablePositions: null,
  },
  {
    title: 'Steine setzen',
    text: 'Tippe auf eine freie Position, um deinen Stein zu platzieren. Jeder Spieler hat 9 Steine.',
    waitForButton: false,
    spotlightPositions: null,
    millLine: null,
    allowedPositions: TUTORIAL_STEP2_ALLOWED_POSITIONS,
    removablePositions: null,
  },
  {
    title: 'Eine Mühle bilden',
    text: 'Bringe 3 deiner Steine in eine Reihe auf einer Linie – das ist eine Mühle! Horizontale und vertikale Linien zählen.',
    waitForButton: true,
    spotlightPositions: [0, 1, 2],
    millLine: TUTORIAL_STEP3_MILL_LINE,
    allowedPositions: null,
    removablePositions: null,
  },
  {
    title: 'Stein entfernen',
    text: 'Wenn du eine Mühle schließt, darfst du einen gegnerischen Stein vom Brett nehmen.',
    waitForButton: true,
    spotlightPositions: null,
    millLine: null,
    allowedPositions: null,
    removablePositions: [9, 10, 4],
  },
  {
    title: 'Steine bewegen',
    text: 'Wenn alle 18 Steine gesetzt sind, beginnt die Zugphase. Bewege einen deiner Steine auf ein benachbartes freies Feld.',
    waitForButton: true,
    spotlightPositions: [TUTORIAL_STEP5_SELECT_POSITION, ...TUTORIAL_STEP5_VALID_MOVES],
    millLine: null,
    allowedPositions: null,
    removablePositions: null,
  },
  {
    title: 'Springen',
    text: 'Hat ein Spieler nur noch 3 Steine, darf er auf jedes freie Feld springen – nicht nur auf Nachbarfelder!',
    waitForButton: true,
    spotlightPositions: TUTORIAL_STEP6_SPOTLIGHT,
    millLine: null,
    allowedPositions: null,
    removablePositions: null,
  },
  {
    title: 'Spielende',
    text: 'Du gewinnst, wenn dein Gegner nur noch 2 Steine hat oder keinen gültigen Zug mehr machen kann. Viel Erfolg!',
    waitForButton: true,
    spotlightPositions: TUTORIAL_STEP7_WHITE_STONES,
    millLine: null,
    allowedPositions: null,
    removablePositions: null,
  },
];

/**
 * Returns config for tutorial step (1–7).
 */
export function getTutorialStepConfig(step: number): TutorialStepConfig {
  const index = Math.max(0, Math.min(step - 1, STEP_CONFIGS.length - 1));
  return STEP_CONFIGS[index];
}

export { TOTAL_STEPS, MILL_LINES };
