/**
 * Game board component (SVG). Renders the Mühle board, lines, positions, stones.
 * Purely visual – no game logic. Uses useWindowDimensions, theme, Reanimated.
 */

import React, { useEffect } from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { positionToCoordinates, getBoardLineSegments } from '../utils/boardCoordinates';
import { Stone } from './Stone';
import type { GameState, Position } from '../game/types';
import type { Theme } from '../theme/types';
import type { CoachTip } from '../game/coach';

/** Tier 3: tiny structure dots – low priority, barely visible. */
const EMPTY_DOT_RADIUS = 4;
/** In puzzle mode: even smaller so only structure is hinted. */
const EMPTY_DOT_RADIUS_PUZZLE = 3;
const TOUCH_RADIUS = 24;
const MIN_BOARD_RATIO = 0.85;

/** Tier 1: stone size (must match Stone.tsx). Normal mode: ~5.5% of board; compact (Tag Team): ~4%. */
const STONE_RADIUS_NORMAL = 18;
const STONE_RADIUS_MIN_COMPACT = 14; // keep touch target ≥ 36px via TOUCH_RADIUS

function getStoneRadius(boardSize: number, compact: boolean): number {
  if (compact) return Math.max(STONE_RADIUS_MIN_COMPACT, boardSize * 0.04);
  return Math.max(STONE_RADIUS_NORMAL, boardSize * 0.055);
}

export interface BoardProps {
  gameState: GameState;
  validMoves: Position[];
  onPositionPress: (position: Position) => void;
  theme: Theme;
  /** Human player number (1 or 2). When set, opponent's last move is shown until human moves. */
  humanPlayer?: 1 | 2;
  /** Positions where opponent stone can be removed (when mustRemove). */
  removablePositions?: Position[];
  /** Position just placed (for pop-in animation). */
  lastPlacedPosition?: Position | null;
  /** Mill line [a,b,c] to highlight (e.g. when just closed). */
  millLineToHighlight?: [Position, Position, Position] | null;
  /** Hint: position of stone to move (puzzle mode). */
  hintFrom?: Position | null;
  /** Hint: target position (puzzle mode). */
  hintTo?: Position | null;
  /** Tutorial step 1: positions that blink one after another. */
  blinkingPositions?: Position[] | null;
  /** Coach tip: highlight suggested from/to positions. */
  coachTip?: CoachTip | null;
  /** When true, valid-move markers use player-colored pulsing fill; background circle is more subtle. */
  puzzleMode?: boolean;
  /** When set (e.g. tutorial), use this size so the board matches its container and stone scaling is correct. */
  boardSizeOverride?: number;
  /** When true (e.g. Tag Team), use smaller stones and dots for compact boards. */
  compact?: boolean;
}

/**
 * Returns board size (square) to use: at least 85% of screen width.
 */
function useBoardSize(): number {
  const { width } = useWindowDimensions();
  return Math.floor(width * MIN_BOARD_RATIO);
}

/**
 * Renders the Mühle board with SVG lines, empty dots, valid-move pulses, touch targets, and stones.
 */
export function Board({
  gameState,
  validMoves,
  onPositionPress,
  theme,
  humanPlayer,
  removablePositions = [],
  lastPlacedPosition = null,
  millLineToHighlight = null,
  hintFrom = null,
  hintTo = null,
  blinkingPositions = null,
  coachTip = null,
  puzzleMode = false,
  boardSizeOverride,
  compact = false,
}: BoardProps) {
  const windowBoardSize = useBoardSize();
  const boardSize = boardSizeOverride ?? windowBoardSize;
  const stoneRadius = getStoneRadius(boardSize, compact);
  const emptyDotRadius = compact ? Math.max(2, EMPTY_DOT_RADIUS_PUZZLE) : (puzzleMode ? EMPTY_DOT_RADIUS_PUZZLE : EMPTY_DOT_RADIUS);
  const { board, currentPlayer, mustRemove, selectedStone, lastMove, phase } = gameState;
  const playerColor = currentPlayer === 1 ? theme.colors.player1Stone : theme.colors.player2Stone;

  /** In placing/flying: no rings (too many). In moving: rings only after stone selected. Puzzle: always show. */
  const showValidMoveRings =
    puzzleMode || (phase === 'moving' && selectedStone != null);

  const coachPulseOpacity = useSharedValue(0.3);
  useEffect(() => {
    if (coachTip) {
      coachPulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      coachPulseOpacity.value = 0;
    }
  }, [coachTip, coachPulseOpacity]);

  const animatedCoachGlowStyle = useAnimatedStyle(() => ({
    opacity: coachPulseOpacity.value,
  }));

  /** Show opponent's last move (from/to/removed) until human makes their move. */
  const showOpponentLastMove =
    lastMove != null &&
    humanPlayer != null &&
    lastMove.player !== humanPlayer;

  const pulseOpacity = useSharedValue(0.2);
  useEffect(() => {
    if (showOpponentLastMove) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.35, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 0;
    }
  }, [showOpponentLastMove, pulseOpacity]);

  const animatedToGlowStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const blinkIndex = useSharedValue(0);
  useEffect(() => {
    if (blinkingPositions && blinkingPositions.length > 0) {
      const steps = Array.from({ length: 24 }, (_, i) => withTiming(i, { duration: 100 }));
      blinkIndex.value = withRepeat(
        withSequence(...steps),
        -1,
        false
      );
    }
  }, [blinkingPositions, blinkIndex]);

  const lineSegments = React.useMemo(
    () => getBoardLineSegments(boardSize),
    [boardSize]
  );

  const millHighlightOpacity = useSharedValue(0);
  useEffect(() => {
    if (millLineToHighlight) {
      millHighlightOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.3, { duration: 400 })
      );
    }
  }, [millLineToHighlight, millHighlightOpacity]);

  const animatedMillStyle = useAnimatedStyle(() => ({
    opacity: millHighlightOpacity.value,
  }));

  const linesColor = theme.colors.lines;
  const boardBg = theme.colors.board;
  const emptyDotColor = theme.fontColorSecondary;
  const strokeWidth = puzzleMode ? 1.5 : 2;
  const linesOpacity = puzzleMode ? 0.6 : 1;

  return (
    <View style={[styles.container, { width: boardSize, height: boardSize }]}>
      <Svg width={boardSize} height={boardSize} viewBox={`0 0 ${boardSize} ${boardSize}`}>
        {/* Board background (optional subtle fill; lower opacity in puzzle mode to avoid distraction) */}
        <Circle
          cx={boardSize / 2}
          cy={boardSize / 2}
          r={boardSize / 2 - 2}
          fill={boardBg}
          stroke={linesColor}
          strokeWidth={strokeWidth}
          opacity={puzzleMode ? 0.06 : 0.15}
        />
        {/* Board lines: 3 squares + 4 connectors (lighter in puzzle mode) */}
        {lineSegments.map((seg, i) => (
          <Line
            key={`line-${i}`}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke={linesColor}
            strokeWidth={strokeWidth}
            opacity={linesOpacity}
          />
        ))}
        {/* Tier 3: empty positions – tiny dots, very low opacity so they don't compete with stones or valid moves */}
        {Array.from({ length: 24 }, (_, i) => {
          const pos = i as Position;
          if (board[pos] !== 0) return null;
          if (puzzleMode && validMoves.includes(pos)) return null;
          const { x, y } = positionToCoordinates(pos, boardSize);
          return (
            <Circle
              key={`empty-${pos}`}
              cx={x}
              cy={y}
              r={emptyDotRadius}
              fill={emptyDotColor}
              opacity={0.25}
            />
          );
        })}
        {/* Opponent's last move: from ring, connection line, removed ring (behind stones) */}
        {showOpponentLastMove && lastMove && (
          <>
            {lastMove.from != null && (() => {
              const { x, y } = positionToCoordinates(lastMove.from!, boardSize);
              const opponentColor =
                lastMove.player === 1 ? theme.colors.player1Stone : theme.colors.player2Stone;
              return (
                <Circle
                  key="last-move-from"
                  cx={x}
                  cy={y}
                  r={stoneRadius + 4}
                  fill="none"
                  stroke={opponentColor}
                  strokeWidth={1.5}
                  strokeDasharray="4,4"
                  opacity={0.25}
                />
              );
            })()}
            {lastMove.from != null && (() => {
              const fromCo = positionToCoordinates(lastMove.from!, boardSize);
              const toCo = positionToCoordinates(lastMove.to, boardSize);
              return (
                <Line
                  key="last-move-line"
                  x1={fromCo.x}
                  y1={fromCo.y}
                  x2={toCo.x}
                  y2={toCo.y}
                  stroke={theme.colors.accent}
                  strokeWidth={1}
                  strokeDasharray="3,5"
                  opacity={0.15}
                />
              );
            })()}
            {lastMove.removed != null && (() => {
              const { x, y } = positionToCoordinates(lastMove.removed!, boardSize);
              return (
                <Circle
                  key="last-move-removed"
                  cx={x}
                  cy={y}
                  r={stoneRadius}
                  fill="none"
                  stroke="#CC4444"
                  strokeWidth={1.5}
                  strokeDasharray="3,3"
                  opacity={0.25}
                />
              );
            })()}
          </>
        )}
        {/* Coach tip: "from" ring (dashed green) */}
        {coachTip && coachTip.from != null && (() => {
          const { x, y } = positionToCoordinates(coachTip.from!, boardSize);
          return (
            <Circle
              key="coach-from"
              cx={x}
              cy={y}
              r={stoneRadius + 5}
              fill="none"
              stroke="#4CAF50"
              strokeWidth={2}
              strokeDasharray="6,3"
              opacity={0.5}
            />
          );
        })()}
        {/* Touch targets (invisible, 24px radius) */}
        {Array.from({ length: 24 }, (_, i) => {
          const pos = i as Position;
          const { x, y } = positionToCoordinates(pos, boardSize);
          return (
            <Circle
              key={`touch-${pos}`}
              cx={x}
              cy={y}
              r={TOUCH_RADIUS}
              fill="transparent"
              onPress={() => onPositionPress(pos)}
            />
          );
        })}
      </Svg>
      {/* Mill highlight overlay (gold flash when mill closed) */}
      {millLineToHighlight && (
        <Animated.View style={[StyleSheet.absoluteFill, animatedMillStyle]} pointerEvents="none">
          <Svg width={boardSize} height={boardSize} viewBox={`0 0 ${boardSize} ${boardSize}`}>
            {(() => {
              const [a, b, c] = millLineToHighlight;
              const pa = positionToCoordinates(a, boardSize);
              const pb = positionToCoordinates(b, boardSize);
              const pc = positionToCoordinates(c, boardSize);
              return (
                <>
                  <Line
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    stroke={theme.colors.highlight}
                    strokeWidth={4}
                  />
                  <Line
                    x1={pb.x}
                    y1={pb.y}
                    x2={pc.x}
                    y2={pc.y}
                    stroke={theme.colors.highlight}
                    strokeWidth={4}
                  />
                </>
              );
            })()}
          </Svg>
        </Animated.View>
      )}
      {/* Tutorial step 1: blinking positions */}
      {blinkingPositions?.map((pos) => (
        <BlinkingPositionDot
          key={`blink-${pos}`}
          position={pos}
          boardSize={boardSize}
          blinkIndex={blinkIndex}
          color={emptyDotColor}
        />
      ))}
      {/* Hint highlight (puzzle mode): ring at from and/or to */}
      {[hintFrom, hintTo].filter((p): p is Position => p != null).map((pos) => {
        const { x, y } = positionToCoordinates(pos, boardSize);
        return (
          <View
            key={`hint-${pos}`}
            style={{
              position: 'absolute',
              width: 28,
              height: 28,
              left: x - 14,
              top: y - 14,
              borderRadius: 14,
              borderWidth: 3,
              borderColor: theme.colors.accent,
              backgroundColor: 'transparent',
            }}
            pointerEvents="none"
          />
        );
      })}
      {/* Tier 2: valid move positions – only in moving (after stone selected) or puzzle mode; no rings in placing/flying */}
      {showValidMoveRings && (
        <View style={styles.validMovesLayer} pointerEvents="none">
          {validMoves
            .filter((pos) => board[pos] === 0)
            .map((pos) => {
              const { x, y } = positionToCoordinates(pos, boardSize);
              return puzzleMode ? (
                <ValidMoveDotPuzzle
                  key={`valid-${pos}`}
                  x={x}
                  y={y}
                  stoneRadius={stoneRadius}
                  color={playerColor}
                  isPlayer2={currentPlayer === 2}
                  borderColor={theme.colors.lines}
                />
              ) : (
                <ValidMoveDot
                  key={`valid-${pos}`}
                  x={x}
                  y={y}
                  stoneRadius={stoneRadius}
                  color={theme.colors.highlight ?? '#DAA520'}
                />
              );
            })}
        </View>
      )}
      {/* Opponent's last move "to" glow: subtle pulse behind the stone */}
      {showOpponentLastMove && lastMove && (
        <Animated.View
          style={[StyleSheet.absoluteFill, animatedToGlowStyle]}
          pointerEvents="none"
        >
          <Svg width={boardSize} height={boardSize} viewBox={`0 0 ${boardSize} ${boardSize}`}>
            <Circle
              cx={positionToCoordinates(lastMove.to, boardSize).x}
              cy={positionToCoordinates(lastMove.to, boardSize).y}
              r={stoneRadius + 6}
              fill="none"
              stroke={theme.colors.highlight ?? '#DAA520'}
              strokeWidth={2}
            />
          </Svg>
        </Animated.View>
      )}
      {/* Coach tip "to" glow: pulsing green ring */}
      {coachTip && (
        <Animated.View
          style={[StyleSheet.absoluteFill, animatedCoachGlowStyle]}
          pointerEvents="none"
        >
          <Svg width={boardSize} height={boardSize} viewBox={`0 0 ${boardSize} ${boardSize}`}>
            <Circle
              cx={positionToCoordinates(coachTip.to, boardSize).x}
              cy={positionToCoordinates(coachTip.to, boardSize).y}
              r={stoneRadius + 5}
              fill="none"
              stroke="#4CAF50"
              strokeWidth={2.5}
            />
          </Svg>
        </Animated.View>
      )}
      {/* Stones (rendered above SVG so they can use Animated.View) */}
      {board.map((player, pos) => {
        if (player === 0) return null;
        const isSelected = selectedStone === pos;
        const isRemovable = mustRemove && removablePositions.includes(pos);
        const isPartOfMill = Boolean(millLineToHighlight?.includes(pos));
        const justPlaced = lastPlacedPosition === pos;
        return (
          <Stone
            key={`stone-${pos}`}
            position={pos}
            player={player}
            isSelected={isSelected}
            isRemovable={isRemovable}
            isPartOfMill={isPartOfMill}
            theme={theme}
            boardSize={boardSize}
            stoneRadius={stoneRadius}
            justPlaced={justPlaced}
          />
        );
      })}
    </View>
  );
}

/** Blinking dot for tutorial step 1 (positions blink one after another). */
function BlinkingPositionDot({
  position,
  boardSize,
  blinkIndex,
  color,
}: {
  position: Position;
  boardSize: number;
  blinkIndex: SharedValue<number>;
  color: string;
}) {
  const { x, y } = positionToCoordinates(position, boardSize);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.floor(blinkIndex.value) === position ? 1 : 0.35,
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: EMPTY_DOT_RADIUS * 2,
          height: EMPTY_DOT_RADIUS * 2,
          left: x - EMPTY_DOT_RADIUS,
          top: y - EMPTY_DOT_RADIUS,
          borderRadius: EMPTY_DOT_RADIUS,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

/** Tier 2 (game mode): golden ring on valid move, same size as stone, pulsating. */
function ValidMoveDot({ x, y, stoneRadius, color }: { x: number; y: number; stoneRadius: number; color: string }) {
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const size = stoneRadius * 2;
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          left: x - stoneRadius,
          top: y - stoneRadius,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={stoneRadius}
          cy={stoneRadius}
          r={stoneRadius - 1}
          fill="transparent"
          stroke={color}
          strokeWidth={2}
        />
      </Svg>
    </Animated.View>
  );
}

const PUZZLE_GHOST_PULSE_LO = 0.15;
const PUZZLE_GHOST_PULSE_HI = 0.3;
const PUZZLE_GHOST_PULSE_MS = 2000;

/** Ghost stone for valid move in puzzle mode: semi-transparent player-colored circle, optional pulse; white gets a border for visibility. */
function ValidMoveDotPuzzle({
  x,
  y,
  stoneRadius,
  color,
  isPlayer2,
  borderColor,
}: {
  x: number;
  y: number;
  stoneRadius: number;
  color: string;
  isPlayer2: boolean;
  borderColor: string;
}) {
  const opacity = useSharedValue(PUZZLE_GHOST_PULSE_LO);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(PUZZLE_GHOST_PULSE_HI, { duration: PUZZLE_GHOST_PULSE_MS / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(PUZZLE_GHOST_PULSE_LO, { duration: PUZZLE_GHOST_PULSE_MS / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: stoneRadius * 2,
          height: stoneRadius * 2,
          left: x - stoneRadius,
          top: y - stoneRadius,
          borderRadius: stoneRadius,
          backgroundColor: color,
          borderWidth: isPlayer2 ? 2 : 0,
          borderColor: isPlayer2 ? borderColor : 'transparent',
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  validMovesLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  stonesLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});

/** Export for consumers that need board size or coordinates. */
export { positionToCoordinates };
export { getBoardLineSegments } from '../utils/boardCoordinates';
