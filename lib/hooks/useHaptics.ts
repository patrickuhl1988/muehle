/**
 * Haptic feedback using expo-haptics.
 * selection = lightest (button press), light, medium, heavy, success, error. Respects hapticsEnabled.
 */

import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Returns haptic triggers. Respects hapticsEnabled setting.
 * Use: selection = button/card tap, light = stone place, medium = mill/remove, error = invalid/fail/lose, success = win.
 */
export function useHaptics() {
  const { hapticsEnabled } = useSettingsStore();

  /** Lightest – for button/card taps (selection change). */
  const selection = useCallback(() => {
    if (hapticsEnabled) Haptics.selectionAsync();
  }, [hapticsEnabled]);

  const light = useCallback(() => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [hapticsEnabled]);

  const medium = useCallback(() => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [hapticsEnabled]);

  const heavy = useCallback(() => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [hapticsEnabled]);

  const success = useCallback(() => {
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [hapticsEnabled]);

  const error = useCallback(() => {
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [hapticsEnabled]);

  return { selection, light, medium, heavy, success, error };
}
