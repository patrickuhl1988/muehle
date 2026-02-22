/**
 * Optional rewarded video ad: "Werbung ansehen für Hinweis". On reward, calls onReward().
 * Renders nothing when react-native-google-mobile-ads is not available (e.g. Expo Go).
 */

import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, Alert } from 'react-native';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

/** Test unit IDs (replace with real in production). */
const REWARDED_UNIT_IDS = {
  android:
    __DEV__
      ? 'ca-app-pub-3940256099942544/5224354917'
      : (process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID ?? ''),
  ios: __DEV__
    ? 'ca-app-pub-3940256099942544/1712485313'
    : (process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS ?? ''),
};

export interface RewardedAdHintProps {
  /** Called when user completed the rewarded ad and earned the hint. */
  onReward: () => void;
  /** Disabled when puzzle is solved or ad not ready. */
  disabled?: boolean;
  /** Optional container style. */
  style?: ViewStyle;
  /** Optional text style. */
  textStyle?: TextStyle;
  /** Optional short label (e.g. "💡 Hinweis") when ad is available. */
  shortLabel?: string;
  /** If true, show a confirmation alert before showing the ad. */
  confirmBeforeAd?: boolean;
  /** Message for the confirmation alert (e.g. "Watch a short ad for a hint?"). */
  confirmMessage?: string;
}

interface RewardedAdHintInnerProps extends RewardedAdHintProps {
  unitId: string;
  useRewardedAd: (unitId: string, options?: { loadOnMounted?: boolean }) => {
    adLoaded: boolean;
    adShowing: boolean;
    show: () => void;
    reward: { amount: number; type: string } | undefined;
  };
}

function RewardedAdHintInner({
  unitId,
  useRewardedAd,
  onReward,
  disabled,
  style,
  textStyle,
  shortLabel,
  confirmBeforeAd,
  confirmMessage,
}: RewardedAdHintInnerProps) {
  const onRewardRef = useRef(onReward);
  onRewardRef.current = onReward;

  const { adLoaded, adShowing, show, reward } = useRewardedAd(unitId, { loadOnMounted: true });

  useEffect(() => {
    if (reward != null) {
      onRewardRef.current();
    }
  }, [reward]);

  const { t } = useTranslation();
  const handlePress = () => {
    if (!adLoaded || adShowing) return;
    if (confirmBeforeAd && confirmMessage) {
      Alert.alert('', confirmMessage, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.ok'), onPress: () => show() },
      ]);
    } else {
      show();
    }
  };

  const busy = adShowing || disabled;
  const canShow = adLoaded && !adShowing;
  const defaultLabel = adShowing ? t('common.loading') : canShow ? t('puzzle.watchAdForHint') : t('puzzle.hintViaAd');
  const label = shortLabel != null && canShow && !adShowing ? shortLabel : defaultLabel;

  return (
    <TouchableOpacity
      style={[styles.button, style, busy && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={busy || !canShow}
      accessibilityLabel={label}
    >
      <Text style={[styles.text, textStyle, busy && styles.textDisabled]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Renders a button "Werbung ansehen für Hinweis" that shows a rewarded ad; on reward calls onReward().
 * Returns null if the ad SDK is not available.
 */
export function RewardedAdHint(props: RewardedAdHintProps) {
  try {
    const ads = require('react-native-google-mobile-ads');
    const useRewardedAd = ads.useRewardedAd;
    const TestIds = ads.TestIds ?? { REWARDED: REWARDED_UNIT_IDS.android };
    const unitId =
      Platform.OS === 'android'
        ? (__DEV__ ? TestIds.REWARDED : REWARDED_UNIT_IDS.android)
        : (__DEV__ ? TestIds.REWARDED : REWARDED_UNIT_IDS.ios);
    if (!unitId) return null;
    return (
      <RewardedAdHintInner
        {...props}
        unitId={unitId}
        useRewardedAd={useRewardedAd}
      />
    );
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#888',
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  textDisabled: {
    color: '#999',
  },
});
