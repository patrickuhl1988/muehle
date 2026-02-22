/**
 * Theme type definitions for the app.
 */

export type ThemeId = 'holz' | 'minimal' | 'neon' | 'dark' | 'marmor' | 'pixel' | 'vintage';

export interface GameColors {
  background: string;
  board: string;
  lines: string;
  player1Stone: string;
  player2Stone: string;
  highlight: string;
  danger: string;
  accent: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  colors: GameColors;
  fontColor: string;
  fontColorSecondary: string;
  cardBackground: string;
  borderColor: string;
  successColor: string;
}
