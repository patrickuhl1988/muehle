/**
 * In-App Purchase product IDs and entitlements (RevenueCat / Play Billing).
 * Werbefrei, Puzzle-Paket Experte. Theme items (Neon, Marmor, Bundle) not shown in shop UI; IDs kept for restore.
 */

/** RevenueCat / Store product identifiers. */
export const PRODUCT_IDS = {
  WERBEFREI: 'werbefrei',
  NEON_THEME: 'neon_theme',
  MARMOR_THEME: 'marmor_theme',
  THEME_BUNDLE: 'theme_bundle',
  PUZZLE_PACK_EXPERT: 'puzzle_pack_expert',
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

/** Entitlement IDs in RevenueCat (if used). */
export const ENTITLEMENT_IDS = {
  AD_FREE: 'ad_free',
  NEON_THEME: 'neon_theme',
  MARMOR_THEME: 'marmor_theme',
  THEME_BUNDLE: 'theme_bundle',
  PUZZLE_PACK: 'puzzle_pack_expert',
} as const;

/** Display info for shop. Only Werbefrei and Puzzle-Paket shown in settings; theme items omitted from UI. */
export const PRODUCT_DISPLAY: Record<string, { name: string; price: string; description: string }> = {
  [PRODUCT_IDS.WERBEFREI]: {
    name: 'Werbefrei',
    price: '3,99 €',
    description: 'Entfernt Banner-Werbung dauerhaft.',
  },
  [PRODUCT_IDS.PUZZLE_PACK_EXPERT]: {
    name: 'Puzzle-Paket: Experte',
    price: '1,99 €',
    description: '50 Extra-Puzzles.',
  },
};
