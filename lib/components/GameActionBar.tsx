/**
 * Shared action bar for game screens: Undo, Hint, Quit.
 * Used by vs AI, Local, Blitz, and Tag Team.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Theme } from '../theme/types';

const ACTION_BAR_HEIGHT = 40;

export interface GameActionBarProps {
  onUndo: () => void;
  onHint: () => void;
  onQuit: () => void;
  undoEnabled: boolean;
  undoAvailable: boolean;
  hintEnabled: boolean;
  undoLabel: string;
  hintLabel: string;
  quitLabel: string;
  theme: Theme;
}

export function GameActionBar({
  onUndo,
  onHint,
  onQuit,
  undoEnabled,
  undoAvailable,
  hintEnabled,
  undoLabel,
  hintLabel,
  quitLabel,
  theme,
}: GameActionBarProps) {
  const showUndo = undoEnabled && undoAvailable;
  const showHint = hintEnabled;

  const buttonStyle = [styles.button, { borderColor: theme.borderColor }];

  return (
    <View style={styles.wrap}>
      {showUndo ? (
        <TouchableOpacity
          style={[buttonStyle, { flex: 1 }]}
          onPress={onUndo}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="undo" size={18} color={theme.fontColorSecondary} />
          <Text style={[styles.buttonText, { color: theme.fontColorSecondary }]}>{undoLabel}</Text>
        </TouchableOpacity>
      ) : null}
      {showHint ? (
        <TouchableOpacity
          style={[buttonStyle, { flex: 1 }]}
          onPress={onHint}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>💡</Text>
          <Text style={[styles.buttonText, { color: theme.fontColorSecondary }]}>{hintLabel}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={[buttonStyle, (showUndo || showHint) ? { flex: 1 } : undefined]}
        onPress={onQuit}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="close" size={18} color={theme.fontColorSecondary} />
        <Text style={[styles.buttonText, { color: theme.fontColorSecondary }]}>{quitLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: ACTION_BAR_HEIGHT,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
