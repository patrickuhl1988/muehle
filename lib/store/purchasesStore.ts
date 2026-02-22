/**
 * In-App Purchases (RevenueCat). Entitlements: ad-free, themes, puzzle pack.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRODUCT_IDS, type ProductId } from '../iap/products';

const STORAGE_KEY = 'muhle_purchases_v1';

interface PersistedPurchases {
  adFree: boolean;
  neonTheme: boolean;
  marmorTheme: boolean;
  themeBundle: boolean;
  puzzlePackExpert: boolean;
}

const defaultPurchases: PersistedPurchases = {
  adFree: false,
  neonTheme: false,
  marmorTheme: false,
  themeBundle: false,
  puzzlePackExpert: false,
};

interface PurchasesState extends PersistedPurchases {
  ready: boolean;
  init: () => Promise<void>;
  applyEntitlements: (e: Partial<PersistedPurchases>) => void;
  isAdFree: () => boolean;
  hasTheme: (themeId: string) => boolean;
  hasPuzzlePackExpert: () => boolean;
  restorePurchases: () => Promise<{ error: string | null }>;
  purchase: (productId: ProductId) => Promise<{ error: string | null }>;
}

function persist(p: PersistedPurchases): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p)).catch(() => {});
}

export const usePurchasesStore = create<PurchasesState>((set, get) => ({
  ...defaultPurchases,
  ready: false,

  init: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedPurchases>;
        set({ ...defaultPurchases, ...parsed, ready: true });
      } else {
        set({ ready: true });
      }
    } catch {
      set({ ready: true });
    }
    try {
      const rc = await import('../iap/revenueCat');
      const ent = await rc.getRevenueCatEntitlements();
      if (ent) get().applyEntitlements(ent);
    } catch {
      // RevenueCat not configured
    }
  },

  applyEntitlements: (e) => {
    const next = { ...get(), ...e };
    set(next);
    persist(next);
  },

  isAdFree: () => get().adFree,

  hasTheme: (themeId: string) => {
    const { themeBundle, neonTheme, marmorTheme } = get();
    if (themeBundle) return true;
    if (themeId === 'neon') return neonTheme;
    if (themeId === 'marmor') return marmorTheme;
    return false;
  },

  hasPuzzlePackExpert: () => get().puzzlePackExpert,

  restorePurchases: async () => {
    try {
      const rc = await import('../iap/revenueCat');
      const ent = await rc.restorePurchases();
      if (ent) get().applyEntitlements(ent);
      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },

  purchase: async (productId: ProductId) => {
    try {
      const rc = await import('../iap/revenueCat');
      const ent = await rc.purchaseProduct(productId);
      if (ent) get().applyEntitlements(ent);
      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },
}));
