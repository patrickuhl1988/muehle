/**
 * RevenueCat wrapper for In-App Purchases.
 * Set EXPO_PUBLIC_REVENUECAT_API_KEY (Android) for production.
 * When not set, purchase/restore return no entitlements (graceful no-op).
 */

import { ENTITLEMENT_IDS } from './products';

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '';

export interface Entitlements {
  adFree?: boolean;
  neonTheme?: boolean;
  marmorTheme?: boolean;
  themeBundle?: boolean;
  puzzlePackExpert?: boolean;
}

export function isRevenueCatConfigured(): boolean {
  return Boolean(API_KEY);
}

/**
 * Maps RevenueCat customer info to local entitlement flags.
 */
function mapEntitlements(entitlements: Record<string, { isActive: boolean }> | null): Entitlements | null {
  if (!entitlements) return null;
  const adFree = entitlements[ENTITLEMENT_IDS.AD_FREE]?.isActive ?? false;
  const neonTheme = entitlements[ENTITLEMENT_IDS.NEON_THEME]?.isActive ?? false;
  const marmorTheme = entitlements[ENTITLEMENT_IDS.MARMOR_THEME]?.isActive ?? false;
  const themeBundle = entitlements[ENTITLEMENT_IDS.THEME_BUNDLE]?.isActive ?? false;
  const puzzlePackExpert = entitlements[ENTITLEMENT_IDS.PUZZLE_PACK]?.isActive ?? false;
  return { adFree, neonTheme, marmorTheme, themeBundle, puzzlePackExpert };
}

/**
 * Returns current entitlements from RevenueCat. Returns null if RC not configured.
 */
export async function getRevenueCatEntitlements(): Promise<Entitlements | null> {
  if (!API_KEY) return null;
  try {
    const Purchases = await import('react-native-purchases');
    const { customerInfo } = await Purchases.default.getCustomerInfo();
    return mapEntitlements(customerInfo?.entitlements?.active ?? null);
  } catch {
    return null;
  }
}

/**
 * Restore previous purchases and return entitlements.
 */
export async function restorePurchases(): Promise<Entitlements | null> {
  if (!API_KEY) return null;
  try {
    const Purchases = await import('react-native-purchases');
    const { customerInfo } = await Purchases.default.restorePurchases();
    return mapEntitlements(customerInfo?.entitlements?.active ?? null);
  } catch {
    return null;
  }
}

/**
 * Purchase a product by ID. Returns updated entitlements on success.
 */
export async function purchaseProduct(productId: string): Promise<Entitlements | null> {
  if (!API_KEY) return null;
  try {
    const Purchases = await import('react-native-purchases');
    const { customerInfo } = await Purchases.default.purchaseStoreProduct({ productIdentifier: productId } as never);
    return mapEntitlements(customerInfo?.entitlements?.active ?? null);
  } catch {
    return null;
  }
}

/**
 * Call once at app start (e.g. in root layout). Configures RevenueCat SDK.
 */
export async function configureRevenueCat(): Promise<void> {
  if (!API_KEY) return;
  try {
    const Purchases = await import('react-native-purchases');
    await Purchases.default.configure({ apiKey: API_KEY });
  } catch {
    // Ignore if module not installed or key invalid
  }
}
