/**
 * Status messages for the game screen based on phase and state.
 * Uses i18n t() for all messages.
 */

import type { GameState, Player } from '../game/types';
import { hasValidMoves } from '../game/engine';

export type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Returns the status message for the current game state.
 * Setzphase: "Setze einen Stein auf das Brett"
 * Zugphase: "Wähle einen Stein und bewege ihn" / "Ziehe auf eine benachbarte Position"
 * Entfernphase: "Entferne einen gegnerischen Stein"
 * Springphase: "Springe auf ein beliebiges freies Feld"
 */
export function getStatusMessage(
  state: GameState,
  t: TranslateFn,
  player1Name: string,
  player2Name: string
): string {
  if (state.gameOver) {
    if (state.winner === 1 || state.winner === 2) {
      const loser = state.winner === 1 ? 2 : 1;
      const blocked =
        state.stonesOnBoard[loser] >= 3 && !hasValidMoves(state, loser);
      const playerName = state.winner === 1 ? player1Name : player2Name;
      const msg = t('game.playerWins', { player: playerName });
      if (blocked) {
        const reason = loser === 1 ? t('game.reasonNoMovesBlack') : t('game.reasonNoMovesWhite');
        return `${msg} ${reason}`;
      }
      const fewStones = state.stonesOnBoard[loser] < 3;
      if (fewStones) {
        const reason = loser === 1 ? t('game.reasonTooFewStonesBlack') : t('game.reasonTooFewStonesWhite');
        return `${msg} ${reason}`;
      }
      return msg;
    }
    return t('game.draw');
  }

  const phase = state.phase;
  const mustRemove = state.mustRemove;
  const selectedStone = state.selectedStone;

  if (mustRemove) return t('game.removeStonePrompt');

  if (phase === 'placing') return t('game.placeStone');

  if (phase === 'moving') {
    if (selectedStone === null) return t('game.selectStone');
    return t('game.moveStone');
  }

  if (phase === 'flying') {
    if (selectedStone === null) return t('game.flyStone');
    return t('game.flyStone');
  }

  return '';
}

/**
 * Returns the phase label for a specific player (with counts where relevant).
 * Placing: "Setzphase (3/9)", Moving: "Zugphase", Flying: "Springphase (3 Steine)" for the player who has 3 stones.
 * @param maxStones Total stones per player (default 9; use 7 for Tag Team).
 */
export function getPhaseLabelForPlayer(
  state: GameState,
  player: Player,
  t: TranslateFn,
  maxStones: number = 9
): string {
  const phase = state.phase;
  const onBoard = state.stonesOnBoard[player];

  if (phase === 'placing') {
    return t('game.phasePlacingCount', { placed: onBoard, max: maxStones });
  }
  if (phase === 'moving') {
    return t('game.phaseMoving');
  }
  if (phase === 'flying') {
    return onBoard === 3 ? t('game.phaseFlyingStones') : t('game.phaseFlying');
  }
  return t('game.phasePlacing');
}

/**
 * Returns a short reason string for game over (e.g. "White has no valid moves", "Black has only 2 stones left",
 * or draw reason: "Dreifache Stellungswiederholung" / "40 Züge ohne Mühle").
 * Used by the fullscreen game-over overlay.
 */
export function getGameOverReason(
  state: GameState,
  t: TranslateFn
): string | undefined {
  if (!state.gameOver) return undefined;
  if (state.isDraw && state.drawReason) {
    return state.drawReason === 'repetition' ? t('game.drawRepetition') : t('game.drawFortyMoves');
  }
  if (state.winner == null) return undefined;
  const loser = state.winner === 1 ? 2 : 1;
  if (state.stonesOnBoard[loser] < 3) {
    return loser === 1 ? t('game.reasonTooFewStonesBlack') : t('game.reasonTooFewStonesWhite');
  }
  if (!hasValidMoves(state, loser)) {
    return loser === 1 ? t('game.reasonNoMovesBlack') : t('game.reasonNoMovesWhite');
  }
  return undefined;
}
