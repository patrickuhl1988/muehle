/**
 * Theme context provider. Supplies current theme to the app.
 * Reads themeId from settingsStore so settings and UI stay in sync.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { Theme, ThemeId } from './types';
import { themes, defaultThemeId } from './themes';
import { useSettingsStore } from '../store/settingsStore';

interface ThemeContextValue {
  theme: Theme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Wraps the app and provides theme state from settings store.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeId = useSettingsStore((s) => s.themeId);
  const setThemeId = useSettingsStore((s) => s.setThemeId);
  const theme = useMemo(() => themes[themeId] ?? themes[defaultThemeId], [themeId]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themeId, setThemeId }),
    [theme, themeId, setThemeId]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Returns the current theme and setter. Throws if used outside ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
