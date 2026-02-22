/**
 * Single puzzle screen: custom header, task (compact), turn indicator, board, attempts (with wrong-move feedback), stars, Neustart/Nächstes.
 */

import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing, interpolate } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { PressableScale } from '../../lib/components/PressableScale';
import { usePuzzleStore } from '../../lib/store/puzzleStore';
import { useStatsStore } from '../../lib/store/statsStore';
import {
  getDailyPuzzle,
  getDailyPuzzleNumber,
  puzzleDefinitionToGameState,
  buildMoveFromState,
  ALL_PUZZLES,
} from '../../lib/game/puzzles';
import { getValidMoves, getRemovableStones } from '../../lib/game/engine';
import { getPlayerStones } from '../../lib/game/board';
import { Board } from '../../lib/components/Board';
import { useSound } from '../../lib/hooks/useSound';
import { useHaptics } from '../../lib/hooks/useHaptics';
import type { Position } from '../../lib/game/types';
import { MILL_LINES } from '../../lib/game/constants';

const HEADER_HEIGHT = 56;
const INFO_HEIGHT = 72;
const BOTTOM_AREA_HEIGHT = 120;
const WRONG_FLASH_COLOR = '#C0392B';
const FLASH_DURATION_MS = 800;
const SHAKE_DURATION_MS = 300;

export default function PuzzleDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    currentPuzzle,
    puzzleState,
    solutionIndex,
    attempts,
    solved,
    hintUsed,
    loadPuzzle,
    attemptMove,
    getHint,
    resetPuzzle,
    selectStone,
    getStars,
    markDailySolved,
    dailyStreak,
  } = usePuzzleStore();
  const { playPuzzleSolved } = useSound();
  const { success, error: hapticError } = useHaptics();

  const [hintFromState, setHintFrom] = React.useState<Position | null>(null);
  const [hintToState, setHintTo] = React.useState<Position | null>(null);
  const dailyMarkedRef = React.useRef(false);

  const attemptFlash = useSharedValue(0);
  const attemptShake = useSharedValue(0);
  const solvedBannerOffset = useSharedValue(50);
  const solvedBannerOpacity = useSharedValue(0);

  useEffect(() => {
    if (solved) {
      solvedBannerOffset.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) });
      solvedBannerOpacity.value = withTiming(1, { duration: 300 });
    } else {
      solvedBannerOffset.value = 50;
      solvedBannerOpacity.value = 0;
    }
  }, [solved, solvedBannerOffset, solvedBannerOpacity]);

  const solvedBannerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: solvedBannerOffset.value }],
    opacity: solvedBannerOpacity.value,
  }));

  useEffect(() => {
    if (id) loadPuzzle(id);
    dailyMarkedRef.current = false;
  }, [id, loadPuzzle]);

  useEffect(() => {
    setHintFrom(null);
    setHintTo(null);
  }, [solutionIndex]);

  const recordPuzzle = useStatsStore((s) => s.recordPuzzle);
  const isDaily = currentPuzzle?.id === getDailyPuzzle().id;
  const puzzleRecordedRef = useRef(false);
  useEffect(() => {
    if (solved && isDaily && !dailyMarkedRef.current) {
      dailyMarkedRef.current = true;
      markDailySolved(attempts + 1, hintUsed);
    }
  }, [solved, isDaily, attempts, hintUsed, markDailySolved]);
  useEffect(() => {
    puzzleRecordedRef.current = false;
  }, [id]);
  useEffect(() => {
    if (solved) {
      playPuzzleSolved();
      success();
    }
  }, [solved, playPuzzleSolved, success]);
  useEffect(() => {
    if (!solved || !id) return;
    if (puzzleRecordedRef.current) return;
    puzzleRecordedRef.current = true;
    const stars = getStars(id);
    recordPuzzle({
      solved: true,
      stars: (stars === 0 ? 1 : stars) as 1 | 2 | 3,
      isDaily,
    });
  }, [solved, id, isDaily, getStars, recordPuzzle]);

  const validMoves = useMemo(() => {
    if (!puzzleState || solved) return [];
    return getValidMoves(puzzleState);
  }, [puzzleState, solved]);

  const removablePositions = useMemo(() => {
    if (!puzzleState?.mustRemove) return [];
    return getRemovableStones(puzzleState);
  }, [puzzleState?.mustRemove, puzzleState]);
  const handleHintPressReal = useCallback(() => {
    const result = getHint();
    if (result) {
      setHintFrom((prev) => result.from ?? prev);
      setHintTo((prev) => result.to ?? prev);
    }
  }, [getHint]);

  const triggerWrongFeedback = useCallback(() => {
    hapticError();
    attemptFlash.value = withTiming(1, { duration: 50 }, () => {
      attemptFlash.value = withTiming(0, { duration: FLASH_DURATION_MS, easing: Easing.out(Easing.ease) });
    });
    attemptShake.value = withSequence(
      withTiming(1, { duration: SHAKE_DURATION_MS / 2 }),
      withTiming(0, { duration: SHAKE_DURATION_MS / 2 })
    );
  }, [hapticError, attemptFlash, attemptShake]);

  const onPositionPress = useCallback(
    (position: Position) => {
      if (!puzzleState || solved) return;
      const state = puzzleState;
      if (state.mustRemove) {
        const move = buildMoveFromState(state, position);
        const result = attemptMove(move);
        if (result === 'wrong') triggerWrongFeedback();
        return;
      }
      if (state.phase === 'placing') {
        const move = buildMoveFromState(state, position);
        const result = attemptMove(move);
        if (result === 'wrong') triggerWrongFeedback();
        return;
      }
      if (state.phase === 'moving' || state.phase === 'flying') {
        const myStones = getPlayerStones(state.board, state.currentPlayer);
        if (state.selectedStone === null) {
          if (myStones.includes(position)) selectStone(position);
          return;
        }
        // Selected stone is set: allow deselect or switch selection before validating move.
        if (position === state.selectedStone) {
          selectStone(null);
          return;
        }
        if (myStones.includes(position)) {
          selectStone(position);
          return;
        }
        if (validMoves.includes(position)) {
          const move = buildMoveFromState(state, position);
          const result = attemptMove(move);
          if (result === 'wrong') triggerWrongFeedback();
        }
        // Invalid target: keep selection active (no state change).
      }
    },
    [puzzleState, solved, validMoves, attemptMove, selectStone, triggerWrongFeedback]
  );

  const starCount = useMemo(() => (solved && id ? getStars(id) : 0), [solved, id, getStars]);
  const STAR_GOLD = '#C9A84C';

  const boardSize = useMemo(() => {
    const top = HEADER_HEIGHT + INFO_HEIGHT + (insets.top ?? 0);
    const bottom = BOTTOM_AREA_HEIGHT + (insets.bottom ?? 0);
    const availableHeight = screenHeight - top - bottom;
    const byWidth = screenWidth - 32;
    return Math.min(byWidth, Math.floor(Math.max(200, availableHeight - 24)));
  }, [screenWidth, screenHeight, insets.top, insets.bottom]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleReset = useCallback(() => {
    resetPuzzle();
    setHintFrom(null);
    setHintTo(null);
  }, [resetPuzzle]);

  const handleNext = useCallback(() => {
    if (!id) return;
    const idx = ALL_PUZZLES.findIndex((p) => p.id === id);
    if (idx >= 0 && idx < ALL_PUZZLES.length - 1) {
      const nextId = ALL_PUZZLES[idx + 1].id;
      router.replace(`/puzzle/${nextId}`);
      loadPuzzle(nextId);
    } else {
      router.back();
    }
  }, [id, router, loadPuzzle]);


  if (!id || !currentPuzzle) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.fontColor }}>{t('puzzle.notFound')}</Text>
      </View>
    );
  }

  const gameState = puzzleState ?? puzzleDefinitionToGameState(currentPuzzle);
  const diffLabel = t(`puzzleDifficulty.${String(currentPuzzle.difficulty)}`);
  const millLineToHighlight = useMemo((): [Position, Position, Position] | null => {
    if (!gameState.lastMove?.formedMill || gameState.lastMove.to === undefined) return null;
    const to = gameState.lastMove.to;
    const player = gameState.currentPlayer === 1 ? 2 : 1;
    const line = MILL_LINES.find(
      (l) => l.includes(to) && l.every((p) => gameState.board[p] === player)
    );
    return line ?? null;
  }, [gameState.lastMove, gameState.board, gameState.currentPlayer]);

  const currentPlayer = gameState.currentPlayer;
  const turnColor = currentPlayer === 1 ? theme.colors.player1Stone : theme.colors.player2Stone;
  const turnLabel = currentPlayer === 1 ? t('puzzle.colorBlack') : t('puzzle.colorWhite');
  const phaseKey = gameState.mustRemove
    ? 'removing'
    : (gameState.phase === 'placing' ? 'placing' : gameState.phase === 'moving' ? 'moving' : 'flying');
  const turnSentence =
    phaseKey === 'removing'
      ? t('puzzle.turnRemoving', { color: turnLabel })
      : phaseKey === 'placing'
        ? t('puzzle.turnPlacing', { color: turnLabel })
        : phaseKey === 'moving'
          ? t('puzzle.turnMoving', { color: turnLabel })
          : t('puzzle.turnFlying', { color: turnLabel });
  const normalTextColor = theme.fontColorSecondary;

  const attemptAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const flash = attemptFlash.value;
    const shake = attemptShake.value;
    const color = flash > 0 ? WRONG_FLASH_COLOR : normalTextColor;
    const translateX = interpolate(shake, [0, 0.25, 0.5, 0.75, 1], [0, 3, -3, 3, 0]);
    return {
      color,
      transform: [{ translateX }],
    };
  }, [normalTextColor]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.borderColor }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleBack}
          accessibilityLabel={t('common.back')}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.fontColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.fontColor }]} numberOfLines={1}>
          {t(`puzzle.titles.${currentPuzzle.id}` as const) !== `puzzle.titles.${currentPuzzle.id}` ? t(`puzzle.titles.${currentPuzzle.id}` as const) : currentPuzzle.title}
        </Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleHintPressReal}
          disabled={solved}
          accessibilityLabel={t('puzzle.hint')}
        >
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={24}
            color={solved ? theme.fontColorSecondary : theme.colors.accent}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: (insets.bottom ?? 0) + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Info: 2 lines – task + difficulty, then turn sentence */}
        <View style={styles.infoBlock}>
          <View style={styles.infoRow1}>
            <Text style={[styles.taskDescWrap, { color: theme.fontColor }]} numberOfLines={2}>
              <Text style={styles.taskPrefix}>{t('puzzle.taskPrefix')} </Text>
              <Text style={styles.taskDesc}>
                {t(`puzzle.descriptions.${currentPuzzle.id}` as const) !== `puzzle.descriptions.${currentPuzzle.id}` ? t(`puzzle.descriptions.${currentPuzzle.id}` as const) : currentPuzzle.description}
              </Text>
            </Text>
            <View style={[styles.diffPill, { backgroundColor: theme.colors.accent + '22', borderColor: theme.colors.accent }]}>
              <Text style={[styles.diffPillText, { color: theme.colors.accent }]}>{diffLabel}</Text>
            </View>
          </View>
          {!solved && (
            <View style={styles.turnRow}>
              <View style={[styles.turnDot, { backgroundColor: turnColor, borderWidth: turnColor === theme.colors.player2Stone ? 1 : 0, borderColor: theme.borderColor }]} />
              <Text style={[styles.turnPhase, { color: theme.fontColorSecondary }]}>
                {turnSentence}
              </Text>
            </View>
          )}
        </View>

        {/* Board: max size */}
        <View style={styles.boardWrap}>
          <Board
            gameState={gameState}
            validMoves={validMoves}
            onPositionPress={onPositionPress}
            theme={theme}
            removablePositions={removablePositions}
            millLineToHighlight={millLineToHighlight}
            hintFrom={hintFromState}
            hintTo={hintToState}
            puzzleMode
            boardSizeOverride={boardSize}
          />
        </View>

        {/* Bottom: attempt + stars, then buttons */}
        <View style={[styles.bottomBar, { borderTopColor: theme.borderColor }]}>
          {!solved ? (
            <>
              <View style={styles.attemptRow}>
                <Animated.Text style={[styles.infoText, attemptAnimatedStyle]}>
                  {t('puzzle.attemptShort', { current: attempts + 1 })}
                </Animated.Text>
                <View style={styles.starRow}>
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.starIcon}>
                      <MaterialCommunityIcons
                        name="star-outline"
                        size={20}
                        color={theme.fontColorSecondary}
                      />
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.actionsRow}>
                <PressableScale
                  style={[styles.btnOutlineAction, { borderColor: theme.borderColor, flex: 1 }]}
                  onPress={handleReset}
                  scaleTo={0.97}
                >
                  <Text style={[styles.btnOutlineActionText, { color: theme.fontColor }]}>🔄 {t('puzzle.reset')}</Text>
                </PressableScale>
                <PressableScale
                  style={[styles.btnOutlineAction, { borderColor: theme.borderColor, flex: 1 }]}
                  onPress={handleNext}
                  scaleTo={0.97}
                >
                  <Text style={[styles.btnOutlineActionText, { color: theme.fontColor }]}>{t('puzzle.skip')} →</Text>
                </PressableScale>
              </View>
            </>
          ) : (
            <>
              <Animated.View style={[styles.solvedLine, solvedBannerAnimatedStyle]}>
                <Text style={[styles.starChars, { color: STAR_GOLD }]}>
                  {'★'.repeat(starCount)}{'☆'.repeat(3 - starCount)}
                </Text>
                <Text style={[styles.solvedLineText, { color: theme.fontColor }]}>
                  {t(starCount >= 3 ? 'puzzle.solved3' : starCount === 2 ? 'puzzle.solved2' : 'puzzle.solved1')}
                </Text>
              </Animated.View>
              <View style={styles.actionsRowSolved}>
                <PressableScale
                  style={[styles.btnOutlineAction, { borderColor: theme.borderColor, flex: 1 }]}
                  onPress={handleReset}
                  scaleTo={0.97}
                >
                  <Text style={[styles.btnOutlineActionText, { color: theme.fontColor }]}>{t('puzzle.retry')}</Text>
                </PressableScale>
                <PressableScale
                  style={[styles.btnPrimary, { backgroundColor: theme.colors.accent, flex: 2 }]}
                  onPress={handleNext}
                  scaleTo={0.97}
                >
                  <Text style={[styles.btnPrimaryText, { color: theme.id === 'holz' || theme.id === 'minimal' ? '#FFF' : theme.colors.background }]}>
                    {t('puzzle.next')} →
                  </Text>
                </PressableScale>
              </View>
              {isDaily && (
                <TouchableOpacity
                  style={[styles.shareBtn, { borderColor: theme.borderColor }]}
                  onPress={() => {
                    const stars = id ? getStars(id) : 0;
                    const attemptLabel = t(attempts === 0 ? 'puzzle.shareAttemptOne' : 'puzzle.shareAttemptMany');
                    const msg = t('puzzle.shareDailyMessage', {
                      number: getDailyPuzzleNumber(),
                      starsLine: '⭐'.repeat(stars) + '☆'.repeat(3 - stars),
                      attempts: attempts + 1,
                      attemptLabel,
                      streak: dailyStreak,
                    });
                    const shareTitle = t('puzzle.shareDailyTitle');
                    Share.share(
                      Platform.OS === 'ios'
                        ? { message: msg }
                        : { message: msg, title: shareTitle }
                    );
                  }}
                >
                  <Text style={[styles.shareBtnText, { color: theme.fontColor }]}>{t('common.share')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  infoBlock: {
    marginBottom: 8,
  },
  infoRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  taskDescWrap: {
    flex: 1,
  },
  taskPrefix: {
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
  },
  taskDesc: {
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
  },
  diffPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  diffPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  turnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  turnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  turnPhase: {
    fontSize: 14,
    fontWeight: '400',
  },
  boardWrap: {
    alignSelf: 'center',
    marginVertical: 12,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
    gap: 12,
  },
  attemptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starIcon: {
    margin: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionsRowSolved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnOutlineAction: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnOutlineActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnOutline: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  solvedLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  starChars: {
    fontSize: 18,
  },
  solvedLineText: {
    fontSize: 17,
    fontWeight: '700',
  },
  btnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  shareBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'center',
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
