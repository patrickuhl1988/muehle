/**
 * Banner ad for start screen only. Renders nothing when ad-free or when AdMob is unavailable.
 * Never use during a game. No interstitials.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const BANNER_HEIGHT = 50;

/** Test unit IDs (replace with real in production). */
const AD_UNIT_IDS = {
  android: __DEV__ ? 'ca-app-pub-3940256099942544/6300978111' : process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID ?? '',
  ios: __DEV__ ? 'ca-app-pub-3940256099942544/2934735716' : process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ?? '',
};

export interface AdBannerProps {
  /** When true, banner is hidden (e.g. user bought "Werbefrei"). */
  adFree: boolean;
}

/**
 * Renders a single banner ad at the bottom. Safe to mount when AdMob native module is missing (Expo Go).
 */
export function AdBanner({ adFree }: AdBannerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (adFree || !mounted) return null;

  const unitId = Platform.OS === 'android' ? AD_UNIT_IDS.android : AD_UNIT_IDS.ios;
  if (!unitId) return null;

  try {
    const { BannerAd, BannerAdSize, TestIds } = require('react-native-google-mobile-ads');
    const adUnitId = __DEV__ ? TestIds.BANNER : unitId;
    return (
      <View style={styles.container}>
        <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
      </View>
    );
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: BANNER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
