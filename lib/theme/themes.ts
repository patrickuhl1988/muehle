/**
 * Theme definitions: Holz, Minimal, Neon, Dark.
 */

import type { Theme, ThemeId } from './types';

export const themes: Record<string, Theme> = {
  holz: {
    id: 'holz',
    name: 'Holz',
    colors: {
      background: '#F5EDE3',
      board: '#8B6914',
      lines: '#5C4033',
      player1Stone: '#1A1A1A',
      player2Stone: '#F5F5DC',
      highlight: '#C9A84C',
      danger: '#E74C3C',
      accent: '#7A5C1F',
    },
    fontColor: '#2C1810',
    fontColorSecondary: '#5C4A3A',
    cardBackground: '#FFFAF3',
    borderColor: 'rgba(139, 105, 20, 0.08)',
    successColor: '#27AE60',
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    colors: {
      background: '#FFFFFF',
      board: '#E0E0E0',
      lines: '#333333',
      player1Stone: '#1A1A1A',
      player2Stone: '#BDBDBD',
      highlight: '#2196F3',
      danger: '#F44336',
      accent: '#333333',
    },
    fontColor: '#212121',
    fontColorSecondary: '#757575',
    cardBackground: '#FAFAFA',
    borderColor: '#E0E0E0',
    successColor: '#4CAF50',
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    colors: {
      background: '#0A0A1A',
      board: '#1A1A3E',
      lines: '#00FFFF',
      player1Stone: '#FF00FF',
      player2Stone: '#00FF00',
      highlight: '#FFFF00',
      danger: '#FF0000',
      accent: '#00FFFF',
    },
    fontColor: '#E0E0FF',
    fontColorSecondary: '#00FFFF',
    cardBackground: '#1A1A3E',
    borderColor: '#00FFFF',
    successColor: '#00FF00',
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    colors: {
      background: '#121212',
      board: '#1E1E1E',
      lines: '#424242',
      player1Stone: '#BB86FC',
      player2Stone: '#03DAC6',
      highlight: '#CF6679',
      danger: '#FF5252',
      accent: '#BB86FC',
    },
    fontColor: '#FFFFFF',
    fontColorSecondary: '#B0B0B0',
    cardBackground: '#1E1E1E',
    borderColor: '#424242',
    successColor: '#03DAC6',
  },
  marmor: {
    id: 'marmor',
    name: 'Marmor',
    colors: {
      background: '#E8E4DF',
      board: '#C4B8A8',
      lines: '#5C5348',
      player1Stone: '#2C2419',
      player2Stone: '#8B7355',
      highlight: '#6B5344',
      danger: '#8B4513',
      accent: '#5C5348',
    },
    fontColor: '#2C2419',
    fontColorSecondary: '#5C5348',
    cardBackground: '#D4CFC7',
    borderColor: '#8B7355',
    successColor: '#4A7C59',
  },
};

export const defaultThemeId = 'holz';

/** Base theme IDs (always available). */
export const BASE_THEME_IDS: ThemeId[] = ['holz', 'minimal', 'dark'];
