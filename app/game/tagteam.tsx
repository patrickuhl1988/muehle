/**
 * Tag Team game screen: two boards, 2v2, bonus stones.
 * Layout: both boards visible; dynamic board size; turn bar; scroll to active board.
 */

import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, useWindowDimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { cardShadow } from '../../lib/theme/cardStyles';
import { useTagTeamStore, getTagTeamAIMoveDelay } from '../../lib/store/tagTeamStore';
import { useSettingsStore } from '../../lib/store/settingsStore';
import { useStatsStore } from '../../lib/store/statsStore';
import { Board } from '../../lib/components/Board';
import { GameActionBar } from '../../lib/components/GameActionBar';
import { getValidMoves, getRemovableStones, getValidBonusPlacements, checkGameOver } from '../../lib/game/engine';
import { getCoachTip } from '../../lib/game/coach';
import { getGameOverReason } from '../../lib/utils/gameMessages';
import type { Position } from '../../lib/game/types';
import type { BoardId, TagTeamConfig } from '../../lib/game/tagTeamTypes';
import type { CoachTip } from '../../lib/game/coach';

const HEADER_HEIGHT = 56;
const TURN_BAR_HEIGHT = 44;
const ACTION_BAR_HEIGHT = 40;
const SECTION_PADDING = 12;
const LABEL_HEIGHT = 32;
const MIN_BOARD_SIZE = 200;
const FALLBACK_BOARD_SIZE = 240;

function getActiveFromTurn(turnOrder: number, config?: TagTeamConfig): { board: BoardId; team: 1 | 2; isHuman: boolean } {
  const board: BoardId = turnOrder % 2 === 0 ? 'A' : 'B';
  const team: 1 | 2 = turnOrder < 2 ? 1 : 2;
  const isHuman = turnOrder === 0 || (turnOrder === 3 && config?.team1?.boardBPartner === 'human');
  return { board, team, isHuman };
}

export default function TagTeamScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const undoEnabled = useSettingsStore((s) => s.undoEnabled);
  const coachEnabled = useSettingsStore((s) => s.coachEnabled);
  const recordTagTeamMatch = useStatsStore((s) => s.recordTagTeamMatch);
  const {
    boardA,
    boardB,
    config,
    bonusStones,
    turnOrder,
    mustPlaceBonus,
    gameOver,
    winningTeam,
    matchResult,
    boardAFinished,
    boardBFinished,
    fastFinishActive,
    roundsPlayed,
    teamCaptures,
    stateHistoryForUndo,
    undosUsedThisGame,
    handlePositionPress,
    handleBonusPlace,
    applyAIMove,
    startTagTeamGame,
    resetTagTeam,
    startFastFinish,
    undoTwoMoves,
  } = useTagTeamStore();

  const [coachTipVisible, setCoachTipVisible] = useState(false);
  const [coachTip, setCoachTip] = useState<CoachTip | null>(null);
  const [placingBonusMode, setPlacingBonusMode] = useState(false);
  const [bonusError, setBonusError] = useState<string | null>(null);
  const [bonusEarnedToast, setBonusEarnedToast] = useState(false);
  const prevBonusCount = useRef(0);
  const tagTeamMatchRecorded = useRef(false);

  useEffect(() => {
    if (!gameOver) {
      tagTeamMatchRecorded.current = false;
      return;
    }
    if (matchResult && !tagTeamMatchRecorded.current) {
      tagTeamMatchRecorded.current = true;
      recordTagTeamMatch(matchResult);
    }
  }, [gameOver, matchResult, recordTagTeamMatch]);

  const { board: activeBoard, team: activeTeam, isHuman } = getActiveFromTurn(turnOrder, config);
  const aiScheduled = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const boardAY = useRef(0);
  const boardBY = useRef(0);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const { boardSize, useScroll } = useMemo(() => {
    const top = HEADER_HEIGHT + TURN_BAR_HEIGHT + 8 + ACTION_BAR_HEIGHT + 8 + SECTION_PADDING + insets.top;
    const bottom = insets.bottom + 80;
    const availableHeight = screenHeight - top - bottom;
    const half = availableHeight / 2;
    const maxBoardArea = half * 0.9;
    const byWidth = screenWidth - SECTION_PADDING * 4 - 16;
    const size = Math.min(byWidth, Math.floor(maxBoardArea - LABEL_HEIGHT - SECTION_PADDING * 2));
    if (size >= MIN_BOARD_SIZE) {
      return { boardSize: size, useScroll: false };
    }
    return { boardSize: FALLBACK_BOARD_SIZE, useScroll: true };
  }, [screenHeight, screenWidth, insets.top, insets.bottom]);

  useEffect(() => {
    if (!scrollRef.current || !useScroll) return;
    const y = activeBoard === 'A' ? boardAY.current : boardBY.current;
    scrollRef.current.scrollTo({ y: Math.max(0, y - 20), animated: true });
  }, [activeBoard, turnOrder, useScroll]);

  useEffect(() => {
    if (turnOrder !== 0) setPlacingBonusMode(false);
  }, [turnOrder]);

  useEffect(() => {
    const myBonus = bonusStones.boardA.player.totalGenerated;
    if (myBonus > prevBonusCount.current && turnOrder === 0) {
      prevBonusCount.current = myBonus;
      setBonusEarnedToast(true);
      const id = setTimeout(() => setBonusEarnedToast(false), 2500);
      return () => clearTimeout(id);
    }
    prevBonusCount.current = myBonus;
  }, [bonusStones.boardA.player.totalGenerated, turnOrder]);

  useEffect(() => {
    if (gameOver || isHuman) {
      aiScheduled.current = false;
      return;
    }
    if (aiScheduled.current) return;
    aiScheduled.current = true;
    const delay = getTagTeamAIMoveDelay(turnOrder, config, fastFinishActive);
    const id = setTimeout(() => {
      applyAIMove();
      aiScheduled.current = false;
    }, delay);
    return () => clearTimeout(id);
  }, [gameOver, isHuman, turnOrder, config, applyAIMove, fastFinishActive]);


  const stateForBonusA = useMemo(() => ({
    ...boardA,
    phase: 'placing' as const,
    stonesInHand: {
      ...boardA.stonesInHand,
      [boardA.currentPlayer]: boardA.stonesInHand[boardA.currentPlayer] + 1,
    },
  }), [boardA]);

  const validMovesA = useMemo(() => {
    if (activeBoard !== 'A' || !isHuman || gameOver) return [];
    const canPlaceBonus = (boardA.phase === 'moving' || boardA.phase === 'flying') && bonusStones.boardA.player.available > 0;
    if (placingBonusMode && canPlaceBonus) return getValidBonusPlacements(stateForBonusA);
    if (mustPlaceBonus === 'A' && canPlaceBonus) return getValidBonusPlacements(stateForBonusA);
    if (boardA.mustRemove) return getRemovableStones(boardA);
    return getValidMoves(boardA);
  }, [activeBoard, isHuman, gameOver, mustPlaceBonus, boardA, placingBonusMode, bonusStones.boardA.player.available, stateForBonusA]);

  const validMovesB = useMemo(() => {
    if (activeBoard !== 'B' || !isHuman || gameOver) return [];
    const needBonusPlaceB = mustPlaceBonus === 'B' || (placingBonusMode && bonusStones.boardB.player.available > 0 && (boardB.phase === 'moving' || boardB.phase === 'flying'));
    if (needBonusPlaceB) {
      const stateForBonus = {
        ...boardB,
        phase: 'placing' as const,
        stonesInHand: {
          ...boardB.stonesInHand,
          [boardB.currentPlayer]: boardB.stonesInHand[boardB.currentPlayer] + 1,
        },
      };
      return getValidBonusPlacements(stateForBonus);
    }
    if (boardB.mustRemove) return getRemovableStones(boardB);
    return getValidMoves(boardB);
  }, [activeBoard, isHuman, gameOver, mustPlaceBonus, placingBonusMode, boardB, bonusStones.boardB.player.available]);

  /** Short phase labels for compact board header (Setzen / Ziehen / Springen). */
  const getPhaseLabel = useCallback((board: BoardId) => {
    const state = board === 'A' ? boardA : boardB;
    if (state.mustRemove) return t('game.phaseRemovingShort');
    if (state.phase === 'placing') return t('game.phasePlacingShort');
    if (state.phase === 'moving') return t('game.phaseMovingShort');
    if (state.phase === 'flying') return t('game.phaseFlyingShort');
    return '';
  }, [boardA, boardB, t]);

  const statusMessage = useMemo(() => {
    if (gameOver) return matchResult === 'win' ? t('tagTeam.teamWins') : matchResult === 'draw' ? t('tagTeam.teamDraw') : t('tagTeam.teamLoss');
    if (fastFinishActive) return t('tagTeam.finishingMatch');
    if (mustPlaceBonus === 'B' && config.team1.boardBPartner !== 'human') return t('tagTeam.partnerTurnBoardB');
    if (turnOrder === 0 && bonusStones.boardA.player.available > 0 && (boardA.phase === 'moving' || boardA.phase === 'flying')) {
      return t('tagTeam.bonusMoveOrPlace');
    }
    if (turnOrder === 3 && config.team1.boardBPartner === 'human' && bonusStones.boardB.player.available > 0 && (boardB.phase === 'moving' || boardB.phase === 'flying')) {
      return t('tagTeam.bonusMoveOrPlace');
    }
    const phaseLabel = getPhaseLabel(activeBoard);
    const phaseSuffix = phaseLabel ? ` · ${phaseLabel}` : '';
    if (turnOrder === 0) return `${t('tagTeam.yourTurnBoardA')}${phaseSuffix}`;
    if (turnOrder === 3 && config.team1.boardBPartner === 'human') return `${t('tagTeam.yourTurnBoardB')}${phaseSuffix}`;
    if (turnOrder === 1) return t('tagTeam.opponentTurnBoardB');
    if (turnOrder === 2) return t('tagTeam.opponentTurnBoardA');
    return t('tagTeam.partnerTurnBoardB');
  }, [gameOver, winningTeam, fastFinishActive, mustPlaceBonus, turnOrder, activeBoard, config.team1.boardBPartner, getPhaseLabel, t, bonusStones.boardA.player.available, boardA.phase]);

  const showFastFinishButton = boardAFinished && !boardBFinished && !gameOver && !fastFinishActive;

  const turnBarText = useMemo(() => {
    if (gameOver) return statusMessage;
    const phaseLabel = getPhaseLabel(activeBoard);
    const phaseSuffix = phaseLabel ? ` · ${phaseLabel}` : '';
    if (turnOrder === 0) return `${t('tagTeam.turnBarYour', { board: 'A' })}${phaseSuffix}`;
    if (turnOrder === 3 && config.team1.boardBPartner === 'human') return `${t('tagTeam.turnBarYour', { board: 'B' })}${phaseSuffix}`;
    if (turnOrder === 1) return t('tagTeam.turnBarAi', { board: 'B' });
    if (turnOrder === 2) return t('tagTeam.turnBarAi', { board: 'A' });
    return t('tagTeam.turnBarAi', { board: 'B' });
  }, [gameOver, turnOrder, statusMessage, activeBoard, config.team1.boardBPartner, getPhaseLabel, t]);

  /** Human player stone color on the active board: A = black (1), B = white (2). Used for turn indicator. */
  const turnIndicatorStone = useMemo(() => {
    if (!isHuman || gameOver) return null;
    return activeBoard === 'A' ? 'black' : 'white';
  }, [isHuman, gameOver, activeBoard]);

  const canUndo = Boolean(
    undoEnabled && isHuman && !gameOver && !boardAFinished &&
    (stateHistoryForUndo?.length ?? 0) >= 1 && (undosUsedThisGame ?? 0) < 2
  );

  const handleCoachTap = useCallback(() => {
    if (!coachEnabled || !isHuman || gameOver) return;
    if (activeBoard === 'A') {
      const tip = getCoachTip(boardA, 1);
      setCoachTip(tip);
      setCoachTipVisible(true);
    } else if (activeBoard === 'B' && config.team1.boardBPartner === 'human') {
      const tip = getCoachTip(boardB, 2);
      setCoachTip(tip);
      setCoachTipVisible(true);
    }
  }, [coachEnabled, isHuman, activeBoard, gameOver, boardA, boardB, config.team1.boardBPartner]);

  const onPressA = (pos: Position) => {
    if (activeBoard !== 'A' || !isHuman) return;
    if (placingBonusMode) {
      const ok = handleBonusPlace('A', pos);
      if (!ok) {
        setBonusError(t('tagTeam.bonusNoMill'));
        setTimeout(() => setBonusError(null), 3000);
      } else {
        setPlacingBonusMode(false);
      }
      return;
    }
    handlePositionPress('A', pos);
  };
  const onPressB = (pos: Position) => {
    if (activeBoard === 'B' && isHuman) handlePositionPress('B', pos);
  };

  const handleQuitConfirm = () => {
    resetTagTeam();
    router.back();
  };

  const handleBack = () => {
    Alert.alert(
      t('tagTeam.quitConfirm'),
      t('tagTeam.quitMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('tagTeam.quit'), onPress: handleQuitConfirm },
      ]
    );
  };

  const showTipInBar = Boolean(coachEnabled && isHuman && !gameOver && (activeBoard === 'A' || (activeBoard === 'B' && config.team1.boardBPartner === 'human')));

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
      backgroundColor: theme.cardBackground,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.fontColor,
    },
    turnBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: TURN_BAR_HEIGHT,
      paddingHorizontal: 16,
      backgroundColor: theme.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    turnBarIcon: { fontSize: 18 },
    turnBarIconBlack: { fontSize: 18, color: '#1a1a1a' },
    turnBarStoneWhite: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#fff',
      borderWidth: 1.5,
      borderColor: theme.fontColor,
    },
    turnBarText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.fontColor,
    },
    actionBarButtonDisabled: {
      opacity: 0.3,
    },
    bonusEarnedToast: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginHorizontal: 16,
      marginTop: 4,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
    },
    bonusEarnedToastText: {
      fontSize: 13,
      fontWeight: '600',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: SECTION_PADDING,
      paddingBottom: 24 + (insets.bottom ?? 0),
    },
    boardSection: {
      padding: SECTION_PADDING,
      marginVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      ...cardShadow,
      borderWidth: 0,
    },
    boardSectionActive: {
      opacity: 1,
      shadowColor: theme.colors.accent,
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    boardSectionInactive: {
      opacity: 0.85,
    },
    boardWrapper: {
      alignItems: 'center',
      position: 'relative',
    },
    boardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    boardHeaderText: {
      flex: 1,
    },
    boardLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.fontColor,
    },
    bonusLine: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
      color: theme.fontColor,
    },
    bonusLineMuted: {
      opacity: 0.6,
    },
    hintText: {
      fontSize: 12,
      marginBottom: 6,
      textAlign: 'center',
    },
    bonusChoiceRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 6,
    },
    bonusChoiceBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    bonusChoiceBtnActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent + '15',
    },
    bonusChoiceBtnText: {
      fontSize: 13,
      fontWeight: '600',
    },
    bonusError: {
      fontSize: 12,
      textAlign: 'center',
      marginBottom: 6,
    },
    bonusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    bonusIcon: { fontSize: 14 },
    bonusCount: { fontSize: 13, fontWeight: '600', color: theme.fontColor },
    status: {
      padding: 12,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.borderColor,
      backgroundColor: theme.cardBackground,
    },
    statusText: {
      fontSize: 14,
      color: theme.fontColor,
      textAlign: 'center',
    },
    gameOverOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      zIndex: 100,
    },
    gameOverCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 320,
      alignItems: 'center',
    },
    gameOverTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.fontColor,
      marginBottom: 16,
      textAlign: 'center',
    },
    gameOverStats: {
      fontSize: 14,
      color: theme.fontColorSecondary,
      marginBottom: 8,
    },
    gameOverBtn: {
      marginTop: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.accent,
      minWidth: 160,
      alignItems: 'center',
    },
    gameOverBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.id === 'holz' || theme.id === 'minimal' ? '#FFF' : theme.colors.background,
    },
    coachCta: {
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.accent + '20',
    },
    coachCtaText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    boardOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: 12,
    },
    boardOverlayTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.fontColor,
      marginBottom: 4,
      textAlign: 'center',
    },
    boardOverlayReason: {
      fontSize: 13,
      color: theme.fontColorSecondary,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
  });

  const content = (
    <>
      <View
        style={[
          styles.boardSection,
          activeBoard === 'A' ? styles.boardSectionActive : styles.boardSectionInactive,
          config.team1.boardBPartner === 'human' && isHuman && activeBoard === 'B' && { opacity: 0.5 },
        ]}
        onLayout={(e) => { boardAY.current = e.nativeEvent.layout.y; }}
      >
        <View style={styles.boardHeader}>
          <View style={styles.boardHeaderText}>
            <Text style={styles.boardLabel} numberOfLines={1}>
              {t('play.boardA').toUpperCase()}
              {boardAFinished ? ` · ${t('tagTeam.boardFinished')}` : ` · ${t('tagTeam.boardAYourGame')} · ${getPhaseLabel('A')}`}
            </Text>
            <Text style={[styles.bonusLine, (bonusStones.boardA.player.available === 0 && bonusStones.boardA.opponent.available === 0) && styles.bonusLineMuted]} numberOfLines={1}>
              🎁 {t('tagTeam.yourBonus', { available: bonusStones.boardA.player.available })}
              {'   '}
              👿 {t('tagTeam.opponentBonus', { available: bonusStones.boardA.opponent.available })}
            </Text>
          </View>
        </View>
        {activeBoard === 'A' && isHuman && !boardAFinished && (boardA.phase === 'moving' || boardA.phase === 'flying') && bonusStones.boardA.player.available > 0 && (
          <View style={styles.bonusChoiceRow}>
            <TouchableOpacity
              style={[styles.bonusChoiceBtn, !placingBonusMode && styles.bonusChoiceBtnActive]}
              onPress={() => setPlacingBonusMode(false)}
            >
              <Text style={[styles.bonusChoiceBtnText, { color: !placingBonusMode ? theme.colors.accent : theme.fontColorSecondary }]}>
                {t('tagTeam.normalMove')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bonusChoiceBtn, placingBonusMode && styles.bonusChoiceBtnActive]}
              onPress={() => setPlacingBonusMode(true)}
            >
              <Text style={[styles.bonusChoiceBtnText, { color: placingBonusMode ? theme.colors.accent : theme.fontColorSecondary }]}>
                {t('tagTeam.placeBonus')} ({bonusStones.boardA.player.available})
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {bonusError != null && (
          <Text style={[styles.bonusError, { color: theme.colors.error ?? '#c00' }]}>{bonusError}</Text>
        )}
        {activeBoard === 'A' && isHuman && !boardAFinished && (boardA.phase === 'placing' || boardA.phase === 'flying') && (
          <Text style={[styles.hintText, { color: theme.fontColorSecondary }]}>
            {boardA.phase === 'placing' ? t('tagTeam.hintPlace') : t('tagTeam.hintFly')}
          </Text>
        )}
        <View style={styles.boardWrapper}>
          <View style={boardAFinished ? { opacity: 0.5 } : undefined}>
            <Board
              gameState={boardA}
              validMoves={boardAFinished ? [] : validMovesA}
              onPositionPress={boardAFinished ? () => {} : onPressA}
              theme={theme}
              humanPlayer={1}
              boardSizeOverride={boardSize}
              compact
              coachTip={coachEnabled && isHuman && activeBoard === 'A' ? coachTip : undefined}
            />
          </View>
          {boardAFinished && (() => {
            const r = checkGameOver(boardA);
            const winner = r.winner;
            const reason = r.gameOver && winner != null ? getGameOverReason({ ...boardA, gameOver: true, winner }, t) : undefined;
            const winnerLabel = winner === 1 ? t('tagTeam.blackWins') : t('tagTeam.whiteWins');
            return (
              <View style={styles.boardOverlay} pointerEvents="none">
                <Text style={styles.boardOverlayTitle}>{winnerLabel}</Text>
                {reason != null && <Text style={styles.boardOverlayReason}>{reason}</Text>}
              </View>
            );
          })()}
        </View>
      </View>

      <View
        style={[
          styles.boardSection,
          activeBoard === 'B' ? styles.boardSectionActive : styles.boardSectionInactive,
          config.team1.boardBPartner === 'human' && isHuman && activeBoard === 'A' && { opacity: 0.5 },
        ]}
        onLayout={(e) => { boardBY.current = e.nativeEvent.layout.y; }}
      >
        <View style={styles.boardHeader}>
          <View style={styles.boardHeaderText}>
            <Text style={styles.boardLabel} numberOfLines={1}>
              {t('play.boardB').toUpperCase()}
              {boardBFinished ? ` · ${t('tagTeam.boardFinished')}` : ` · ${config.team1.boardBPartner === 'human' ? t('tagTeam.boardBYourGame') : t('tagTeam.boardBPartner')} · ${getPhaseLabel('B')}`}
            </Text>
            <Text style={[styles.bonusLine, (bonusStones.boardB.player.available === 0 && bonusStones.boardB.opponent.available === 0) && styles.bonusLineMuted]} numberOfLines={1}>
              🎁 {t('tagTeam.yourBonus', { available: bonusStones.boardB.player.available })}
              {'   '}
              👿 {t('tagTeam.opponentBonus', { available: bonusStones.boardB.opponent.available })}
            </Text>
          </View>
        </View>
        {activeBoard === 'B' && isHuman && !boardBFinished && (boardB.phase === 'moving' || boardB.phase === 'flying') && bonusStones.boardB.player.available > 0 && config.team1.boardBPartner === 'human' && (
          <View style={styles.bonusChoiceRow}>
            <TouchableOpacity
              style={[styles.bonusChoiceBtn, !placingBonusMode && styles.bonusChoiceBtnActive]}
              onPress={() => setPlacingBonusMode(false)}
            >
              <Text style={[styles.bonusChoiceBtnText, { color: !placingBonusMode ? theme.colors.accent : theme.fontColorSecondary }]}>
                {t('tagTeam.normalMove')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bonusChoiceBtn, placingBonusMode && styles.bonusChoiceBtnActive]}
              onPress={() => setPlacingBonusMode(true)}
            >
              <Text style={[styles.bonusChoiceBtnText, { color: placingBonusMode ? theme.colors.accent : theme.fontColorSecondary }]}>
                {t('tagTeam.placeBonus')} ({bonusStones.boardB.player.available})
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {activeBoard === 'B' && isHuman && !boardBFinished && (boardB.phase === 'placing' || boardB.phase === 'flying') && config.team1.boardBPartner === 'human' && (
          <Text style={[styles.hintText, { color: theme.fontColorSecondary }]}>
            {boardB.phase === 'placing' ? t('tagTeam.hintPlace') : t('tagTeam.hintFly')}
          </Text>
        )}
        <View style={styles.boardWrapper}>
          <View style={boardBFinished ? { opacity: 0.5 } : undefined}>
            <Board
              gameState={boardB}
              validMoves={boardBFinished ? [] : validMovesB}
              onPositionPress={boardBFinished ? () => {} : onPressB}
              theme={theme}
              humanPlayer={2}
              boardSizeOverride={boardSize}
              compact
              coachTip={coachEnabled && isHuman && activeBoard === 'B' ? coachTip : undefined}
            />
          </View>
          {boardBFinished && (() => {
            const r = checkGameOver(boardB);
            const winner = r.winner;
            const reason = r.gameOver && winner != null ? getGameOverReason({ ...boardB, gameOver: true, winner }, t) : undefined;
            const winnerLabel = winner === 1 ? t('tagTeam.blackWins') : t('tagTeam.whiteWins');
            return (
              <View style={styles.boardOverlay} pointerEvents="none">
                <Text style={styles.boardOverlayTitle}>{winnerLabel}</Text>
                {reason != null && <Text style={styles.boardOverlayReason}>{reason}</Text>}
              </View>
            );
          })()}
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={{ padding: 8, minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.fontColor} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('play.tagTeam')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.turnBar}>
        {!gameOver && (turnIndicatorStone === 'black' ? (
          <Text style={styles.turnBarIconBlack}>●</Text>
        ) : turnIndicatorStone === 'white' ? (
          <View style={styles.turnBarStoneWhite} />
        ) : (
          <Text style={styles.turnBarIcon}>⏳</Text>
        ))}
        <Text style={styles.turnBarText} numberOfLines={1}>{turnBarText}</Text>
      </View>

      <GameActionBar
        onUndo={undoTwoMoves}
        onHint={handleCoachTap}
        onQuit={handleBack}
        undoEnabled={undoEnabled}
        undoAvailable={canUndo}
        hintEnabled={showTipInBar}
        undoLabel={t('tagTeam.undo')}
        hintLabel={t('tagTeam.tip')}
        quitLabel={t('tagTeam.quit')}
        theme={theme}
      />

      {bonusEarnedToast && (
        <View style={[styles.bonusEarnedToast, { backgroundColor: theme.colors.accent + '22', borderColor: theme.colors.accent }]}>
          <Text style={[styles.bonusEarnedToastText, { color: theme.fontColor }]}>{t('tagTeam.bonusEarned')}</Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={useScroll}
      >
        {content}
      </ScrollView>

      <View style={styles.status}>
        <Text style={styles.statusText}>{statusMessage}</Text>
        {showFastFinishButton && (
          <TouchableOpacity
            style={[styles.gameOverBtn, { marginTop: 12 }]}
            onPress={startFastFinish}
            activeOpacity={0.8}
          >
            <Text style={styles.gameOverBtnText}>{t('tagTeam.finishMatchQuickly')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {gameOver && (
        <View style={styles.gameOverOverlay}>
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverTitle}>
              {matchResult === 'win' ? t('tagTeam.teamWins') : matchResult === 'draw' ? t('tagTeam.teamDraw') : t('tagTeam.teamLoss')}
            </Text>
            <Text style={styles.gameOverStats}>{t('tagTeam.matchResult')}</Text>
            <Text style={styles.gameOverStats}>
              {t('play.boardA')}: {boardA.isDraw ? t('game.draw') : checkGameOver(boardA).winner === config.team1.boardAPlayer ? `Du ${t('tagTeam.boardWon')}` : `Du ${t('tagTeam.boardLost')}`}
            </Text>
            <Text style={styles.gameOverStats}>
              {t('play.boardB')}: {boardB.isDraw
                ? t('game.draw')
                : checkGameOver(boardB).winner === config.team1.boardBPlayer
                  ? (config.team1.boardBPartner === 'human' ? `Du ${t('tagTeam.boardWon')}` : t('tagTeam.partnerWins') + ' ✓')
                  : (config.team1.boardBPartner === 'human' ? `Du ${t('tagTeam.boardLost')}` : t('tagTeam.partnerLoses') + ' ✗')}
            </Text>
            <Text style={styles.gameOverStats}>{t('tagTeam.teamCaptures')}: {teamCaptures[1]}</Text>
            <Text style={styles.gameOverStats}>{t('tagTeam.roundsPlayed')}: {roundsPlayed}</Text>
            <TouchableOpacity style={styles.gameOverBtn} onPress={() => startTagTeamGame(config)}>
              <Text style={styles.gameOverBtnText}>{t('game.newMatch')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.gameOverBtn, { marginTop: 8 }]} onPress={() => { resetTagTeam(); router.replace('/(tabs)/play'); }}>
              <Text style={styles.gameOverBtnText}>{t('game.backToMenu')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
