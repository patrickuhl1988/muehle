/**
 * Pressable with scale animation (0.97 or custom) on press. Uses react-native-reanimated.
 * Use for buttons and cards so every tap has immediate visual feedback.
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

const PRESS_DURATION_MS = 120;
const DEFAULT_SCALE = 0.98;

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: ViewStyle;
  /** Scale when pressed (default 0.98 for gentle feedback). Use 0.97 for buttons, 0.95 for grid tiles. */
  scaleTo?: number;
  disabled?: boolean;
}

export function PressableScale({
  children,
  onPress,
  onPressIn,
  onPressOut,
  style,
  scaleTo = DEFAULT_SCALE,
  disabled = false,
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(scaleTo, { duration: PRESS_DURATION_MS });
    onPressIn?.();
  }, [scale, scaleTo, onPressIn]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: PRESS_DURATION_MS });
    onPressOut?.();
  }, [scale, onPressOut]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPressCancel={handlePressOut}
      style={[styles.wrapper, style]}
      disabled={disabled}
    >
      <Animated.View style={[styles.inner, animatedStyle]} pointerEvents="none">
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
  },
  inner: {
    alignSelf: 'stretch',
  },
});
