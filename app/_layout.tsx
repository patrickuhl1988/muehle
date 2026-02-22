/**
 * Root layout: ThemeProvider, GestureHandler, Splash. i18n initialized before render.
 */

import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from 'react-i18next';
import { ThemeProvider, useTheme } from '../lib/theme/ThemeProvider';
import { initI18n } from '../lib/i18n';
import i18n from '../lib/i18n';
import { useSettingsStore } from '../lib/store/settingsStore';
import { hydrateStatsStore } from '../lib/store/statsStore';
import { hydratePuzzleStore } from '../lib/store/puzzleStore';
import { useOnlineStore } from '../lib/store/onlineStore';
import { usePurchasesStore } from '../lib/store/purchasesStore';
import { useGameStore } from '../lib/store/gameStore';
import { buildSavedGameFromStore, persistGameStateSync } from '../lib/utils/savedGame';
import { SoundManager } from '../lib/sound/SoundManager';
import type { AppLanguage } from '../lib/i18n';

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const { theme } = useTheme();
  const isDark = theme.id === 'neon' || theme.id === 'dark';
  return (
    <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.colors.background} />
  );
}

function RootLayoutNav() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const initSession = useOnlineStore((s) => s.initSession);
  const initPurchases = usePurchasesStore((s) => s.init);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);

  useEffect(() => {
    Promise.all([hydrateStatsStore(), hydratePuzzleStore()]).finally(() => {
      SplashScreen.hideAsync();
    });
    initSession();
    initPurchases();
    SoundManager.init().catch(() => {});
    return () => {
      SoundManager.cleanup();
    };
  }, [initSession, initPurchases]);

  useEffect(() => {
    SoundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'background' && nextState !== 'inactive') return;
      const state = useGameStore.getState();
      const payload = buildSavedGameFromStore(state);
      if (payload) persistGameStateSync(payload);
    });
    return () => sub?.remove();
  }, []);

  return (
    <>
      <ThemedStatusBar />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.fontColor,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tutorial" options={{ title: t('play.tutorial'), headerShown: false }} />
        <Stack.Screen
          name="game/[mode]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="game/tagteam"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="puzzle/[id]"
          options={{
            headerShown: false,
            title: t('puzzle.title'),
            headerBackTitle: t('common.back'),
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.fontColor,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="online"
          options={{
            title: t('online.title'),
            headerBackTitle: t('common.back'),
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.fontColor,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: t('settings.title'),
            headerBackTitle: t('common.back'),
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.fontColor,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => {
      const lang = (i18n.language === 'en' ? 'en' : 'de') as AppLanguage;
      useSettingsStore.getState().hydrateLanguage(lang);
      setI18nReady(true);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        {i18nReady ? <RootLayoutNav /> : null}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
