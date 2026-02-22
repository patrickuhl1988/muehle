/**
 * Displays player info: stone count (X/9 + progress bar), name, phase, captured count, avatar (right).
 * Active player: subtle background highlight + accent left border. Inactive: dimmed.
 * Uses theme. All text via i18n.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import type { Player } from '../game/types';
import type { Theme } from '../theme/types';

const DEFAULT_TOTAL_STONES = 9;
const AVATAR_SIZE = 36;
const PROGRESS_HEIGHT = 4;

export interface PlayerInfoProps {
  player: Player;
  /** Display name: "Du", "KI Leicht", "Spieler 2", etc. */
  name: string;
  /** Stones still in hand (to place). */
  stonesInHand: number;
  /** Stones on board. */
  stonesOnBoard: number;
  /** Whether this player is currently active. */
  isActive: boolean;
  /** Current phase label for this side (e.g. "Setzphase (3/9)", "Zugphase", "Springphase (3 Steine)"). */
  phaseLabel?: string;
  /** Seconds remaining (blitz mode only). */
  secondsRemaining?: number | null;
  /** Number of stones captured (removed) by opponent. */
  capturedCount?: number;
  theme: Theme;
  /** Layout: 'top' | 'bottom' for avatar/name order. */
  layout?: 'top' | 'bottom';
  /** When true and active, show "thinking" (e.g. three pulsating dots) next to name. */
  thinking?: boolean;
  /** Total stones per player (default 9; use 7 for Tag Team). */
  totalStones?: number;
  /** When true, show 2 lines only: name on line 1, stone count + phase + captured on line 2 (avoids clipping). */
  compact?: boolean;
}

/**
 * Renders one player's info row: accent bar, name (+ optional pulsing dot when active), stone count + progress, phase, timer, captured. Avatar on right.
 */
export function PlayerInfo({
  player,
  name,
  stonesInHand,
  stonesOnBoard,
  isActive,
  phaseLabel,
  secondsRemaining,
  capturedCount = 0,
  theme,
  layout = 'top',
  thinking = false,
  totalStones = DEFAULT_TOTAL_STONES,
  compact = false,
}: PlayerInfoProps) {
  const { t } = useTranslation();
  const color = player === 1 ? theme.colors.player1Stone : theme.colors.player2Stone;
  const borderColor = isActive ? theme.colors.accent : theme.borderColor;
  const borderWidth = isActive ? 3 : 1;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!isActive) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, pulseAnim]);

  useEffect(() => {
    if (!thinking) {
      dot1.setValue(0.3);
      dot2.setValue(0.3);
      dot3.setValue(0.3);
      return;
    }
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      );
    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 150);
    const a3 = pulse(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [thinking, dot1, dot2, dot3]);

  const progress = totalStones > 0 ? stonesOnBoard / totalStones : 0;
  const stoneCountLabel = t('game.stonesPlacedShort', { count: stonesOnBoard, max: totalStones });

  const avatar = (
    <View
      style={[
        styles.avatar,
        {
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: AVATAR_SIZE / 2,
          backgroundColor: color,
          borderColor,
          borderWidth,
        },
      ]}
    />
  );

  const timerText =
    secondsRemaining != null
      ? `${Math.floor(secondsRemaining / 60)}:${(secondsRemaining % 60).toString().padStart(2, '0')}`
      : null;

  const capturedLabel = capturedCount > 0 ? t('game.captured', { count: capturedCount }) : '';
  const compactLine2 = [stoneCountLabel, phaseLabel, capturedLabel].filter(Boolean).join(' · ');

  const rowStyle = {
    backgroundColor: isActive ? (theme.colors.accent + '18') : theme.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderColor,
    borderLeftWidth: isActive ? 4 : 0,
    borderLeftColor: theme.colors.accent,
    opacity: isActive ? 1 : 0.82,
  };

  if (compact) {
    return (
      <View style={[styles.row, styles.rowCompact, rowStyle]}>
        <View style={styles.content}>
          <View style={styles.nameRow}>
            {isActive && !thinking && (
              <Animated.View style={[styles.activeDot, { backgroundColor: theme.colors.accent, opacity: pulseAnim }]} />
            )}
            {isActive && thinking && (
              <View style={styles.thinkingDots}>
                <Animated.View style={[styles.thinkingDot, { backgroundColor: theme.colors.accent, opacity: dot1 }]} />
                <Animated.View style={[styles.thinkingDot, { backgroundColor: theme.colors.accent, opacity: dot2 }]} />
                <Animated.View style={[styles.thinkingDot, { backgroundColor: theme.colors.accent, opacity: dot3 }]} />
              </View>
            )}
            <Text
              style={[styles.name, { color: theme.fontColor }, !isActive && { color: theme.fontColorSecondary }]}
              numberOfLines={1}
            >
              {name}
            </Text>
          </View>
          <Text
            style={[styles.compactLine2, { color: theme.fontColorSecondary }]}
            numberOfLines={1}
          >
            {compactLine2 || stoneCountLabel}
          </Text>
          {timerText != null && (
            <Text style={[styles.timer, { color: theme.colors.danger }]}>{timerText}</Text>
          )}
        </View>
        {avatar}
      </View>
    );
  }

  return (
    <View style={[styles.row, rowStyle]}>
      <View style={styles.content}>
        <View style={styles.nameRow}>
          {isActive && !thinking && (
            <Animated.View
              style={[
                styles.activeDot,
                {
                  backgroundColor: theme.colors.accent,
                  opacity: pulseAnim,
                },
              ]}
            />
          )}
          {isActive && thinking && (
            <View style={styles.thinkingDots}>
              <Animated.View style={[styles.thinkingDot, { backgroundColor: theme.colors.accent, opacity: dot1 }]} />
              <Animated.View style={[styles.thinkingDot, { backgroundColor: theme.colors.accent, opacity: dot2 }]} />
              <Animated.View style={[styles.thinkingDot, { backgroundColor: theme.colors.accent, opacity: dot3 }]} />
            </View>
          )}
          <Text
            style={[
              styles.name,
              { color: theme.fontColor },
              !isActive && { color: theme.fontColorSecondary },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
        </View>
        <View style={styles.stoneRow}>
          <Text
            style={[
              styles.stoneCount,
              { color: theme.fontColorSecondary },
            ]}
            numberOfLines={1}
          >
            {stoneCountLabel}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: theme.borderColor }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
        </View>
        {phaseLabel != null && (
          <Text
            style={[styles.phase, { color: theme.fontColorSecondary }]}
            numberOfLines={1}
          >
            {phaseLabel}
          </Text>
        )}
        {timerText != null && (
          <Text style={[styles.timer, { color: theme.colors.danger }]}>{timerText}</Text>
        )}
        {capturedCount > 0 && (
          <Text style={[styles.captured, { color: theme.fontColorSecondary }]}>
            {t('game.captured', { count: capturedCount })}
          </Text>
        )}
      </View>
      {avatar}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    minHeight: 80,
  },
  rowCompact: {
    minHeight: 72,
    paddingVertical: 8,
  },
  compactLine2: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  thinkingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  stoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  stoneCount: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 28,
  },
  progressTrack: {
    flex: 1,
    height: PROGRESS_HEIGHT,
    borderRadius: PROGRESS_HEIGHT / 2,
    overflow: 'hidden',
    maxWidth: 80,
  },
  progressFill: {
    height: '100%',
    borderRadius: PROGRESS_HEIGHT / 2,
  },
  phase: {
    fontSize: 12,
    marginTop: 0,
  },
  avatar: {
    marginLeft: 12,
  },
  timer: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  captured: {
    fontSize: 11,
    marginTop: 2,
    textDecorationLine: 'line-through',
  },
});
