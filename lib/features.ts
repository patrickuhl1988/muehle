/**
 * Feature flags for modes that may be "coming soon".
 * When a mode is enabled here, it appears in the Play screen and related achievements are shown.
 */

export type FeatureId = 'blitz' | 'online';

export const FEATURES: Record<FeatureId, boolean> = {
  blitz: false,
  online: false,
};

export function isFeatureEnabled(feature: FeatureId): boolean {
  return FEATURES[feature];
}
