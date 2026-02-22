/**
 * Runs a short interval that ticks the blitz timer in the store while in blitz mode and game not over.
 * Cleans up on unmount.
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

const TICK_MS = 100;

/**
 * Subscribes to blitz mode and ticks the store timer every TICK_MS.
 * Call once on the game screen when mode === 'blitz'.
 */
export function useBlitzTimer(): void {
  const tickBlitzTimer = useGameStore((s) => s.tickBlitzTimer);
  const mode = useGameStore((s) => s.mode);
  const state = useGameStore((s) => s.state);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mode !== 'blitz' || !state || state.gameOver) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      tickBlitzTimer();
    }, TICK_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [mode, state?.gameOver, tickBlitzTimer]);
}
