import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function OnlineLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerBackTitle: t('common.back') }}>
      <Stack.Screen name="index" options={{ title: t('online.title') }} />
      <Stack.Screen name="queue" options={{ title: t('online.findOpponent') }} />
      <Stack.Screen name="friend" options={{ title: t('online.friendMatch') }} />
    </Stack>
  );
}
