import type { ThemeId } from './types';
import { BASE_THEME_IDS } from './themes';
import { themes } from './themes';

/** Premium themes that can be unlocked (Neon/Marmor removed from IAP; pixel/vintage via achievements). */
export const PREMIUM_THEME_IDS: ThemeId[] = ['pixel', 'vintage'];

export function getAvailableThemeIds(
  achievementUnlockedIds: string[],
  hasTheme: (themeId: string) => boolean
): ThemeId[] {
  const set = new Set<ThemeId>(BASE_THEME_IDS);
  for (const id of PREMIUM_THEME_IDS) {
    if (achievementUnlockedIds.includes(id) || hasTheme(id)) set.add(id);
  }
  return Array.from(set).filter((id) => themes[id]);
}
