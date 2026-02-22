/**
 * Zustand store for app settings and theme.
 * Persists to AsyncStorage so player name, avatar, undo/coach and other settings survive app restarts.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeId } from '../theme/types';
import type { AIDifficulty } from '../game/types';
import { setAppLanguage as setI18nLanguage, type AppLanguage } from '../i18n';

/** Avatar accent color (hex). */
export type AvatarColor = string;

/** Icon name from MaterialCommunityIcons (e.g. 'account', 'crown'). */
export type AvatarIcon = string;

interface SettingsState {
  /** Display name on profile. */
  playerName: string;
  /** Avatar circle color (hex). */
  avatarColor: AvatarColor;
  /** Avatar icon name (MaterialCommunityIcons). */
  avatarIcon: AvatarIcon;
  themeId: ThemeId;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  /** Allow undoing last 2 moves (player + AI) in AI games. Off by default. */
  undoEnabled: boolean;
  /** Coach mode: show 💡 button for strategic tips. Off by default. */
  coachEnabled: boolean;
  aiDifficulty: AIDifficulty;
  /** True after user completes the tutorial (achievement "Erste Schritte"). */
  tutorialCompleted: boolean;
  /** Current app language (synced with i18n). */
  language: AppLanguage;
  setPlayerName: (name: string) => void;
  setAvatarColor: (color: AvatarColor) => void;
  setAvatarIcon: (icon: AvatarIcon) => void;
  setThemeId: (id: ThemeId) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setUndoEnabled: (enabled: boolean) => void;
  setCoachEnabled: (enabled: boolean) => void;
  setAIDifficulty: (difficulty: AIDifficulty) => void;
  setTutorialCompleted: (completed: boolean) => void;
  /** Change app language (persists and updates i18n). */
  setLanguage: (lang: AppLanguage) => Promise<void>;
  /** Sync store language from i18n after init (no persist). */
  hydrateLanguage: (lang: AppLanguage) => void;
}

const DEFAULT_AVATAR_COLOR = '#8B6914';
const DEFAULT_AVATAR_ICON = 'account';

const SETTINGS_STORAGE_KEY = 'muehle_settings';

/** Only persist state fields, not actions. */
function partialize(state: SettingsState) {
  return {
    playerName: state.playerName,
    avatarColor: state.avatarColor,
    avatarIcon: state.avatarIcon,
    themeId: state.themeId,
    soundEnabled: state.soundEnabled,
    hapticsEnabled: state.hapticsEnabled,
    undoEnabled: state.undoEnabled,
    coachEnabled: state.coachEnabled,
    aiDifficulty: state.aiDifficulty,
    tutorialCompleted: state.tutorialCompleted,
    language: state.language,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      playerName: 'Spieler',
      avatarColor: DEFAULT_AVATAR_COLOR,
      avatarIcon: DEFAULT_AVATAR_ICON,
      themeId: 'holz',
      soundEnabled: true,
      hapticsEnabled: true,
      undoEnabled: false,
      coachEnabled: false,
      aiDifficulty: 'medium',
      tutorialCompleted: false,
      language: 'de',
      setPlayerName: (playerName) => set({ playerName }),
      setAvatarColor: (avatarColor) => set({ avatarColor }),
      setAvatarIcon: (avatarIcon) => set({ avatarIcon }),
      setThemeId: (themeId) => set({ themeId }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setUndoEnabled: (undoEnabled) => set({ undoEnabled }),
      setCoachEnabled: (coachEnabled) => set({ coachEnabled }),
      setAIDifficulty: (aiDifficulty) => set({ aiDifficulty }),
      setTutorialCompleted: (tutorialCompleted) => set({ tutorialCompleted }),
      setLanguage: async (lang) => {
        await setI18nLanguage(lang);
        set({ language: lang });
      },
      hydrateLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize,
      onRehydrateStorage: () => (state, err) => {
        if (err) return;
        if (state?.language) setI18nLanguage(state.language).catch(() => {});
      },
    }
  )
);
