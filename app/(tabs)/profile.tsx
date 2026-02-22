/**
 * Profile: player name, avatar, ELO, stats grid, achievements.
 * Theme selection lives in Settings (Design).
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { cardShadow } from '../../lib/theme/cardStyles';
import { useStatsStore } from '../../lib/store/statsStore';
import { useSettingsStore } from '../../lib/store/settingsStore';
import {
  buildAchievements,
  type AchievementCategory,
} from '../../lib/game/achievements';
import { isFeatureEnabled } from '../../lib/features';

const AVATAR_SIZE = 80;
const MIN_TOUCH = 44;
const ACHIEVEMENT_GOLD = '#C9A84C';

/** Reward label → display string with emoji for pill. Strips developer comments like "(wenn vorhanden)". */
function rewardToPillLabel(reward: string): string {
  const clean = reward.replace(/\s*\([^)]*\)/g, '').trim();
  if (clean.includes('Neon')) return `🎨 ${clean}`;
  if (clean.includes('Pixel')) return `🕹 ${clean}`;
  if (clean.includes('Vintage')) return `🎭 ${clean}`;
  if (clean === 'Badge') return '🏅 Badge';
  if (clean.includes('Avatar')) return `👤 ${clean}`;
  if (clean.includes('Animation')) return `✨ ${clean}`;
  if (clean.includes('Rahmen')) return `🖼 ${clean}`;
  return clean;
}

const ACHIEVEMENT_I18N_KEYS: Record<string, string> = {
  erste_schritte: 'firstSteps',
  erste_muehle: 'firstMill',
  erster_sieg: 'firstWin',
  muehlenbauer: 'millBuilder',
  zwickmuehlen_meister: 'doubleMill',
  blitz_koenig: 'blitzKing',
  perfektionist: 'perfectionist',
  comeback_king: 'comebackKing',
  marathon: 'marathon',
  puzzle_neuling: 'puzzleNovice',
  puzzle_meister: 'puzzleMaster',
  streak_7: 'streak7',
  streak_30: 'streak30',
  drei_sterne_sammler: 'threeStars',
  ki_bezwinger: 'aiBuster',
  unbesiegbar: 'unbeatable',
  seriensieger: 'winStreak5',
  online_debuet: 'onlineDebut',
  elo_1200: 'elo1200',
  elo_1500: 'elo1500',
};

const CATEGORY_I18N_KEYS: Record<AchievementCategory, string> = {
  anfaenger: 'profile.categoryAnfaenger',
  fortgeschritten: 'profile.categoryFortgeschritten',
  puzzle: 'profile.categoryPuzzle',
  ki: 'profile.categoryKi',
  online: 'profile.categoryOnline',
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const playerName = useSettingsStore((s) => s.playerName);
  const avatarColor = useSettingsStore((s) => s.avatarColor);
  const avatarIcon = useSettingsStore((s) => s.avatarIcon);
  const tutorialCompleted = useSettingsStore((s) => s.tutorialCompleted);
  const statsSlice = useStatsStore(
    useShallow((s) => ({
      unlockedAchievementAt: s.unlockedAchievementAt,
      gamesPlayed: s.gamesPlayed,
      gamesWon: s.gamesWon,
      gamesLost: s.gamesLost,
      gamesDraw: s.gamesDraw,
      winStreak: s.winStreak,
      bestWinStreak: s.bestWinStreak,
      totalMills: s.totalMills,
      totalMoves: s.totalMoves,
      fastestWin: s.fastestWin,
      puzzlesSolved: s.puzzlesSolved,
      dailyStreak: s.dailyStreak,
      bestDailyStreak: s.bestDailyStreak,
      puzzlesWithThreeStars: s.puzzlesWithThreeStars,
      onlineElo: s.onlineElo,
      onlineGamesPlayed: s.onlineGamesPlayed,
      maxAILevelBeaten: s.maxAILevelBeaten,
      aiWinStreak: s.aiWinStreak,
      maxMillsInSingleGame: s.maxMillsInSingleGame,
      blitzWins: s.blitzWins,
      lastWinWasPerfect: s.lastWinWasPerfect,
      lastWinWasComeback: s.lastWinWasComeback,
    }))
  );
  const achievements = useMemo(() => {
    const s = statsSlice;
    const stats = {
      gamesPlayed: s.gamesPlayed,
      gamesWon: s.gamesWon,
      gamesLost: s.gamesLost,
      gamesDraw: s.gamesDraw,
      winStreak: s.winStreak,
      bestWinStreak: s.bestWinStreak,
      totalMills: s.totalMills,
      totalMoves: s.totalMoves,
      fastestWin: s.fastestWin,
      puzzlesSolved: s.puzzlesSolved,
      dailyStreak: s.dailyStreak,
      bestDailyStreak: s.bestDailyStreak,
      puzzlesWithThreeStars: s.puzzlesWithThreeStars,
      onlineElo: s.onlineElo,
      onlineGamesPlayed: s.onlineGamesPlayed,
      tutorialCompleted,
      maxAILevelBeaten: s.maxAILevelBeaten,
      aiWinStreak: s.aiWinStreak,
      maxMillsInSingleGame: s.maxMillsInSingleGame,
      blitzWins: s.blitzWins,
      lastWinWasPerfect: s.lastWinWasPerfect,
      lastWinWasComeback: s.lastWinWasComeback,
    };
    return buildAchievements(stats, s.unlockedAchievementAt);
  }, [statsSlice, tutorialCompleted]);

  const visibleAchievements = useMemo(() => {
    return achievements.filter((a) => {
      const req = a.requiresFeature;
      if (req == null) return true;
      return isFeatureEnabled(req);
    });
  }, [achievements]);

  const gamesPlayed = statsSlice.gamesPlayed;
  const gamesWon = statsSlice.gamesWon;
  const gamesLost = statsSlice.gamesLost;
  const gamesDraw = statsSlice.gamesDraw;
  const winStreak = statsSlice.winStreak;
  const bestWinStreak = statsSlice.bestWinStreak;
  const onlineElo = statsSlice.onlineElo;
  const onlineGamesPlayed = statsSlice.onlineGamesPlayed;

  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

  const achievementsByCategory = useMemo(() => {
    const map = new Map<AchievementCategory, typeof visibleAchievements>();
    for (const a of visibleAchievements) {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    }
    const order: AchievementCategory[] = ['anfaenger', 'fortgeschritten', 'puzzle', 'ki', 'online'];
    return order.map((cat) => ({ category: cat, list: map.get(cat) ?? [] })).filter(({ list }) => list.length > 0);
  }, [visibleAchievements]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: 20,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 24,
        },
        settingsLink: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 12,
          gap: 6,
        },
        settingsLinkText: {
          fontSize: 14,
          fontWeight: '500',
          color: theme.colors.accent,
        },
        avatarWrap: {
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: AVATAR_SIZE / 2,
          backgroundColor: avatarColor,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 16,
        },
        avatarIcon: {
          color: 'rgba(255,255,255,0.9)',
        },
        headerText: {
          flex: 1,
        },
        playerName: {
          fontSize: 22,
          fontWeight: '700',
          color: theme.fontColor,
        },
        eloRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 4,
        },
        eloLabel: {
          fontSize: 14,
          color: theme.fontColorSecondary,
          marginRight: 6,
        },
        eloValue: {
          fontSize: 16,
          fontWeight: '600',
          color: theme.colors.accent,
        },
        sectionTitle: {
          fontSize: 18,
          fontWeight: '700',
          color: theme.fontColor,
          marginBottom: 12,
        },
        statsGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginBottom: 24,
          gap: 12,
        },
        statCard: {
          width: (width - 40 - 12) / 2,
          minWidth: 140,
          backgroundColor: theme.cardBackground,
          borderRadius: 12,
          padding: 16,
          ...cardShadow,
        },
        statCardFullWidth: {
          width: '100%',
        },
        statValue: {
          fontSize: 24,
          fontWeight: '700',
          color: theme.fontColor,
        },
        statLabel: {
          fontSize: 13,
          color: theme.fontColorSecondary,
          marginTop: 4,
        },
        card: {
          backgroundColor: theme.cardBackground,
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          ...cardShadow,
        },
        categoryTitle: {
          fontSize: 15,
          fontWeight: '600',
          color: theme.fontColorSecondary,
          marginBottom: 10,
        },
        achievementRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.borderColor,
        },
        achievementRowLast: {
          borderBottomWidth: 0,
        },
        achievementIcon: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        },
        achievementIconUnlocked: {
          backgroundColor: 'rgba(201, 168, 76, 0.25)',
        },
        achievementBody: {
          flex: 1,
        },
        achievementName: {
          fontSize: 15,
          fontWeight: '600',
          color: theme.fontColor,
        },
        achievementNameLocked: {
          color: theme.fontColorSecondary,
        },
        achievementDesc: {
          fontSize: 12,
          color: theme.fontColorSecondary,
          marginTop: 2,
        },
        achievementDescLocked: {
          color: theme.fontColorTertiary ?? theme.fontColorSecondary,
        },
        progressRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 6,
          gap: 8,
        },
        progressText: {
          fontSize: 11,
          color: theme.fontColorSecondary,
        },
        progressBarWrap: {
          flex: 1,
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.colors.background,
          overflow: 'hidden',
        },
        progressBarFill: {
          height: '100%',
          borderRadius: 3,
          backgroundColor: theme.colors.accent,
        },
        achievementRewardPill: {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 4,
          paddingHorizontal: 10,
          borderRadius: 12,
          backgroundColor: theme.colors.background,
          borderWidth: 1,
          borderColor: theme.borderColor,
          marginTop: 6,
        },
        achievementRewardPillText: {
          fontSize: 12,
          fontWeight: '500',
          color: theme.fontColorSecondary,
        },
      }),
    [theme, avatarColor, width]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <MaterialCommunityIcons name={avatarIcon as keyof typeof MaterialCommunityIcons.glyphMap} size={40} style={styles.avatarIcon} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.playerName}>{playerName}</Text>
          {onlineGamesPlayed > 0 && (
            <View style={styles.eloRow}>
              <Text style={styles.eloLabel}>{t('profile.elo')}</Text>
              <Text style={styles.eloValue}>{onlineElo}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.settingsLink}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="cog-outline" size={20} color={theme.colors.accent} />
          <Text style={styles.settingsLinkText}>{t('common.settings')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('profile.stats')}</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{gamesPlayed}</Text>
          <Text style={styles.statLabel}>{t('profile.gamesPlayed')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.successColor }]}>{gamesWon}</Text>
          <Text style={styles.statLabel}>{t('profile.gamesWon')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.colors.danger }]}>{gamesLost}</Text>
          <Text style={styles.statLabel}>{t('profile.gamesLost')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{winRate}%</Text>
          <Text style={styles.statLabel}>{t('profile.winRate')}</Text>
        </View>
        <View style={[styles.statCard, styles.statCardFullWidth]}>
          <Text style={styles.statValue}>{bestWinStreak}</Text>
          <Text style={styles.statLabel}>{t('profile.bestStreak')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('profile.achievements')}</Text>
      {achievementsByCategory.map(({ category, list }) =>
        list.length === 0 ? null : (
          <View key={category} style={styles.card}>
            <Text style={styles.categoryTitle}>{t(CATEGORY_I18N_KEYS[category])}</Text>
            {list.map((a, i) => {
              const i18nKey = ACHIEVEMENT_I18N_KEYS[a.id];
              const name = i18nKey ? t(`achievements.${i18nKey}.name`) : a.name;
              const desc = i18nKey ? t(`achievements.${i18nKey}.desc`) : a.description;
              const done = a.progress.done;
              return (
                <View
                  key={a.id}
                  style={[styles.achievementRow, i === list.length - 1 && styles.achievementRowLast]}
                >
                  <View
                    style={[
                      styles.achievementIcon,
                      done && styles.achievementIconUnlocked,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={done ? 'trophy' : 'trophy-outline'}
                      size={20}
                      color={done ? ACHIEVEMENT_GOLD : theme.fontColorSecondary}
                    />
                  </View>
                  <View style={styles.achievementBody}>
                    <Text style={[styles.achievementName, !done && styles.achievementNameLocked]}>{name}</Text>
                    <Text style={[styles.achievementDesc, !done && styles.achievementDescLocked]}>{desc}</Text>
                    {a.target > 1 && (
                      <View style={styles.progressRow}>
                        <Text style={styles.progressText}>
                          {a.progress.current}/{a.progress.target}
                        </Text>
                        <View style={styles.progressBarWrap}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.min(100, (a.progress.current / a.progress.target) * 100)}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    )}
                    {a.reward && (
                      <View style={styles.achievementRewardPill}>
                        <Text style={styles.achievementRewardPillText}>{rewardToPillLabel(a.reward)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )
      )}
      </ScrollView>
    </SafeAreaView>
  );
}
