/**
 * Start screen: custom header, hero board, Quick Play, Tutorial card, stats.
 * Premium wood/linen aesthetic; shadow-based cards, no outline borders.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Modal, Pressable, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { useStatsStore } from '../../lib/store/statsStore';
import { useGameStore } from '../../lib/store/gameStore';
import { useSettingsStore } from '../../lib/store/settingsStore';
import { usePurchasesStore } from '../../lib/store/purchasesStore';
import { AdBanner } from '../../lib/components/AdBanner';
import { LanguageToggle } from '../../lib/components/LanguageToggle';
import { HeroBoard } from '../../lib/components/HeroBoard';
import { getCardStyle, cardShadow, buttonShadow, dividerColor } from '../../lib/theme/cardStyles';
import { PressableScale } from '../../lib/components/PressableScale';
import { loadSavedGame, deleteSavedGame, getTimeAgo, type SavedGame } from '../../lib/utils/savedGame';

const TAB_BAR_HEIGHT = 80;
const MIN_HERO_BOARD_SIZE = 180;
const MAX_HERO_BOARD_SIZE = 300;
const HEADER_HEIGHT_APPROX = 70;
const HERO_SECTION_HEIGHT = 80;
const TUTORIAL_HEIGHT = 48;
const STATS_HEIGHT = 80;
const TOTAL_SPACING = 40;

const PAGE_PADDING_H = 24;
const LABEL_TERTIARY = '#8B7355';
const ACCENT_SECONDARY = '#C9A84C';
const BUTTON_TEXT_ON_PRIMARY = '#FFFBF0';
const TERTIARY_BG = '#EDE4D8';
const MIN_TOUCH_TARGET = 48;
const CARD_MARGIN_BOTTOM = 20;
const CARD_PADDING = 22;
const CARD_RADIUS = 18;

export default function StartScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { gamesWon, gamesPlayed, winStreak } = useStatsStore();
  const isAdFree = usePurchasesStore((s) => s.isAdFree());
  const { startGame } = useGameStore();
  const aiDifficulty = useSettingsStore((s) => s.aiDifficulty);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const safeArea = useSafeAreaInsets();
  const availableHeight = screenHeight - safeArea.top - safeArea.bottom - TAB_BAR_HEIGHT;
  const fixedContentHeight = HEADER_HEIGHT_APPROX + HERO_SECTION_HEIGHT + TUTORIAL_HEIGHT + STATS_HEIGHT + TOTAL_SPACING;
  const heroBoardSize = Math.min(
    MAX_HERO_BOARD_SIZE,
    Math.max(MIN_HERO_BOARD_SIZE, availableHeight - fixedContentHeight),
    screenWidth * 0.7
  );
  const showHeroBoard = heroBoardSize >= MIN_HERO_BOARD_SIZE;

  const [savedGame, setSavedGame] = useState<SavedGame | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [displayWinRate, setDisplayWinRate] = useState(0);
  const [displayStreak, setDisplayStreak] = useState(0);
  const [displayGames, setDisplayGames] = useState(0);

  useEffect(() => {
    loadSavedGame().then((saved) => {
      if (saved) {
        setSavedGame(saved);
        setShowResumeDialog(true);
      }
    });
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadSavedGame().then((saved) => {
        setSavedGame(saved ?? null);
        setShowResumeDialog(!!saved);
      });
    }, [])
  );

  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
  const cardStyle = getCardStyle(theme);

  const heroOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.95);
  const buttonScale = useSharedValue(0.96);
  const statsProgress = useSharedValue(0);
  useEffect(() => {
    heroOpacity.value = withDelay(50, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));
    heroScale.value = withDelay(100, withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }));
    buttonScale.value = withDelay(200, withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.2)) }));
    statsProgress.value = withDelay(400, withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }));
  }, [heroOpacity, heroScale, buttonScale, statsProgress]);

  const updateStatsDisplay = React.useCallback((p: number) => {
    setDisplayWinRate(Math.round(p * winRate));
    setDisplayStreak(Math.round(p * (winStreak ?? 0)));
    setDisplayGames(Math.round(p * gamesPlayed));
  }, [winRate, winStreak, gamesPlayed]);

  useAnimatedReaction(
    () => statsProgress.value,
    (p) => {
      'worklet';
      runOnJS(updateStatsDisplay)(p);
    },
    [updateStatsDisplay]
  );

  const initialMountDone = React.useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { initialMountDone.current = true; }, 1500);
    return () => clearTimeout(t);
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      if (initialMountDone.current) {
        setDisplayWinRate(winRate);
        setDisplayStreak(winStreak ?? 0);
        setDisplayGames(gamesPlayed);
      }
    }, [winRate, winStreak, gamesPlayed])
  );

  const animatedHeroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ scale: heroScale.value }],
  }));
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleSchnellspiel = () => {
    startGame('ai', aiDifficulty);
    router.push('/game/ai');
  };

  const handleContinue = () => {
    setShowResumeDialog(false);
    router.push({ pathname: '/game/ai', params: { restore: 'true' } });
  };

  const handleNewGameFromDialog = async () => {
    const mode = savedGame!.mode;
    const difficulty = savedGame!.aiDifficulty;
    setShowResumeDialog(false);
    await deleteSavedGame();
    setSavedGame(null);
    startGame(mode, difficulty);
    router.push('/game/ai');
  };

  const getDifficultyLabel = (d: SavedGame['aiDifficulty']) =>
    t(`play.difficultyLevels.${d}` as 'play.difficultyLevels.beginner');

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: PAGE_PADDING_H,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingTop: 12,
      paddingBottom: 8,
      marginBottom: 0,
    },
    headerLeft: {
      flex: 1,
    },
    appTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.fontColor,
      letterSpacing: 0.3,
      maxWidth: '85%',
    },
    headerSubtitle: {
      fontSize: 15,
      fontWeight: '400',
      color: theme.fontColorSecondary ?? LABEL_TERTIARY,
      marginTop: 6,
      letterSpacing: 0.2,
    },
    langPill: {
      backgroundColor: TERTIARY_BG,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    heroBoardWrap: {
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 4,
    },
    heroSection: {
      marginTop: 16,
      marginBottom: 8,
    },
    heroButton: {
      backgroundColor: theme.colors.accent,
      height: 56,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#2C1810',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 5,
    },
    heroButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    heroButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: BUTTON_TEXT_ON_PRIMARY,
      letterSpacing: 0.2,
    },
    heroHint: {
      fontSize: 13,
      fontWeight: '400',
      color: LABEL_TERTIARY,
      textAlign: 'center',
      marginTop: 4,
      opacity: 0.6,
    },
    card: {
      ...cardStyle,
      marginHorizontal: 0,
    },
    cardFirst: {
      marginTop: 0,
    },
    tutorialCard: {
      padding: 16,
      borderRadius: 12,
      marginTop: 12,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.fontColor,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 14,
      color: theme.fontColorSecondary,
      marginBottom: 8,
    },
    cardLink: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    statsCard: {
      ...cardStyle,
      marginHorizontal: 0,
      flexDirection: 'row',
      paddingVertical: 14,
      paddingHorizontal: 0,
      paddingBottom: 18,
      marginTop: 12,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    statBlock: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    statDivider: {
      width: 1,
      backgroundColor: dividerColor,
      alignSelf: 'stretch',
    },
    statValue: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.fontColor,
    },
    statLabel: {
      fontSize: 10,
      color: LABEL_TERTIARY,
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    resumeOverlaySafe: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    resumeOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    resumeCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      paddingHorizontal: 28,
      paddingTop: 28,
      paddingBottom: 28,
      width: '100%',
      maxWidth: 320,
      alignItems: 'center',
      ...cardShadow,
    },
    resumeTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.fontColor,
      marginBottom: 14,
      textAlign: 'center',
    },
    resumeInfo: {
      fontSize: 15,
      color: theme.fontColorSecondary,
      marginBottom: 8,
      textAlign: 'center',
    },
    resumeTime: {
      fontSize: 13,
      color: theme.fontColorSecondary,
      marginBottom: 16,
      textAlign: 'center',
    },
    resumeButtons: {
      width: '100%',
      alignItems: 'stretch',
    },
    resumePrimaryButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      ...buttonShadow,
    },
    resumePrimaryText: {
      fontSize: 16,
      fontWeight: '600',
      color: BUTTON_TEXT_ON_PRIMARY,
      textAlign: 'center',
    },
    resumeSecondaryButton: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      marginTop: 8,
    },
    resumeSecondaryText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.accent,
      textAlign: 'center',
    },
    resumeDestructiveButton: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.fontColorSecondary ?? LABEL_TERTIARY,
      marginTop: 16,
    },
    resumeDestructiveText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.fontColorSecondary ?? theme.fontColor,
      textAlign: 'center',
    },
  });

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ flexGrow: 1, minHeight: availableHeight, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text
                style={styles.appTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {t('game.title')}
              </Text>
              <Text style={styles.headerSubtitle}>{t('home.subtitle')}</Text>
            </View>
            <View style={styles.langPill}>
              <LanguageToggle />
            </View>
          </View>

          {showHeroBoard && (
            <Animated.View style={[styles.heroBoardWrap, animatedHeroStyle]}>
              <HeroBoard theme={theme} boardSize={Math.floor(heroBoardSize)} />
            </Animated.View>
          )}

          <View style={styles.heroSection}>
            <Animated.View style={animatedButtonStyle}>
              <PressableScale
                style={styles.heroButton}
              onPress={savedGame ? () => setShowResumeDialog(true) : handleSchnellspiel}
              scaleTo={0.97}
            >
              <View style={styles.heroButtonContent}>
                <MaterialCommunityIcons name="play" size={24} color={BUTTON_TEXT_ON_PRIMARY} />
                <Text style={styles.heroButtonText} numberOfLines={1}>
                  {savedGame ? t('save.continueGame') : t('home.quickPlay')}
                </Text>
              </View>
            </PressableScale>
            </Animated.View>
            <Text style={styles.heroHint}>
              {savedGame
                ? t('save.vsAi', { difficulty: getDifficultyLabel(savedGame.aiDifficulty) })
                : t('home.quickPlayHint')}
            </Text>
          </View>

          <PressableScale
            style={[styles.card, styles.cardFirst, styles.tutorialCard]}
            onPress={() => router.push('/tutorial')}
            scaleTo={0.98}
          >
            <Text style={styles.cardTitle}>{t('home.tutorialCardTitle')}</Text>
            <Text style={styles.cardSubtitle}>{t('home.tutorialCardSubtitle')}</Text>
            <Text style={styles.cardLink}>{t('achievements.firstSteps.name')} →</Text>
          </PressableScale>

          <View style={styles.statsCard}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{displayWinRate}%</Text>
              <Text style={styles.statLabel}>{t('home.winRate')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{displayStreak}</Text>
              <Text style={styles.statLabel}>{t('home.streak')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{displayGames}</Text>
              <Text style={styles.statLabel}>{t('home.games')}</Text>
            </View>
          </View>

          {!isAdFree && <AdBanner adFree={false} />}
        </ScrollView>
      </SafeAreaView>

      {showResumeDialog && savedGame && (
        <Modal visible transparent animationType="fade">
          <SafeAreaView style={styles.resumeOverlaySafe} edges={['top', 'bottom']}>
            <View style={styles.resumeOverlay}>
              <View style={styles.resumeCard}>
                <Text style={styles.resumeTitle}>{t('save.gameFound')}</Text>
                <Text style={styles.resumeInfo}>
                  {t('save.vsAi', { difficulty: getDifficultyLabel(savedGame.aiDifficulty) })}
                </Text>
                <Text style={styles.resumeTime}>
                  {getTimeAgo(savedGame.savedAt, t) === t('save.justNow')
                    ? t('save.savedJustNow')
                    : t('save.savedAgo', { time: getTimeAgo(savedGame.savedAt, t) })}
                </Text>
                <View style={styles.resumeButtons}>
                  <PressableScale style={styles.resumePrimaryButton} onPress={handleContinue} scaleTo={0.97}>
                    <Text style={styles.resumePrimaryText}>{t('save.continue')}</Text>
                  </PressableScale>
                  <PressableScale
                    style={styles.resumeSecondaryButton}
                    onPress={() => setShowResumeDialog(false)}
                    scaleTo={0.97}
                  >
                    <Text style={styles.resumeSecondaryText}>{t('save.continueLater')}</Text>
                  </PressableScale>
                  <PressableScale style={styles.resumeDestructiveButton} onPress={handleNewGameFromDialog} scaleTo={0.97}>
                    <Text style={styles.resumeDestructiveText}>{t('save.newGame')}</Text>
                  </PressableScale>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}
