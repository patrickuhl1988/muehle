/**
 * Single stone (piece) on the board with animated states.
 * Uses react-native-svg and react-native-reanimated.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import type { Player } from '../game/types';
import type { Theme } from '../theme/types';
import { positionToCoordinates } from '../utils/boardCoordinates';

const STONE_RADIUS = 18;
const TOUCH_RADIUS = 24;

interface StoneProps {
  position: number;
  player: Player;
  isSelected: boolean;
  isRemovable: boolean;
  isPartOfMill: boolean;
  theme: Theme;
  boardSize: number;
  /** Override stone radius (e.g. smaller for Tag Team compact boards). */
  stoneRadius?: number;
  /** Trigger pop-in when this position was just placed. */
  justPlaced?: boolean;
  /** Trigger remove animation (shrink + fade). */
  isRemoving?: boolean;
}

/**
 * Renders one stone at the given board position with animated states.
 */
export function Stone({
  position,
  player,
  isSelected,
  isRemovable,
  isPartOfMill,
  theme,
  boardSize,
  stoneRadius: stoneRadiusProp,
  justPlaced = false,
  isRemoving = false,
}: StoneProps) {
  const r = stoneRadiusProp ?? STONE_RADIUS;
  const box = r * 2;
  const { x, y } = positionToCoordinates(position, boardSize);
  const color = player === 1 ? theme.colors.player1Stone : theme.colors.player2Stone;

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const millGlowOpacity = useSharedValue(0);
  const prevMillRef = useRef(false);

  useEffect(() => {
    if (justPlaced) {
      scale.value = 0;
      scale.value = withSequence(
        withSpring(1.1, { damping: 12, stiffness: 180 }),
        withSpring(1, { damping: 14, stiffness: 160 })
      );
    }
  }, [justPlaced, scale]);

  useEffect(() => {
    if (isRemoving) {
      scale.value = withTiming(0, { duration: 250, easing: Easing.in(Easing.ease) });
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [isRemoving, scale, opacity]);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSpring(1.15);
      glowOpacity.value = withTiming(0.6);
    } else {
      scale.value = withSpring(1);
      glowOpacity.value = withTiming(0);
    }
  }, [isSelected, scale, glowOpacity]);

  useEffect(() => {
    if (isRemovable) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [isRemovable, pulseScale]);

  useEffect(() => {
    if (isPartOfMill && !prevMillRef.current) {
      prevMillRef.current = true;
      millGlowOpacity.value = withSequence(
        withTiming(0.8, { duration: 120, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 350, easing: Easing.in(Easing.ease) })
      );
    }
    if (!isPartOfMill) prevMillRef.current = false;
  }, [isPartOfMill, millGlowOpacity]);

  const animatedStoneStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedMillGlowStyle = useAnimatedStyle(() => ({
    opacity: millGlowOpacity.value,
  }));

  const left = x - r;
  const top = y - r;
  const GOLD = '#C9A84C';

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { width: boardSize, height: boardSize },
      ]}
      pointerEvents="none"
    >
      {isRemovable && (
        <Animated.View
          style={[
            styles.stoneBox,
            { left, top, width: box, height: box },
            animatedPulseStyle,
          ]}
        >
          <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
            <Circle
              cx={r}
              cy={r}
              r={r + 8}
              fill="transparent"
              stroke={theme.colors.danger}
              strokeWidth={3}
            />
          </Svg>
        </Animated.View>
      )}
      {isSelected && (
        <Animated.View
          style={[
            styles.stoneBox,
            { left, top, width: box, height: box },
            animatedGlowStyle,
          ]}
        >
          <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
            <Circle
              cx={r}
              cy={r}
              r={r + 6}
              fill="transparent"
              stroke={theme.colors.highlight}
              strokeWidth={3}
            />
          </Svg>
        </Animated.View>
      )}
      {isPartOfMill && (
        <Animated.View
          style={[
            styles.stoneBox,
            { left, top, width: box, height: box },
            animatedMillGlowStyle,
          ]}
          pointerEvents="none"
        >
          <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
            <Circle
              cx={r}
              cy={r}
              r={r + 6}
              fill="transparent"
              stroke={GOLD}
              strokeWidth={4}
            />
          </Svg>
        </Animated.View>
      )}
      <Animated.View
        style={[
          styles.stoneBox,
          styles.stoneShadow,
          { left, top, width: box, height: box },
          animatedStoneStyle,
        ]}
      >
        <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
          <Circle
            cx={r}
            cy={r}
            r={r}
            fill={color}
            stroke={player === 2 ? (theme.colors.lines ?? '#333') : theme.colors.lines}
            strokeWidth={player === 2 ? 2 : 1}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stoneBox: {
    position: 'absolute',
  },
  stoneShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

export { STONE_RADIUS, TOUCH_RADIUS };
