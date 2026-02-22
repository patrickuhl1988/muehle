/**
 * Fullscreen game-over overlay. Covers entire screen with solid background.
 * Renders nothing when visible is false. Uses i18n for all text.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

export type GameOverResult = 'win' | 'lose' | 'draw';

export interface GameOverScreenStats {
  moves: number;
  mills: number;
  time: string;
}

export interface GameOverScreenProps {
  visible: boolean;
  result: GameOverResult;
  reason?: string;
  stats: GameOverScreenStats;
  onRematch: () => void;
  onBackToMenu: () => void;
}

export function GameOverScreen({
  visible,
  result,
  reason,
  stats,
  onRematch,
  onBackToMenu,
}: GameOverScreenProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  const emoji = result === 'win' ? '🎉' : result === 'lose' ? '😔' : '🤝';
  const title =
    result === 'win'
      ? t('game.youWin')
      : result === 'lose'
        ? t('game.youLose')
        : t('game.draw');

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>

      <Text style={styles.title}>{title}</Text>

      {reason ? (
        <Text style={styles.reason}>
          {result === 'draw' ? `${t('game.drawReasonPrefix')} ${reason}` : reason}
        </Text>
      ) : null}

      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.moves}</Text>
            <Text style={styles.statLabel}>{t('game.moves')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.mills}</Text>
            <Text style={styles.statLabel}>{t('game.mills')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.time}</Text>
            <Text style={styles.statLabel}>{t('game.gameTime')}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onRematch}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>{t('game.rematch')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onBackToMenu}
        activeOpacity={0.8}
      >
        <Text style={styles.secondaryButtonText}>{t('game.backToMenu')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    width,
    height,
    backgroundColor: '#FDF6EC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 9999,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 6,
    textAlign: 'center',
  },
  reason: {
    fontSize: 15,
    color: '#8C8C8C',
    marginBottom: 32,
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: '#F0E6D3',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 320,
    marginBottom: 36,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8C8C8C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#D4C5AD',
  },
  primaryButton: {
    backgroundColor: '#8B7355',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#8B7355',
    paddingVertical: 16,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#8B7355',
    fontSize: 17,
    fontWeight: '600',
  },
});
