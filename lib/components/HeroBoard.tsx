/**
 * Dekoratives, nicht-interaktives Mühle-Brett für die Landing Page.
 * Realistische Mittelspiel-Stellung: Schwarz und Weiß über das Brett gemischt.
 * Alle 4 Seiten und alle 3 Ringe besetzt – kein Farbgruppierung.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createEmptyBoard } from '../game/board';
import type { GameState } from '../game/types';
import { Board } from './Board';
import type { Theme } from '../theme/types';

/** Schwarz (5 Steine) – über Brett verteilt: 0, 4, 12, 19, 22. */
const HERO_BLACK_POSITIONS = [0, 4, 12, 19, 22];
/** Weiß (5 Steine) – über Brett verteilt: 2, 7, 9, 17, 21. */
const HERO_WHITE_POSITIONS = [2, 7, 9, 17, 21];

function buildHeroGameState(): GameState {
  const board = createEmptyBoard();
  for (const p of HERO_BLACK_POSITIONS) board[p] = 1;
  for (const p of HERO_WHITE_POSITIONS) board[p] = 2;
  return {
    board,
    currentPlayer: 1,
    phase: 'moving',
    stonesInHand: { 1: 0, 2: 0 },
    stonesOnBoard: { 1: 5, 2: 4 },
    mustRemove: false,
    selectedStone: null,
    moveHistory: [],
    moveCount: 10,
    gameOver: false,
    winner: null,
    isDraw: false,
    lastMove: null,
    lastMillAtMove: -1,
    movesSinceLastMill: 0,
    positionCount: {},
  };
}

const HERO_STATE = buildHeroGameState();

const HERO_GRADIENT_COLORS = ['transparent', 'rgba(253,250,245,0.85)', '#FDFAF5'] as const;

export interface HeroBoardProps {
  theme: Theme;
  boardSize: number;
}

/** Scale so stones stay inside the frame (no overflow). */
const BOARD_SCALE = 0.88;

export function HeroBoard({ theme, boardSize }: HeroBoardProps) {
  const innerSize = Math.floor(boardSize * BOARD_SCALE);
  return (
    <View style={[styles.wrapper, { width: boardSize, height: boardSize }]} pointerEvents="none">
      <View style={[styles.boardInner, { width: innerSize, height: innerSize }]}>
        <Board
          gameState={HERO_STATE}
          validMoves={[]}
          onPositionPress={() => {}}
          theme={theme}
          boardSizeOverride={innerSize}
        />
      </View>
      <LinearGradient
        colors={HERO_GRADIENT_COLORS}
        style={styles.gradient}
        locations={[0, 0.5, 1]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    opacity: 0.98,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  boardInner: {},
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    pointerEvents: 'none',
  },
});
