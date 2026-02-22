/**
 * Puzzle definitions for Mühle. 50 puzzles: 10 per difficulty.
 *
 * Terminologie: Ein "Zug" = ein Spielerzug (Bewegen/Setzen + ggf. einen Stein entfernen).
 * Lösungsschritte: Jeder Eintrag in solution[] = eine Aktion (place/move/remove).
 * Mittel: solution = [move, remove] = 1 Zug → Beschreibung "Gewinne in 1 Zug".
 * Schwer: solution = [move, remove, move] = 2 volle Züge + dritter Zug (Mühle); Sieg nach optionalem Entfernen.
 *
 * Leicht (1): Mühle in 1 Zug. Mittel (2): Gewinne in 1 Zug. Schwer (3): Gewinne in 3 Zügen.
 * Experte (4): Verteidige / Finde den einzigen Zug. Meister (5): Maximiere / Zwickmühlen.
 */

import type { PuzzleDefinition, BoardState, GameState, Move, Player, Position } from './types';
import { createEmptyBoard, countStones, isInMill } from './board';
import { applyMove } from './engine';

/** Difficulty labels for UI. */
export const DIFFICULTY_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Leicht',
  2: 'Mittel',
  3: 'Schwer',
  4: 'Experte',
  5: 'Meister',
};

/**
 * Converts a PuzzleDefinition to initial GameState for the engine.
 */
export function puzzleDefinitionToGameState(puzzle: PuzzleDefinition): GameState {
  const stonesOnBoard = {
    1: countStones(puzzle.board, 1),
    2: countStones(puzzle.board, 2),
  };
  return {
    board: [...puzzle.board] as BoardState,
    currentPlayer: puzzle.currentPlayer,
    phase: puzzle.phase,
    stonesInHand: { ...puzzle.stonesInHand },
    stonesOnBoard,
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
    skipDrawDetection: true,
  };
}

/**
 * Builds a Move from user action (for puzzle attemptMove).
 * state must have selectedStone set when phase is moving/flying and move is a move.
 * formedMill is computed from the resulting board.
 */
export function buildMoveFromState(state: GameState, position: Position): Move {
  const player = state.currentPlayer;
  if (state.mustRemove) {
    return { type: 'remove', player, to: position, formedMill: false };
  }
  if (state.phase === 'placing') {
    const board = [...state.board] as BoardState;
    board[position] = player;
    const formedMill = isInMill(board, position, player);
    return { type: 'place', player, to: position, formedMill };
  }
  if (state.phase === 'moving' || state.phase === 'flying') {
    const from = state.selectedStone;
    if (from != null) {
      const board = [...state.board] as BoardState;
      board[from] = 0;
      board[position] = player;
      const formedMill = isInMill(board, position, player);
      return { type: 'move', player, from, to: position, formedMill };
    }
  }
  return { type: 'place', player, to: position, formedMill: false };
}

/** Helper to create a board from position arrays. */
function boardFrom(
  p1: Position[],
  p2: Position[]
): BoardState {
  const b = createEmptyBoard();
  for (const p of p1) b[p] = 1;
  for (const p of p2) b[p] = 2;
  return b;
}

/** Leicht (10): Mühle in 1 Zug – eindeutige Lösung. */
const LEICHT: PuzzleDefinition[] = [
  {
    id: 'L01',
    title: 'Erste Mühle',
    description: 'Schließe eine Mühle in 1 Zug.',
    difficulty: 1,
    objective: 'win_in_1',
    board: boardFrom([0, 1], [9, 10, 4]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 7 },
    solution: [{ type: 'place', player: 1, to: 2, formedMill: true }],
    title: 'Erste Mühle',
  },
  {
    id: 'L02',
    title: 'Obere Linie',
    description: 'Schließe die Mühle auf der oberen Linie.',
    difficulty: 1,
    objective: 'win_in_1',
    board: boardFrom([1, 2], [9, 10, 4]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 7 },
    solution: [{ type: 'place', player: 1, to: 0, formedMill: true }],
    title: 'Obere Linie',
  },
  {
    id: 'L03',
    title: 'Linke Flanke',
    description: 'Vervollständige die Mühle links.',
    difficulty: 1,
    objective: 'win_in_1',
    board: boardFrom([0, 7], [1, 15, 14]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 7 },
    solution: [{ type: 'place', player: 1, to: 6, formedMill: true }],
    title: 'Linke Flanke',
  },
  {
    id: 'L04',
    title: 'Mitte oben',
    description: 'Setze in die Mitte und schließe die Mühle.',
    difficulty: 1,
    objective: 'win_in_1',
    board: boardFrom([8, 10], [1, 17, 11]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 7 },
    solution: [{ type: 'place', player: 1, to: 9, formedMill: true }],
    title: 'Mitte oben',
  },
  {
    id: 'L05',
    title: 'Vertikal',
    description: 'Schließe die vertikale Mühle in der Mitte.',
    difficulty: 1,
    objective: 'win_in_1',
    board: boardFrom([1, 9], [0, 2, 10]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 7 },
    solution: [{ type: 'place', player: 1, to: 17, formedMill: true }],
    title: 'Vertikal',
  },
  // L06 "Innere Ecke": Korrigiert – Lösungsposition 15 war von Weiß besetzt; Weiß von 15 entfernt.
  {
    id: 'L06',
    title: 'Innere Ecke',
    description: 'Vervollständige die innere Mühle.',
    difficulty: 1,
    objective: 'win_in_1',
    board: boardFrom([8, 14], [9, 7, 10]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 7 },
    solution: [{ type: 'place', player: 1, to: 15, formedMill: true }],
    title: 'Innere Ecke',
  },
  // L07 "Rechte Seite": Korrigiert – Lösung war to:5 (besetzt); rechte Mühle = Linie [2,3,4], Lösung to:2, Weiß von 2 entfernt.
  {
    id: 'L07',
    title: 'Rechte Seite',
    description: 'Schließe die Mühle rechts.',
    difficulty: 1,
    objective: 'win_in_1',
    board: boardFrom([3, 4], [11, 5]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 7 },
    solution: [{ type: 'place', player: 1, to: 2, formedMill: true }],
    title: 'Rechte Seite',
  },
  // L08 "Untere Linie": Korrigiert – Lösungsposition 4 war von Weiß besetzt; Weiß von 4 entfernt.
  {
    id: 'L08',
    title: 'Untere Linie',
    description: 'Vervollständige die untere horizontale Mühle.',
    difficulty: 1,
    objective: 'win_in_1',
    board: boardFrom([5, 6], [13, 7, 12]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 7 },
    solution: [{ type: 'place', player: 1, to: 4, formedMill: true }],
    title: 'Untere Linie',
  },
  // L09 "Zentrum": Korrigiert – Lösungsposition 11 war von Weiß besetzt; Weiß von 11 entfernt.
  {
    id: 'L09',
    title: 'Zentrum',
    description: 'Setze ins Zentrum und schließe die Mühle.',
    difficulty: 1,
    objective: 'win_in_1',
    board: boardFrom([10, 12], [9, 3, 2]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 7 },
    solution: [{ type: 'place', player: 1, to: 11, formedMill: true }],
    title: 'Zentrum',
  },
  // L10 "Letzte Lücke": Korrigiert – Lösungsposition 13 war von Weiß besetzt; Weiß von 13 entfernt.
  {
    id: 'L10',
    title: 'Letzte Lücke',
    description: 'Finde die letzte Lücke für die Mühle.',
    difficulty: 1,
    objective: 'win_in_1',
    board: boardFrom([12, 14], [11, 5, 10]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 7 },
    solution: [{ type: 'place', player: 1, to: 13, formedMill: true }],
    title: 'Letzte Lücke',
  },
];

/** Mittel (10): Gewinne in 1 Zug. Lösung = [Zug, Entfernen] = ein voller Spielerzug (Mühle schließen + Stein nehmen zählt als 1 Zug). */
const MITTEL: PuzzleDefinition[] = [
  // M01 "Zug und Schlag": FIX – Beschreibung war "2 Züge", Lösung ist 1 Zug (Bewegen + Entfernen = 1 Spielerzug).
  {
    id: 'M01',
    title: 'Zug und Schlag',
    description: 'Gewinne in 1 Zug: Mühle schließen, Stein entfernen.',
    difficulty: 2,
    objective: 'win_in_2',
    board: boardFrom([0, 2, 9], [10, 4, 7, 3]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 9, to: 1, formedMill: true },
      { type: 'remove', player: 1, to: 10, formedMill: false },
    ],
    title: 'Zug und Schlag',
  },
  // M02 "Öffnen und Schlagen": Korrigiert – Zug 10->11 schloss keine Mühle; Stellung 10,12,3, Lösung 3->11 (Mühle [10,11,12]).
  {
    id: 'M02',
    title: 'Öffnen & Schlagen',
    description: 'Ziehe so, dass du eine Mühle schließt und einen Stein nimmst.',
    difficulty: 2,
    objective: 'win_in_2',
    board: boardFrom([10, 12, 3], [0, 9, 4, 2]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 3, to: 11, formedMill: true },
      { type: 'remove', player: 1, to: 0, formedMill: false },
    ],
    title: 'Öffnen & Schlagen',
  },
  {
    id: 'M03',
    title: 'Setzen & Schlagen',
    description: 'Setze einen Stein, schließe eine Mühle, nimm einen gegnerischen Stein.',
    difficulty: 2,
    objective: 'win_in_2',
    board: boardFrom([0, 1, 9], [10, 4, 3]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 6, 2: 7 },
    solution: [
      { type: 'place', player: 1, to: 2, formedMill: true },
      { type: 'remove', player: 1, to: 4, formedMill: false },
    ],
    title: 'Setzen & Schlagen',
  },
  // M04 "Doppelzug": Korrigiert – 15 ist nicht benachbart zu 16; Stellung 7,23,8, Lösung 8->15 (Mühle [7,15,23]).
  {
    id: 'M04',
    title: 'Doppelzug',
    description: 'Gewinne in 1 Zug: Mühle schließen, Stein entfernen.',
    difficulty: 2,
    objective: 'win_in_2',
    board: boardFrom([7, 23, 8], [0, 6, 22]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 8, to: 15, formedMill: true },
      { type: 'remove', player: 1, to: 0, formedMill: false },
    ],
    title: 'Doppelzug',
  },
  // M05 "Schneller Sieg": Korrigiert – 11 ist nicht benachbart zu 18; Stellung 19,20,17, Lösung 17->18 (Mühle [18,19,20]).
  {
    id: 'M05',
    title: 'Schneller Sieg',
    description: 'Gewinne in 1 Zug.',
    difficulty: 2,
    objective: 'win_in_2',
    board: boardFrom([19, 20, 17], [2, 4, 11]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 17, to: 18, formedMill: true },
      { type: 'remove', player: 1, to: 2, formedMill: false },
    ],
    title: 'Schneller Sieg',
  },
  // M06 "Mitte nutzen": Korrigiert – Zug 9->8 schloss keine Mühle; Stellung 1,17,8, Lösung 8->9 (Mühle [1,9,17]).
  {
    id: 'M06',
    title: 'Mitte nutzen',
    description: 'Gewinne in 1 Zug über die Mitte.',
    difficulty: 2,
    objective: 'win_in_2',
    board: boardFrom([1, 17, 8], [10, 0, 16]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 8, to: 9, formedMill: true },
      { type: 'remove', player: 1, to: 0, formedMill: false },
    ],
    title: 'Mitte nutzen',
  },
  // M07 "Zwei Schritte": Korrigiert – Zug 13->12 schloss keine Mühle; Stellung 5,21,12, Lösung 12->13 (Mühle [5,13,21]).
  {
    id: 'M07',
    title: 'Zwei Schritte',
    description: 'Mühle schließen, Stein entfernen.',
    difficulty: 2,
    objective: 'win_in_2',
    board: boardFrom([5, 21, 12], [4, 6, 14]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 12, to: 13, formedMill: true },
      { type: 'remove', player: 1, to: 4, formedMill: false },
    ],
    title: 'Zwei Schritte',
  },
  // M08 "Ecke und Schlag": Korrigiert – Zug 14->15 schloss keine Mühle; Stellung 14,8,6, Lösung 8->15 (Mühle [14,15,8]).
  {
    id: 'M08',
    title: 'Ecke und Schlag',
    description: 'Ziehe in die Ecke, nimm einen Stein.',
    difficulty: 2,
    objective: 'win_in_2',
    board: boardFrom([14, 8, 6], [0, 5, 23]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 8, to: 15, formedMill: true },
      { type: 'remove', player: 1, to: 0, formedMill: false },
    ],
    title: 'Ecke und Schlag',
  },
  // M09 "Vertikal schlagen": Korrigiert – Zug 11->10 schloss keine Mühle; Stellung 3,19,10, Lösung 10->11 (Mühle [3,11,19]).
  {
    id: 'M09',
    title: 'Vertikal schlagen',
    description: 'Schließe die vertikale Mühle und nimm einen Stein.',
    difficulty: 2,
    objective: 'win_in_2',
    board: boardFrom([3, 19, 10], [12, 2, 8]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 10, to: 11, formedMill: true },
      { type: 'remove', player: 1, to: 2, formedMill: false },
    ],
    title: 'Vertikal schlagen',
  },
  // M10 "Kurz zum Sieg": Korrigiert – Zug 17->18 schloss keine Mühle; Stellung 16,18,9, Lösung 9->17 (Mühle [16,17,18]).
  {
    id: 'M10',
    title: 'Kurz zum Sieg',
    description: 'Gewinne in 1 Zug.',
    difficulty: 2,
    objective: 'win_in_2',
    board: boardFrom([16, 18, 9], [15, 22, 8]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 9, to: 17, formedMill: true },
      { type: 'remove', player: 1, to: 15, formedMill: false },
    ],
    title: 'Kurz zum Sieg',
  },
];

/** Schwer (10): Gewinne in 3 Zügen. */
const SCHWER: PuzzleDefinition[] = [
  {
    id: 'S01',
    title: 'Drei Züge',
    description: 'Gewinne in 3 Zügen. Gegner spielt optimal.',
    difficulty: 3,
    objective: 'win_in_3',
    board: boardFrom([0, 1, 7, 9], [4, 10, 15, 3]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 1, to: 2, formedMill: true },
      { type: 'remove', player: 1, to: 10, formedMill: false },
      { type: 'move', player: 1, from: 9, to: 10, formedMill: true },
    ],
    title: 'Drei Züge',
  },
  {
    id: 'S02',
    title: 'Plan drei',
    description: 'Finde die 3-Zug-Kombination.',
    difficulty: 3,
    objective: 'win_in_3',
    board: boardFrom([1, 9, 17, 2], [10, 3, 11]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 9, to: 0, formedMill: true },
      { type: 'remove', player: 1, to: 3, formedMill: false },
      { type: 'move', player: 1, from: 1, to: 3, formedMill: true },
    ],
    title: 'Plan drei',
  },
  {
    id: 'S03',
    title: 'Kettenreaktion',
    description: 'Drei Züge zum Sieg.',
    difficulty: 3,
    objective: 'win_in_3',
    board: boardFrom([8, 9, 15, 17], [14, 16, 11]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 9, to: 10, formedMill: true },
      { type: 'remove', player: 1, to: 14, formedMill: false },
      { type: 'move', player: 1, from: 15, to: 14, formedMill: true },
    ],
    title: 'Kettenreaktion',
  },
  {
    id: 'S04',
    title: 'Vorausdenken',
    description: 'Gewinne in genau 3 Zügen.',
    difficulty: 3,
    objective: 'win_in_3',
    board: boardFrom([3, 11, 12, 19], [2, 4, 20]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 11, to: 18, formedMill: true },
      { type: 'remove', player: 1, to: 2, formedMill: false },
      { type: 'move', player: 1, from: 12, to: 2, formedMill: true },
    ],
    title: 'Vorausdenken',
  },
  {
    id: 'S05',
    title: 'Dreiersequenz',
    description: 'Drei Züge – Mühle, Schlag, Mühle.',
    difficulty: 3,
    objective: 'win_in_3',
    board: boardFrom([5, 13, 20, 21], [4, 22, 14]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 13, to: 12, formedMill: true },
      { type: 'remove', player: 1, to: 4, formedMill: false },
      { type: 'move', player: 1, from: 20, to: 22, formedMill: true },
    ],
    title: 'Dreiersequenz',
  },
  {
    id: 'S06',
    title: 'Komplex',
    description: 'Erfordert Vorausdenken über 3 Züge.',
    difficulty: 3,
    objective: 'win_in_3',
    board: boardFrom([0, 7, 9, 15], [6, 8, 14, 3]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 9, to: 1, formedMill: true },
      { type: 'remove', player: 1, to: 8, formedMill: false },
      { type: 'move', player: 1, from: 15, to: 8, formedMill: true },
    ],
    title: 'Komplex',
  },
  {
    id: 'S07',
    title: 'Dreischritt',
    description: 'Gewinne in 3 Zügen.',
    difficulty: 3,
    objective: 'win_in_3',
    board: boardFrom([10, 11, 12, 19], [9, 18, 2]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 11, to: 3, formedMill: true },
      { type: 'remove', player: 1, to: 9, formedMill: false },
      { type: 'move', player: 1, from: 10, to: 9, formedMill: true },
    ],
    title: 'Dreischritt',
  },
  {
    id: 'S08',
    title: 'Langfristig',
    description: 'Drei Züge zum Sieg.',
    difficulty: 3,
    objective: 'win_in_3',
    board: boardFrom([16, 17, 18, 23], [15, 22, 11]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 17, to: 19, formedMill: true },
      { type: 'remove', player: 1, to: 15, formedMill: false },
      { type: 'move', player: 1, from: 23, to: 15, formedMill: true },
    ],
    title: 'Langfristig',
  },
  {
    id: 'S09',
    title: 'Tiefe drei',
    description: 'Gewinne in 3 Zügen.',
    difficulty: 3,
    objective: 'win_in_3',
    board: boardFrom([1, 2, 9, 10], [0, 3, 4]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 10, to: 11, formedMill: true },
      { type: 'remove', player: 1, to: 0, formedMill: false },
      { type: 'move', player: 1, from: 1, to: 0, formedMill: true },
    ],
    title: 'Tiefe drei',
  },
  {
    id: 'S10',
    title: 'Endspiel',
    description: 'Drei Züge zum Gewinn.',
    difficulty: 3,
    objective: 'win_in_3',
    board: boardFrom([6, 7, 14, 5], [0, 13, 23]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 14, to: 15, formedMill: true },
      { type: 'remove', player: 1, to: 0, formedMill: false },
      { type: 'move', player: 1, from: 7, to: 0, formedMill: true },
    ],
    title: 'Endspiel',
  },
];

/** Experte (10): Verteidige / Finde den einzigen Zug. */
const EXPERTE: PuzzleDefinition[] = [
  {
    id: 'E01',
    title: 'Einziger Zug',
    description: 'Nur ein Zug verhindert den sofortigen Verlust.',
    difficulty: 4,
    objective: 'defend',
    board: boardFrom([0, 1, 7], [2, 9, 10, 4]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 6, 2: 5 },
    solution: [{ type: 'place', player: 1, to: 2, formedMill: true }],
    title: 'Einziger Zug',
  },
  {
    id: 'E02',
    title: 'Blockieren',
    description: 'Verhindere die gegnerische Mühle.',
    difficulty: 4,
    objective: 'defend',
    board: boardFrom([1, 2], [0, 9, 17]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 6 },
    solution: [{ type: 'place', player: 1, to: 9, formedMill: false }],
    title: 'Blockieren',
  },
  {
    id: 'E03',
    title: 'Rettung',
    description: 'Finde den einzigen rettenden Zug.',
    difficulty: 4,
    objective: 'defend',
    board: boardFrom([8, 9], [10, 1, 17]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 6 },
    solution: [{ type: 'place', player: 1, to: 10, formedMill: false }],
    title: 'Rettung',
  },
  {
    id: 'E04',
    title: 'Verteidigung',
    description: 'Ein Zug hält die Stellung.',
    difficulty: 4,
    objective: 'defend',
    board: boardFrom([3, 11], [2, 4, 19]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 6 },
    solution: [{ type: 'place', player: 1, to: 19, formedMill: false }],
    title: 'Verteidigung',
  },
  {
    id: 'E05',
    title: 'Gegenangriff',
    description: 'Der einzige Zug, der dich rettet.',
    difficulty: 4,
    objective: 'defend',
    board: boardFrom([5, 13], [4, 6, 21]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 6 },
    solution: [{ type: 'place', player: 1, to: 21, formedMill: false }],
    title: 'Gegenangriff',
  },
  {
    id: 'E06',
    title: 'Kritisch',
    description: 'Nur ein Zug verhindert die Mühle des Gegners.',
    difficulty: 4,
    objective: 'defend',
    board: boardFrom([7, 15], [0, 6, 23]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 6 },
    solution: [{ type: 'place', player: 1, to: 23, formedMill: false }],
    title: 'Kritisch',
  },
  {
    id: 'E07',
    title: 'Schachmatt vermeiden',
    description: 'Finde den einzigen Zug.',
    difficulty: 4,
    objective: 'defend',
    board: boardFrom([16, 17], [9, 18, 19]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 6 },
    solution: [{ type: 'place', player: 1, to: 18, formedMill: false }],
    title: 'Schachmatt vermeiden',
  },
  {
    id: 'E08',
    title: 'Letzte Chance',
    description: 'Ein Zug rettet alles.',
    difficulty: 4,
    objective: 'defend',
    board: boardFrom([10, 11], [9, 12, 3]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 6 },
    solution: [{ type: 'place', player: 1, to: 12, formedMill: false }],
    title: 'Letzte Chance',
  },
  {
    id: 'E09',
    title: 'Verteidige die Mitte',
    description: 'Blockiere die gegnerische Drohung.',
    difficulty: 4,
    objective: 'defend',
    board: boardFrom([12, 13], [5, 14, 21]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 6 },
    solution: [{ type: 'place', player: 1, to: 14, formedMill: false }],
    title: 'Verteidige die Mitte',
  },
  {
    id: 'E10',
    title: 'Ein Zug',
    description: 'Der einzige Zug, der die Partie hält.',
    difficulty: 4,
    objective: 'defend',
    board: boardFrom([22, 23], [16, 21, 15]),
    currentPlayer: 1,
    phase: 'placing',
    stonesInHand: { 1: 7, 2: 6 },
    solution: [{ type: 'place', player: 1, to: 16, formedMill: false }],
    title: 'Ein Zug',
  },
];

/** Meister (10): Maximiere / Zwickmühlen. */
const MEISTER: PuzzleDefinition[] = [
  {
    id: 'X01',
    title: 'Zwickmühle 1',
    description: 'Entferne so viele Steine wie möglich – Zwickmühle nutzen.',
    difficulty: 5,
    objective: 'maximize',
    board: boardFrom([0, 1, 7, 9, 15], [2, 6, 8, 10, 14]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 1, to: 2, formedMill: true },
      { type: 'remove', player: 1, to: 8, formedMill: false },
    ],
    title: 'Zwickmühle 1',
  },
  {
    id: 'X02',
    title: 'Maximiere',
    description: 'Schließe Mühlen und nimm maximal viele Steine.',
    difficulty: 5,
    objective: 'maximize',
    board: boardFrom([1, 9, 17, 2], [0, 10, 3, 4]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 9, to: 0, formedMill: true },
      { type: 'remove', player: 1, to: 4, formedMill: false },
    ],
    title: 'Maximiere',
  },
  {
    id: 'X03',
    title: 'Doppelmühle',
    description: 'Nutze die Zwickmühle-Position.',
    difficulty: 5,
    objective: 'maximize',
    board: boardFrom([9, 10, 11, 17], [1, 3, 12, 19]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 11, to: 3, formedMill: true },
      { type: 'remove', player: 1, to: 19, formedMill: false },
    ],
    title: 'Doppelmühle',
  },
  {
    id: 'X04',
    title: 'Zwickmühle 2',
    description: 'Maximiere die Steinnahme.',
    difficulty: 5,
    objective: 'maximize',
    board: boardFrom([5, 13, 21, 12], [4, 6, 20, 22]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 13, to: 12, formedMill: true },
      { type: 'remove', player: 1, to: 20, formedMill: false },
    ],
    title: 'Zwickmühle 2',
  },
  {
    id: 'X05',
    title: 'Vernichtung',
    description: 'So viele gegnerische Steine wie möglich in einem Zug nehmen.',
    difficulty: 5,
    objective: 'maximize',
    board: boardFrom([7, 15, 23, 8], [0, 6, 16, 14]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 15, to: 16, formedMill: true },
      { type: 'remove', player: 1, to: 6, formedMill: false },
    ],
    title: 'Vernichtung',
  },
  {
    id: 'X06',
    title: 'Optimal schlagen',
    description: 'Finde den Zug mit maximalem Schlag.',
    difficulty: 5,
    objective: 'maximize',
    board: boardFrom([16, 17, 23, 18], [15, 19, 22, 9]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 17, to: 18, formedMill: true },
      { type: 'remove', player: 1, to: 9, formedMill: false },
    ],
    title: 'Optimal schlagen',
  },
  {
    id: 'X07',
    title: 'Meisterzug',
    description: 'Zwickmühle – maximiere die Steinnahme.',
    difficulty: 5,
    objective: 'maximize',
    board: boardFrom([0, 1, 7, 6], [2, 9, 15]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 1, to: 2, formedMill: true },
      { type: 'remove', player: 1, to: 9, formedMill: false },
    ],
    title: 'Meisterzug',
  },
  {
    id: 'X08',
    title: 'Maximum',
    description: 'Entferne so viele Steine wie möglich.',
    difficulty: 5,
    objective: 'maximize',
    board: boardFrom([3, 11, 19, 10], [2, 4, 18, 12]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 11, to: 12, formedMill: true },
      { type: 'remove', player: 1, to: 2, formedMill: false },
    ],
    title: 'Maximum',
  },
  {
    id: 'X09',
    title: 'Zwickmühle 3',
    description: 'Nutze die Doppelmühle.',
    difficulty: 5,
    objective: 'maximize',
    board: boardFrom([14, 15, 8, 9], [7, 13, 10, 23]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 9, to: 10, formedMill: true },
      { type: 'remove', player: 1, to: 7, formedMill: false },
    ],
    title: 'Zwickmühle 3',
  },
  {
    id: 'X10',
    title: 'Finale',
    description: 'Maximiere in der Endstellung.',
    difficulty: 5,
    objective: 'maximize',
    board: boardFrom([20, 21, 22, 13], [19, 23, 5, 12]),
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    solution: [
      { type: 'move', player: 1, from: 21, to: 20, formedMill: true },
      { type: 'remove', player: 1, to: 19, formedMill: false },
    ],
    title: 'Finale',
  },
];

/** All 50 puzzles by difficulty. */
export const ALL_PUZZLES: PuzzleDefinition[] = [
  ...LEICHT,
  ...MITTEL,
  ...SCHWER,
  ...EXPERTE,
  ...MEISTER,
];

/** All puzzle IDs (for daily index). */
export const ALL_PUZZLE_IDS: string[] = ALL_PUZZLES.map((p) => p.id);

/**
 * Gets puzzle by id.
 */
export function getPuzzleById(id: string): PuzzleDefinition | undefined {
  return ALL_PUZZLES.find((p) => p.id === id);
}

/**
 * Simple string hash for deterministic daily puzzle.
 */
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Returns local date string YYYY-MM-DD (for daily puzzle key).
 */
export function getLocalDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Gets the daily puzzle (deterministic: hash(date) % pool size).
 */
export function getDailyPuzzle(): PuzzleDefinition {
  const dateStr = getLocalDateString();
  const index = hashString(dateStr) % ALL_PUZZLES.length;
  return ALL_PUZZLES[index];
}

/**
 * Returns the daily puzzle number (e.g. 142) for display.
 */
export function getDailyPuzzleNumber(): number {
  const start = new Date(2024, 0, 1);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;
}

/** Puzzles grouped by difficulty for library UI. */
export const PUZZLES_BY_DIFFICULTY: Record<1 | 2 | 3 | 4 | 5, PuzzleDefinition[]> = {
  1: LEICHT,
  2: MITTEL,
  3: SCHWER,
  4: EXPERTE,
  5: MEISTER,
};

/** Only these difficulties are playable in the library; others show "Bald verfügbar". Daily puzzle stays playable. */
export const UNLOCKED_DIFFICULTIES: (1 | 2 | 3 | 4 | 5)[] = [1];
