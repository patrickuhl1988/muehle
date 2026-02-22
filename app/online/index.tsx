import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { cardShadow } from '../../lib/theme/cardStyles';
import { useOnlineStore } from '../../lib/store/onlineStore';
import { isSupabaseConfigured } from '../../lib/supabase/client';

export default function OnlineIndexScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { userId, sessionReady, signInAnonymously, signInWithGoogle, joinQueue, profile, initSession } = useOnlineStore();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    const { url, error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      setAuthError(error);
      return;
    }
    if (url) {
      const opened = await Linking.canOpenURL(url).then((ok) => ok && Linking.openURL(url));
      if (!opened) setAuthError(t('online.browserError'));
    }
  }, [signInWithGoogle, t]);

  useEffect(() => {
    if (!sessionReady || !isSupabaseConfigured()) return;
    if (!userId) {
      setLoading(true);
      signInAnonymously().then(({ error }) => {
        setLoading(false);
        setAuthError(error ?? null);
      });
    }
  }, [sessionReady, userId, signInAnonymously]);

  const handleRanked = useCallback(() => {
    setLoading(true);
    joinQueue('ranked').then(({ error }) => {
      setLoading(false);
      if (!error) router.push('/online/queue');
    });
  }, [joinQueue, router]);

  const handleCasual = useCallback(() => {
    setLoading(true);
    joinQueue('casual').then(({ error }) => {
      setLoading(false);
      if (!error) router.push('/online/queue');
    });
  }, [joinQueue, router]);

  const handleFriend = useCallback(() => router.push('/online/friend'), [router]);

  if (!isSupabaseConfigured()) {
    return (
      <View style={[styles.c, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.p, { color: theme.fontColorSecondary }]}>{t('online.comingSoon')}</Text>
      </View>
    );
  }
  if (!sessionReady || (sessionReady && !userId && !authError)) {
    return (
      <View style={[styles.c, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.p, { color: theme.fontColorSecondary }]}>{t('online.signingIn')}</Text>
      </View>
    );
  }
  if (authError) {
    return (
      <View style={[styles.c, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.p, { color: theme.colors.danger }]}>{authError}</Text>
      </View>
    );
  }

  const cardStyle = { backgroundColor: theme.cardBackground };
  return (
    <ScrollView style={[styles.c, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.ct}>
      {profile && (
        <>
          <View style={styles.pr}>
            <Text style={[styles.el, { color: theme.fontColorSecondary }]}>ELO: <Text style={{ color: theme.fontColor, fontWeight: '600' }}>{profile.elo_rating}</Text></Text>
          </View>
          <TouchableOpacity
            style={[styles.card, cardStyle, { marginBottom: 8 }]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="google" size={24} color={theme.fontColor} style={styles.ic} />
            <Text style={[styles.st, { color: theme.fontColorSecondary }]}>{t('online.connectGoogle')}</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={[styles.card, cardStyle]} onPress={handleRanked} disabled={loading} activeOpacity={0.8}>
        <MaterialCommunityIcons name="trophy" size={32} color={theme.colors.accent} style={styles.ic} />
        <View style={styles.ctxt}><Text style={[styles.t, { color: theme.fontColor }]}>{t('online.ranked')}</Text><Text style={[styles.st, { color: theme.fontColorSecondary }]}>{t('online.eloRating')}</Text></View>
        {loading ? <ActivityIndicator size="small" color={theme.colors.accent} /> : <MaterialCommunityIcons name="chevron-right" size={24} color={theme.fontColorSecondary} />}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.card, cardStyle]} onPress={handleCasual} disabled={loading} activeOpacity={0.8}>
        <MaterialCommunityIcons name="gamepad-variant" size={32} color={theme.colors.accent} style={styles.ic} />
        <View style={styles.ctxt}><Text style={[styles.t, { color: theme.fontColor }]}>{t('online.casual')}</Text><Text style={[styles.st, { color: theme.fontColorSecondary }]}>{t('online.noRating')}</Text></View>
        {loading ? <ActivityIndicator size="small" color={theme.colors.accent} /> : <MaterialCommunityIcons name="chevron-right" size={24} color={theme.fontColorSecondary} />}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.card, cardStyle]} onPress={handleFriend} activeOpacity={0.8}>
        <MaterialCommunityIcons name="account-group" size={32} color={theme.colors.accent} style={styles.ic} />
        <View style={styles.ctxt}><Text style={[styles.t, { color: theme.fontColor }]}>{t('online.friendMatch')}</Text><Text style={[styles.st, { color: theme.fontColorSecondary }]}>{t('online.shareCode')} / {t('online.enterCode')}</Text></View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.fontColorSecondary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  ct: { padding: 24, paddingBottom: 48 },
  pr: { marginBottom: 20 },
  el: { fontSize: 14 },
  p: { textAlign: 'center', marginTop: 16, fontSize: 16 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, marginBottom: 16, minHeight: 72, ...cardShadow },
  ic: { marginRight: 16 },
  ctxt: { flex: 1 },
  t: { fontSize: 18, fontWeight: '600' },
  st: { fontSize: 14, marginTop: 4 },
});
