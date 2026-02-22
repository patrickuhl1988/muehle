/**
 * Two flag icons (🇩🇪 🇬🇧) to switch app language. Active language full opacity, inactive dimmed.
 * Used on the Home screen header only.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';

const FLAG_DE = '🇩🇪';
const FLAG_GB = '🇬🇧';
const MIN_TOUCH = 40;

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const currentLang = language === 'en' ? 'en' : 'de';

  const handleDe = () => {
    if (currentLang !== 'de') setLanguage('de');
  };
  const handleEn = () => {
    if (currentLang !== 'en') setLanguage('en');
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    flagWrap: {
      minWidth: MIN_TOUCH,
      minHeight: MIN_TOUCH,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 4,
    },
    flag: {
      fontSize: 22,
    },
    active: {
      opacity: 1,
    },
    inactive: {
      opacity: 0.35,
    },
    activeUnderline: {
      position: 'absolute',
      bottom: 2,
      left: 8,
      right: 8,
      height: 2,
      borderRadius: 1,
      backgroundColor: theme.colors.accent,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.flagWrap}
        onPress={handleDe}
        activeOpacity={0.7}
        accessibilityLabel="Deutsch"
        accessibilityRole="button"
      >
        <Text style={[styles.flag, currentLang === 'de' ? styles.active : styles.inactive]}>
          {FLAG_DE}
        </Text>
        {currentLang === 'de' && <View style={styles.activeUnderline} />}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.flagWrap}
        onPress={handleEn}
        activeOpacity={0.7}
        accessibilityLabel="English"
        accessibilityRole="button"
      >
        <Text style={[styles.flag, currentLang === 'en' ? styles.active : styles.inactive]}>
          {FLAG_GB}
        </Text>
        {currentLang === 'en' && <View style={styles.activeUnderline} />}
      </TouchableOpacity>
    </View>
  );
}
