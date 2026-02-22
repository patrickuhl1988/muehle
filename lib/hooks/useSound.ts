/**
 * ASMR-style sound effects via SoundManager. Respects soundEnabled.
 * All play functions are fire-and-forget; SoundManager handles init and errors.
 */

import { useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { SoundManager } from '../sound/SoundManager';

export function useSound() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);

  const play = useCallback(
    (fn: () => void) => {
      if (!soundEnabled) return;
      fn();
    },
    [soundEnabled]
  );

  return {
    playPlace: useCallback(() => play(SoundManager.playPlace), [play]),
    playSelect: useCallback(() => play(SoundManager.playSelect), [play]),
    playMove: useCallback(() => play(SoundManager.playMove), [play]),
    playMill: useCallback(() => play(SoundManager.playMill), [play]),
    playCapture: useCallback(() => play(SoundManager.playRemove), [play]),
    playRemove: useCallback(() => play(SoundManager.playRemove), [play]),
    playInvalid: useCallback(() => play(SoundManager.playInvalid), [play]),
    playWin: useCallback(() => play(SoundManager.playWin), [play]),
    playLose: useCallback(() => play(SoundManager.playLose), [play]),
    playDraw: useCallback(() => play(SoundManager.playDraw), [play]),
    playGameStart: useCallback(() => play(SoundManager.playGameStart), [play]),
    playTick: useCallback(() => play(SoundManager.playTimerTick), [play]),
    playTimerWarning: useCallback(() => play(SoundManager.playTimerWarning), [play]),
    playError: useCallback(() => play(SoundManager.playInvalid), [play]),
    playButtonTap: useCallback(() => play(SoundManager.playButtonTap), [play]),
    playPuzzleSolved: useCallback(() => play(SoundManager.playPuzzleSolved), [play]),
    playAchievement: useCallback(() => play(SoundManager.playAchievement), [play]),
  };
}
