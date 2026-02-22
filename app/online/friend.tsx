/**
 * Freundschaftsspiel: Create match (show 6-digit code) or Join with code.
 */

import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { cardShadow } from '../../lib/theme/cardStyles';
import { useOnlineStore } from '../../lib/store/onlineStore';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { createInitialState } from '../../lib/game/engine';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function OnlineFriendScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { userId, profile, setCurrentMatch, subscribeToMatch } = useOnlineStore();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [code, setCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!isSupabaseConfigured() || !userId) return;
    setLoading(true);
    setError(null);
    let matchCode = generateCode();
    const initialState = createInitialState();
    const { data: match, error: insertError } = await supabase
      .from('matches')
      .insert({
        player1_id: userId,
        player2_id: null,
        status: 'waiting',
        game_state: initialState,
        mode: 'friend',
        time_control: null,
        move_history: [],
        invite_code: matchCode,
      })
      .select('id')
      .single();

    if (insertError || !match) {
      setError(insertError?.message ?? 'Match konnte nicht erstellt werden.');
      setLoading(false);
      return;
    }
    await supabase.from('matchmaking_queue').delete().eq('player_id', userId);
    setCreatedCode(matchCode);
    setMode('create');
    setLoading(false);
    setCurrentMatch(
      {
        id: match.id,
        player1_id: userId,
        player2_id: null,
        status: 'waiting',
        game_state: initialState,
        winner_id: null,
        is_draw: false,
        mode: 'friend',
        time_control: null,
        move_history: [],
        started_at: null,
        completed_at: null,
      },
      1
    );
    subscribeToMatch(match.id);
  }, [userId, setCurrentMatch, subscribeToMatch]);

  const handleJoin = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length !== 6) {
      setError(t('online.codeRequired'));
      return;
    }
    if (!isSupabaseConfigured() || !userId) return;
    setLoading(true);
    setError(null);
    const { data: match, error: findErr } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'waiting')
      .eq('mode', 'friend')
      .eq('invite_code', trimmed)
      .is('player2_id', null)
      .maybeSingle();

    if (findErr || !match) {
      setError(t('online.noMatchFound'));
      setLoading(false);
      return;
    }
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        player2_id: userId,
        status: 'active',
        started_at: new Date().toISOString(),
        game_state: match.game_state,
      })
      .eq('id', match.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    setCurrentMatch({ ...match, player2_id: userId, status: 'active', started_at: new Date().toISOString() }, 2);
    subscribeToMatch(match.id);
    setLoading(false);
    router.replace({ pathname: '/game/online', params: { matchId: match.id } });
  }, [code, userId, setCurrentMatch, subscribeToMatch, router, t]);

  const handleShareCode = useCallback(() => {
    if (!createdCode) return;
    Share.share({
      message: t('online.shareMessage', { code: createdCode }),
      title: t('online.shareTitle'),
    });
  }, [createdCode, t]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
    section: { marginBottom: 24 },
    title: { fontSize: 18, fontWeight: '600', color: theme.fontColor, marginBottom: 12 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderRadius: 16,
      backgroundColor: theme.cardBackground,
      marginBottom: 12,
      ...cardShadow,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.borderColor,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 18,
      color: theme.fontColor,
      backgroundColor: theme.cardBackground,
      minHeight: 44,
      letterSpacing: 4,
    },
    btn: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      minHeight: 44,
      marginTop: 12,
    },
    btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
    codeDisplay: { fontSize: 28, fontWeight: '700', letterSpacing: 8, color: theme.fontColor },
    error: { fontSize: 14, color: theme.colors.danger, marginTop: 8 },
  });

  if (mode === 'choose') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={styles.section}>
          <Text style={styles.title}>{t('online.createMatch')}</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus-circle" size={28} color={theme.colors.accent} />
            <Text style={[styles.title, { marginBottom: 0, marginLeft: 12 }]}>{t('online.newGame')}</Text>
            {loading && <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginLeft: 'auto' }} />}
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Text style={styles.title}>{t('online.enterCode')}</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, 6)); setError(null); }}
            placeholder="000000"
            placeholderTextColor={theme.fontColorSecondary}
            keyboardType="number-pad"
            maxLength={6}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.accent }]}
            onPress={handleJoin}
            disabled={loading}
          >
            <Text style={styles.btnText}>{t('online.join')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { justifyContent: 'center' }]}>
      <Text style={styles.title}>{t('online.codeForOpponent')}</Text>
      <Text style={styles.codeDisplay}>{createdCode}</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.accent, marginTop: 24 }]} onPress={handleShareCode}>
        <Text style={styles.btnText}>{t('online.shareCode')}</Text>
      </TouchableOpacity>
      <Text style={[styles.title, { marginTop: 24, fontSize: 14, color: theme.fontColorSecondary }]}>
        {t('online.waitForOpponent')}
      </Text>
    </View>
  );
}
