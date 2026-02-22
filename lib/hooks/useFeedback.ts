/**
 * Combined sound + haptics feedback. Respects soundEnabled and hapticsEnabled from settings.
 * Use in game/puzzle screens for place, select, move, mill, remove, invalid, win, lose, draw, etc.
 */

import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store/settingsStore';
import { SoundManager } from '../sound/SoundManager';

export function useFeedback() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const play = useCallback(
    (soundFn: () => void) => {
      if (soundEnabled) soundFn();
    },
    [soundEnabled]
  );

  return {
    place: useCallback(() => {
      play(SoundManager.playPlace);
      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [play, hapticsEnabled]),

    select: useCallback(() => {
      play(SoundManager.playSelect);
      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [play, hapticsEnabled]),

    move: useCallback(() => {
      play(SoundManager.playMove);
    }, [play]),

    mill: useCallback(() => {
      play(SoundManager.playMill);
      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [play, hapticsEnabled]),

    remove: useCallback(() => {
      play(SoundManager.playRemove);
      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [play, hapticsEnabled]),

    invalid: useCallback(() => {
      play(SoundManager.playInvalid);
      if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }, [play, hapticsEnabled]),

    win: useCallback(() => {
      play(SoundManager.playWin);
      if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [play, hapticsEnabled]),

    lose: useCallback(() => {
      play(SoundManager.playLose);
      if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }, [play, hapticsEnabled]),

    draw: useCallback(() => {
      play(SoundManager.playDraw);
    }, [play]),

    gameStart: useCallback(() => {
      play(SoundManager.playGameStart);
    }, [play]),

    buttonTap: useCallback(() => {
      play(SoundManager.playButtonTap);
      if (hapticsEnabled) Haptics.selectionAsync();
    }, [play, hapticsEnabled]),

    timerTick: useCallback(() => {
      play(SoundManager.playTimerTick);
    }, [play]),

    timerWarning: useCallback(() => {
      play(SoundManager.playTimerWarning);
    }, [play]),

    puzzleSolved: useCallback(() => {
      play(SoundManager.playPuzzleSolved);
      if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [play, hapticsEnabled]),

    achievement: useCallback(() => {
      play(SoundManager.playAchievement);
      if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [play, hapticsEnabled]),
  };
}
