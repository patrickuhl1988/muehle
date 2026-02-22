/**
 * Shared card and shadow styles for consistent UI across tabs.
 * Premium board-game feel: soft shadows, subtle depth, no harsh edges.
 * Cards (content containers) use shadow only – no outline/border.
 * Buttons may keep borders (e.g. outline secondary buttons).
 */

import type { ViewStyle } from 'react-native';
import type { Theme } from './types';

/** Soft shadow for cards – gentle depth, premium feel. */
export const cardShadow: ViewStyle = {
  borderWidth: 0,
  shadowColor: '#2C1810',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
};

/** Subtle elevation for primary CTA buttons – not flashy. */
export const buttonShadow: ViewStyle = {
  shadowColor: '#2C1810',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 4,
};

/** Base card container: borderRadius 16, padding 20, card shadow. */
export function getCardStyle(theme: Theme): ViewStyle {
  return {
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    ...cardShadow,
  };
}

/** Divider color for stats row etc. */
export const dividerColor = 'rgba(139, 105, 20, 0.08)';
