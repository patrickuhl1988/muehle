/**
 * Circular timer display (chess-clock style). MM:SS, color by remaining time, pulse when critical.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { Theme } from '../theme/types';
import { formatTime } from '../game/timerConfig';

const SIZE = 72;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export interface TimerProps {
  /** Seconds remaining. */
  timeLeft: number;
  /** Total seconds per player (for progress). */
  totalSeconds: number;
  /** Whether this player's timer is running (active). */
  isActive: boolean;
  theme: Theme;
}

/**
 * Returns stroke color by remaining seconds: green > 30s, yellow 10–30s, red < 10s.
 */
function getTimerColor(seconds: number, theme: Theme): string {
  if (seconds <= 10) return theme.colors.danger;
  if (seconds <= 30) return theme.colors.highlight;
  return theme.successColor;
}

/**
 * Renders a circular timer with MM:SS in the center. Progress drains as time decreases.
 * Under 10s: red; under 30s: yellow; else green. Under 5s: pulse animation.
 */
export function Timer({ timeLeft, totalSeconds, isActive, theme }: TimerProps) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0 && isActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 250, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 250, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [timeLeft, isActive, pulseScale]);

  const ratio = totalSeconds > 0 ? Math.max(0, timeLeft) / totalSeconds : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - ratio);
  const color = getTimerColor(timeLeft, theme);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const opacity = isActive ? 1 : 0.5;

  return (
    <Animated.View style={[styles.wrap, { opacity }, animatedStyle]}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle
          cx={CX}
          cy={CY}
          r={R}
          fill="transparent"
          stroke={theme.borderColor}
          strokeWidth={STROKE}
          opacity={0.3}
        />
        <Circle
          cx={CX}
          cy={CY}
          r={R}
          fill="transparent"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${CX} ${CY})`}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>
          <Text
            style={[
              styles.timeText,
              {
                color: timeLeft <= 10 ? theme.colors.danger : theme.fontColor,
                fontWeight: timeLeft <= 10 ? '700' : '600',
              },
            ]}
            numberOfLines={1}
          >
            {formatTime(timeLeft)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    position: 'relative',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
  },
});
