/**
 * Game hook: state, validMoves, handlePositionPress, AI turn trigger.
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * Returns game state, validMoves, handlePositionPress. Schedules AI move when it is AI's turn.
 */
export function useGame() {
  const state = useGameStore((s) => s.state);
  const validMoves = useGameStore((s) => s.validMoves);
  const handlePositionPress = useGameStore((s) => s.handlePositionPress);
  const applyAIMove = useGameStore((s) => s.applyAIMove);
  const mode = useGameStore((s) => s.mode);
  const aiDifficulty = useGameStore((s) => s.aiDifficulty);
  const prevPlayerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state || mode !== 'ai' || state.gameOver) return;
    const isAITurn = state.currentPlayer === 2;
    const justSwitchedToAI = prevPlayerRef.current === 1;
    const aiMustRemove = isAITurn && state.mustRemove;
    if (isAITurn && (justSwitchedToAI || aiMustRemove)) {
      requestAnimationFrame(() => applyAIMove());
      return undefined;
    }
    prevPlayerRef.current = state.currentPlayer;
  }, [state?.currentPlayer, state?.gameOver, state?.mustRemove, mode, aiDifficulty, applyAIMove]);

  return {
    gameState: state,
    validMoves,
    handlePositionPress,
    isGameOver: state?.gameOver ?? false,
    winner: state?.winner ?? null,
    isDraw: state?.isDraw ?? false,
  };
}
