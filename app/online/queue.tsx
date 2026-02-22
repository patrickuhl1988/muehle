/**
 * Matchmaking queue: Suche Gegner, Cancel. When matched, navigate to game.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { useOnlineStore } from '../../lib/store/onlineStore';

const POLL_INTERVAL_MS = 2000;

export default function OnlineQueueScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { currentMatch, myPlayerNumber, leaveQueue, pollMatchmaking } = useOnlineStore();

  useEffect(() => {
    const id = setInterval(pollMatchmaking, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pollMatchmaking]);

  useEffect(() => {
    if (currentMatch?.id && myPlayerNumber) {
      router.replace({ pathname: '/game/online', params: { matchId: currentMatch.id } });
    }
  }, [currentMatch?.id, myPlayerNumber, router]);

  const handleCancel = async () => {
    await leaveQueue();
    router.back();
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background, padding: 24, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18, color: theme.fontColor, marginTop: 16, textAlign: 'center' },
    sub: { fontSize: 14, color: theme.fontColorSecondary, marginTop: 8 },
    cancel: { marginTop: 32, paddingVertical: 14, paddingHorizontal: 24, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.borderColor, backgroundColor: theme.cardBackground },
    cancelText: { fontSize: 16, fontWeight: '600', color: theme.fontColor },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
      <Text style={styles.text}>{t('online.searchingForOpponent')}</Text>
      <Text style={[styles.text, styles.sub]}>{t('online.matchingHint')}</Text>
      <TouchableOpacity style={styles.cancel} onPress={handleCancel} activeOpacity={0.8}>
        <Text style={styles.cancelText}>{t('common.cancel')}</Text>
      </TouchableOpacity>
    </View>
  );
}
