/**
 * Auto-save for AI games: persist to AsyncStorage so the player can resume after app close/crash.
 * One saved game at a time; only for mode === 'ai'.
 * Key v2 to avoid old/corrupted data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AIDifficulty } from '../game/types';
import type { GameState } from '../game/types';

const SAVE_KEY = 'muehle_saved_game_v2';

export interface SavedGame {
  gameState: GameState;
  mode: 'ai';
  aiDifficulty: AIDifficulty;
  humanPlayer: 1 | 2;
  stateHistory: GameState[];
  undosUsedThisGame: number;
  elapsedTime: number;
  savedAt: string;
}

export async function saveGame(data: SavedGame): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save game:', error);
  }
}

/** Fire-and-forget persist: call from store/layout so save completes even if component unmounts. */
export function persistGameStateSync(data: SavedGame): void {
  try {
    const json = JSON.stringify(data);
    AsyncStorage.setItem(SAVE_KEY, json).catch(() => {});
  } catch {
    // JSON.stringify failed – ignore
  }
}

/** Build SavedGame from current store state for persistence. */
export function buildSavedGameFromStore(store: {
  state: GameState | null;
  mode: string | null;
  aiDifficulty: AIDifficulty;
  gameStartTime: number | null;
  stateHistory: GameState[];
  undosUsedThisGame: number;
}): SavedGame | null {
  if (store.mode !== 'ai' || !store.state || store.state.gameOver) return null;
  const elapsedTime =
    store.gameStartTime != null ? Math.floor((Date.now() - store.gameStartTime) / 1000) : 0;
  return {
    gameState: store.state,
    mode: 'ai',
    aiDifficulty: store.aiDifficulty,
    humanPlayer: 1,
    stateHistory: store.stateHistory ?? [],
    undosUsedThisGame: store.undosUsedThisGame ?? 0,
    elapsedTime,
    savedAt: new Date().toISOString(),
  };
}

export async function loadSavedGame(): Promise<SavedGame | null> {
  try {
    const json = await AsyncStorage.getItem(SAVE_KEY);
    if (!json) return null;
    const parsed = JSON.parse(json) as SavedGame;
    if (
      !parsed?.gameState ||
      !parsed.savedAt ||
      parsed.mode !== 'ai' ||
      parsed.aiDifficulty == null
    ) {
      await AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to load saved game:', error);
    try {
      await AsyncStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

export async function deleteSavedGame(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.warn('Failed to delete saved game:', error);
  }
}

export type TFunction = (key: string, opts?: { count?: number }) => string;

export function getTimeAgo(isoString: string, t: TFunction): string {
  const saved = new Date(isoString).getTime();
  const now = Date.now();
  const diffMinutes = Math.floor((now - saved) / 60000);

  if (diffMinutes < 1) return t('save.justNow');
  if (diffMinutes < 60) return t('save.minutesAgo', { count: diffMinutes });
  const diffHours = Math.floor(diffMinutes / 60);
  return t('save.hoursAgo', { count: diffHours });
}
