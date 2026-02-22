/**
 * Game screen: header, player info top/bottom, board, status message, result modal.
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, AppState, Alert, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../lib/store/gameStore';
import { useStatsStore } from '../../lib/store/statsStore';
import { useGame } from '../../lib/hooks/useGame';
import { useSound } from '../../lib/hooks/useSound';
import { useHaptics } from '../../lib/hooks/useHaptics';
import { useSettingsStore } from '../../lib/store/settingsStore';
import { Board } from '../../lib/components/Board';
import { PlayerInfo } from '../../lib/components/PlayerInfo';
import { GameActionBar } from '../../lib/components/GameActionBar';
import { GameOverScreen } from '../../lib/components/GameOverScreen';
import { Timer } from '../../lib/components/Timer';
import { useBlitzTimer } from '../../lib/hooks/useBlitzTimer';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { getValidMoves, getRemovableStones } from '../../lib/game/engine';
import { MILL_LINES } from '../../lib/game/constants';
import { useOnlineStore } from '../../lib/store/onlineStore';
import { getStatusMessage, getGameOverReason, getPhaseLabelForPlayer } from '../../lib/utils/gameMessages';
import { getCoachTip } from '../../lib/game/coach';
import { loadSavedGame, deleteSavedGame, persistGameStateSync, buildSavedGameFromStore } from '../../lib/utils/savedGame';
import type { Position } from '../../lib/game/types';
import type { CoachTip } from '../../lib/game/coach';

const TURN_BAR_HEIGHT = 44;
const PLAYER_INFO_HEIGHT = 80;

export default function GameScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mode: string; matchId?: string; restore?: string }>();
  const mode = params.mode ?? 'ai';
  const matchId = params.matchId;
  const restore = params.restore === 'true';
  const router = useRouter();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { gameState: localState, validMoves: localValidMoves, handlePositionPress: localHandlePositionPress, isGameOver: localGameOver, winner: localWinner, isDraw: localDraw } = useGame();
  const {
    resetGame,
    newGame,
    startGame,
    restoreGame,
    undoMove,
    undoTwoMoves,
    mode: gameMode,
    aiDifficulty,
    gameStartTime,
    history,
    stateHistory,
    undosUsedThisGame,
    timerConfig,
    timeLeftP1,
    timeLeftP2,
  } = useGameStore();
  const undoEnabled = useSettingsStore((s) => s.undoEnabled);
  const coachEnabled = useSettingsStore((s) => s.coachEnabled);
  const defaultAiDifficulty = useSettingsStore((s) => s.aiDifficulty);

  const [coachTipVisible, setCoachTipVisible] = React.useState(false);
  const [coachTip, setCoachTip] = React.useState<CoachTip | null>(null);

  const isOnline = mode === 'online';
  const { currentMatch, myPlayerNumber, loadMatch, makeMove: onlineMakeMove, unsubscribeFromMatch, resetOnline, completeMatchAndUpdateElo } = useOnlineStore();

  useEffect(() => {
    if (isOnline && matchId && (!currentMatch || currentMatch.id !== matchId)) {
      loadMatch(matchId);
    }
    return () => {
      if (isOnline) unsubscribeFromMatch();
    };
  }, [isOnline, matchId, currentMatch?.id, loadMatch, unsubscribeFromMatch]);

  useEffect(() => {
    if (mode !== 'ai' || !restore) return;
    let cancelled = false;
    loadSavedGame().then((saved) => {
      if (cancelled) return;
      if (saved) {
        restoreGame(saved);
      } else {
        startGame('ai', defaultAiDifficulty);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode, restore, restoreGame, startGame, defaultAiDifficulty]);

  useEffect(() => {
    return () => {
      const state = useGameStore.getState();
      const payload = buildSavedGameFromStore(state);
      if (payload) persistGameStateSync(payload);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      const state = useGameStore.getState();
      const payload = buildSavedGameFromStore(state);
      if (payload) persistGameStateSync(payload);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (mode !== 'ai') return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'background' && nextState !== 'inactive') return;
      const state = useGameStore.getState();
      const payload = buildSavedGameFromStore(state);
      if (payload) persistGameStateSync(payload);
    });
    return () => sub?.remove();
  }, [mode]);

  useEffect(() => {
    if (isOnline && currentMatch?.status === 'completed' && currentMatch.mode === 'ranked') {
      completeMatchAndUpdateElo(currentMatch.id);
    }
  }, [isOnline, currentMatch?.status, currentMatch?.mode, currentMatch?.id, completeMatchAndUpdateElo]);

  const gameState = isOnline ? (currentMatch?.game_state ?? null) : localState;
  const validMoves = useMemo(() => {
    if (isOnline && gameState) {
      if (gameState.gameOver) return [];
      if (gameState.currentPlayer !== myPlayerNumber) return [];
      if (gameState.mustRemove) return getRemovableStones(gameState);
      return getValidMoves(gameState);
    }
    return localValidMoves;
  }, [isOnline, gameState, myPlayerNumber, localValidMoves]);
  const isGameOver = isOnline ? (currentMatch?.status === 'completed' ?? gameState?.gameOver ?? false) : localGameOver;
  const winner = isOnline ? (currentMatch?.winner_id ? (currentMatch.winner_id === currentMatch.player1_id ? 1 : 2) : (gameState?.winner ?? null)) : localWinner;
  const isDraw = isOnline ? (currentMatch?.is_draw ?? gameState?.isDraw ?? false) : localDraw;

  const handlePositionPressRaw = isOnline
    ? (position: Position) => onlineMakeMove(position)
    : localHandlePositionPress;

  const dismissCoach = useCallback(() => {
    setCoachTipVisible(false);
    setCoachTip(null);
  }, []);

  const handlePositionPress = useCallback(
    (position: Position) => {
      dismissCoach();
      handlePositionPressRaw(position);
    },
    [dismissCoach, handlePositionPressRaw]
  );

  useBlitzTimer();
  const recordGame = useStatsStore((s) => s.recordGame);
  const checkAchievements = useStatsStore((s) => s.checkAchievements);
  const {
    playPlace,
    playSelect,
    playMove,
    playMill,
    playCapture,
    playWin,
    playLose,
    playDraw,
    playError,
    playTick,
    playGameStart,
    playTimerWarning,
    playAchievement,
    playButtonTap,
  } = useSound();
  const { light, medium, heavy, success, error: hapticError } = useHaptics();

  const recorded = useRef(false);
  const gameStartPlayed = useRef(false);
  const activeTimeLeftRef = useRef(0);
  const lastPlayedMoveCountRef = useRef(0);

  // Play sounds when AI (player 2) makes a move
  useEffect(() => {
    if (mode !== 'ai' || isOnline || !gameState || gameState.currentPlayer !== 1) return;
    const lastMove = gameState.lastMove;
    if (lastMove?.player !== 2) return;
    const moveCount = gameState.moveHistory?.length ?? 0;
    if (moveCount <= lastPlayedMoveCountRef.current) return;
    lastPlayedMoveCountRef.current = moveCount;
    if (lastMove.type === 'place') playPlace();
    else if (lastMove.type === 'move') playMove();
    else if (lastMove.type === 'remove') playCapture();
    if (lastMove.formedMill) playMill();
  }, [mode, isOnline, gameState?.lastMove, gameState?.moveHistory?.length, gameState?.currentPlayer, playPlace, playMove, playCapture, playMill]);

  useEffect(() => {
    if (!gameState || gameState.moveCount === 0) lastPlayedMoveCountRef.current = 0;
  }, [gameState?.moveCount]);

  useEffect(() => {
    if (!gameState || gameState.gameOver || gameState.moveCount > 0) return;
    if (gameStartPlayed.current) return;
    gameStartPlayed.current = true;
    playGameStart();
  }, [gameState?.moveCount, gameState?.gameOver, gameState, playGameStart]);
  useEffect(() => {
    if (gameState?.moveCount > 0) gameStartPlayed.current = false;
  }, [gameState?.moveCount]);
  const millsClosedP1 = useMemo(() => {
    if (!gameState?.moveHistory) return 0;
    return gameState.moveHistory.filter((m) => m.player === 1 && m.formedMill).length;
  }, [gameState?.moveHistory]);
  useEffect(() => {
    if (isOnline || !isGameOver || (winner === null && !isDraw)) return;
    if (recorded.current) return;
    recorded.current = true;
    const outcome = winner === 1 ? 'win' as const : winner === 2 ? 'loss' as const : 'draw' as const;
    const stonesLostP1 = gameState ? 9 - gameState.stonesOnBoard[1] : undefined;
    const opponentStonesAtEnd = gameState ? gameState.stonesOnBoard[2] : undefined;
    recordGame({
      outcome,
      millsClosed: millsClosedP1,
      moveCount: gameState?.moveCount,
      gameTimeSeconds: gameState?.gameOver && gameStartTime != null ? Math.floor((Date.now() - gameStartTime) / 1000) : undefined,
      stonesLost: outcome === 'win' ? stonesLostP1 : undefined,
      opponentStonesAtEnd: outcome === 'win' ? opponentStonesAtEnd : undefined,
      mode: gameMode ?? undefined,
      aiDifficulty: gameMode === 'ai' ? aiDifficulty : undefined,
    });
    const newlyUnlocked = checkAchievements();
    if (newlyUnlocked.length > 0) {
      playAchievement();
      success();
    }
  }, [isGameOver, winner, isDraw, recordGame, checkAchievements, playAchievement, success, gameState, gameMode, aiDifficulty, millsClosedP1, gameStartTime]);

  const onPositionPress = useCallback(
    async (position: Position) => {
      if (isOnline) {
        const result = await onlineMakeMove(position);
        if (result.handled) {
          playMove();
        } else if (result.error) {
          playError();
          hapticError();
        }
        return;
      }
      const result = localHandlePositionPress(position);
      if (result.handled && result.action === 'place') {
        playPlace();
        light();
        if (result.formedMill) {
          playMill();
          medium();
        }
      } else if (result.handled && result.action === 'move') {
        playMove();
        if (result.formedMill) {
          playMill();
          medium();
        }
      } else if (result.handled && result.action === 'remove') {
        playCapture();
        medium();
      } else if (result.handled && (result.action === 'select' || result.action === 'deselect')) {
        playSelect();
        light();
      } else if (result.error) {
        playError();
        hapticError();
      }
    },
    [
      isOnline,
      onlineMakeMove,
      localHandlePositionPress,
      playPlace,
      playSelect,
      playMove,
      playMill,
      playCapture,
      playError,
      light,
      medium,
      heavy,
      success,
      hapticError,
    ]
  );

  useEffect(() => {
    if (!isGameOver) return;
    if (winner === 1) {
      playWin();
      success();
    } else if (winner === 2) {
      playLose();
      medium();
    } else if (isDraw) {
      playDraw();
    }
  }, [isGameOver, winner, isDraw, playWin, playLose, playDraw, success, medium]);

  const currentPlayer = gameState?.currentPlayer ?? 0;
  const activeTimeLeft = currentPlayer === 1 ? timeLeftP1 : currentPlayer === 2 ? timeLeftP2 : 0;
  activeTimeLeftRef.current = activeTimeLeft;
  const tickIntervalMs = activeTimeLeft > 0 && activeTimeLeft <= 5 ? 500 : activeTimeLeft <= 10 ? 1000 : null;
  useEffect(() => {
    if (gameMode !== 'blitz' || !timerConfig || isGameOver || tickIntervalMs == null) return;
    const id = setInterval(() => {
      const t = activeTimeLeftRef.current;
      if (t <= 10 && t > 0) {
        playTimerWarning();
        light();
      } else {
        playTick();
      }
    }, tickIntervalMs);
    return () => clearInterval(id);
  }, [gameMode, timerConfig, isGameOver, tickIntervalMs, playTick, playTimerWarning, light]);

  const removablePositions = useMemo(() => {
    if (!gameState?.mustRemove) return [];
    return getRemovableStones(gameState);
  }, [gameState]);

  const lastPlacedPosition = useMemo(() => {
    const last = gameState?.lastMove;
    return last?.type === 'place' ? last.to : null;
  }, [gameState?.lastMove]);

  const millLineToHighlight = useMemo((): [Position, Position, Position] | null => {
    if (!gameState?.lastMove?.formedMill || gameState.lastMove.to === undefined) return null;
    const to = gameState.lastMove.to;
    const player = gameState.currentPlayer;
    const line = MILL_LINES.find(
      (l) => l.includes(to) && l.every((p) => gameState.board[p] === player)
    );
    return line ?? null;
  }, [gameState?.lastMove, gameState?.board, gameState?.currentPlayer]);

  const millsClosed = useMemo(() => {
    if (!gameState?.moveHistory) return 0;
    return gameState.moveHistory.filter((m) => m.formedMill).length;
  }, [gameState?.moveHistory]);

  const [frozenGameTime, setFrozenGameTime] = React.useState<number | null>(null);
  useEffect(() => {
    if (gameState?.gameOver && gameStartTime != null && frozenGameTime === null) {
      setFrozenGameTime(Math.floor((Date.now() - gameStartTime) / 1000));
    }
    if (!gameState?.gameOver) setFrozenGameTime(null);
  }, [gameState?.gameOver, gameStartTime, frozenGameTime]);
  const gameTimeSeconds =
    gameState?.gameOver && frozenGameTime != null
      ? frozenGameTime
      : gameStartTime != null
        ? Math.floor((Date.now() - gameStartTime) / 1000)
        : 0;

  const handleRevanche = useCallback(() => {
    recorded.current = false;
    if (isOnline) {
      resetOnline();
      resetGame();
      router.replace('/online');
      return;
    }
    newGame(gameMode ?? 'ai', aiDifficulty, gameMode === 'blitz' ? timerConfig ?? undefined : undefined);
  }, [isOnline, resetOnline, resetGame, newGame, gameMode, aiDifficulty, timerConfig, router]);

  const handleNewGame = useCallback(() => {
    recorded.current = false;
    if (isOnline) {
      resetOnline();
      resetGame();
      router.replace('/online');
      return;
    }
    resetGame();
    router.replace('/game/ai');
  }, [isOnline, resetOnline, resetGame, router]);

  const handleQuitDialog = useCallback(() => {
    Alert.alert(
      t('game.quitConfirmTitle'),
      undefined,
      [
        { text: t('game.quitContinue'), style: 'cancel' },
        {
          text: t('game.quitSaveAndQuit'),
          onPress: () => {
            const state = useGameStore.getState();
            const payload = buildSavedGameFromStore(state);
            if (payload) persistGameStateSync(payload);
            if (isOnline) resetOnline();
            resetGame();
            router.back();
          },
        },
        {
          text: t('game.quitWithoutSaving'),
          style: 'destructive',
          onPress: () => {
            if (isOnline) resetOnline();
            deleteSavedGame();
            resetGame();
            router.back();
          },
        },
      ]
    );
  }, [t, isOnline, resetOnline, resetGame, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isOnline) return false;
      handleQuitDialog();
      return true;
    });
    return () => sub.remove();
  }, [isOnline, handleQuitDialog]);

  const handleBackToMenu = useCallback(() => {
    if (isOnline) resetOnline();
    deleteSavedGame();
    resetGame();
    router.back();
  }, [isOnline, resetOnline, resetGame, router]);

  const handleUndo = useCallback(() => {
    undoTwoMoves();
    playButtonTap();
    light();
  }, [undoTwoMoves, playButtonTap, light]);

  const humanPlayer = isOnline ? myPlayerNumber : 1;
  const isHumanTurn =
    gameState != null &&
    gameState.currentPlayer === humanPlayer &&
    !gameState.mustRemove &&
    !gameState.gameOver;

  const handleCoachTap = useCallback(() => {
    if (!gameState || !isHumanTurn) return;
    if (coachTipVisible) {
      dismissCoach();
      return;
    }
    const tip = getCoachTip(gameState, humanPlayer as 1 | 2);
    if (tip) {
      setCoachTip(tip);
      setCoachTipVisible(true);
    } else {
      setCoachTip(null);
      setCoachTipVisible(true);
    }
    playButtonTap();
  }, [gameState, isHumanTurn, humanPlayer, coachTipVisible, dismissCoach, playButtonTap]);

  const player2NameBase = useMemo(() => {
    if (mode === 'ai') {
      const d = t(`play.difficultyLevels.${aiDifficulty}`);
      return `${t('game.ai')} ${d}`;
    }
    if (mode === 'local' || mode === 'blitz') return t('game.player2');
    return t('game.opponent');
  }, [mode, aiDifficulty, t]);

  const player1DisplayName = isOnline && myPlayerNumber === 2 ? t('game.opponent') : t('game.you');
  const player2DisplayName = isOnline && myPlayerNumber === 2 ? t('game.you') : player2NameBase;

  if (!gameState) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.fontColor }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const statusMessage = getStatusMessage(gameState, t, player1DisplayName, player2DisplayName);
  const phaseLabelP1 = getPhaseLabelForPlayer(gameState, 1, t);
  const phaseLabelP2 = getPhaseLabelForPlayer(gameState, 2, t);
  const isRemovePhase = gameState.mustRemove && !gameState.gameOver;
  const isAiThinking =
    gameMode === 'ai' && !isOnline && gameState.currentPlayer === 2 && !gameState.gameOver;
  const displayStatus = isAiThinking ? t('game.aiThinking') : statusMessage;

  const canUndo =
    undoEnabled &&
    mode === 'ai' &&
    !isOnline &&
    gameState.currentPlayer === 1 &&
    !gameState.mustRemove &&
    !gameState.gameOver &&
    stateHistory.length >= 2 &&
    undosUsedThisGame < 2;

  const STATUS_BAR_HEIGHT = 44;
  const stylesheet = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    turnBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: TURN_BAR_HEIGHT + insets.top,
      paddingTop: insets.top,
      paddingHorizontal: 16,
      backgroundColor: theme.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    turnBarIcon: { fontSize: 18 },
    turnBarIconDot: { fontSize: 18, color: '#1a1a1a' },
    turnBarText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.fontColor,
      flex: 1,
    },
    playerTop: {
      height: PLAYER_INFO_HEIGHT,
    },
    boardWrap: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 16,
      gap: 12,
    },
    boardOnly: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    timerSlot: {
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 72,
    },
    playerBottom: {
      height: PLAYER_INFO_HEIGHT,
      overflow: 'hidden',
    },
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      paddingBottom: 12 + insets.bottom,
      minHeight: STATUS_BAR_HEIGHT,
      backgroundColor: theme.cardBackground,
      borderTopWidth: 1,
      borderTopColor: theme.borderColor,
    },
    statusText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: theme.fontColorSecondary,
      textAlign: 'center',
    },
    tipBubble: {
      position: 'absolute',
      bottom: 100,
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF8EE',
      borderRadius: 16,
      padding: 14,
      shadowColor: '#2C1810',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
      zIndex: 50,
      gap: 10,
    },
    tipIcon: {
      fontSize: 20,
    },
    tipText: {
      flex: 1,
      fontSize: 14,
      color: '#4A4A4A',
      lineHeight: 20,
    },
    tipDismiss: {
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    tipDismissText: {
      fontSize: 13,
      color: '#8B7355',
      fontWeight: '600',
    },
  });

  const showTurnIcon = !isGameOver && (isAiThinking ? 'hourglass' : isHumanTurn ? 'dot' : null);

  return (
    <View style={stylesheet.container}>
      <View style={stylesheet.turnBar}>
        {showTurnIcon === 'dot' && <Text style={stylesheet.turnBarIconDot}>●</Text>}
        {showTurnIcon === 'hourglass' && <Text style={stylesheet.turnBarIcon}>⏳</Text>}
        <Text style={stylesheet.turnBarText} numberOfLines={1}>
          {displayStatus}
        </Text>
      </View>

      <GameActionBar
        onUndo={handleUndo}
        onHint={handleCoachTap}
        onQuit={handleQuitDialog}
        undoEnabled={undoEnabled}
        undoAvailable={canUndo}
        hintEnabled={Boolean(coachEnabled && isHumanTurn && !isOnline)}
        undoLabel={t('game.undo')}
        hintLabel={t('game.coach')}
        quitLabel={t('game.quit')}
        theme={theme}
      />

      <View style={stylesheet.playerTop}>
        <PlayerInfo
          player={2}
          name={player2DisplayName}
          stonesInHand={gameState.stonesInHand[2]}
          stonesOnBoard={gameState.stonesOnBoard[2]}
          isActive={gameState.currentPlayer === 2 && !gameState.gameOver}
          phaseLabel={phaseLabelP2}
          capturedCount={9 - gameState.stonesOnBoard[2] - gameState.stonesInHand[2]}
          theme={theme}
          layout="top"
          thinking={isAiThinking}
        />
      </View>

      <View style={stylesheet.boardWrap}>
        {gameMode === 'blitz' && timerConfig ? (
          <>
            <View style={stylesheet.timerSlot} pointerEvents="none">
              <Timer
                timeLeft={timeLeftP2}
                totalSeconds={timerConfig.secondsPerPlayer}
                isActive={gameState.currentPlayer === 2 && !gameState.gameOver}
                theme={theme}
              />
            </View>
            <View style={stylesheet.boardOnly}>
              <Board
                gameState={gameState}
                validMoves={validMoves}
                onPositionPress={onPositionPress}
                theme={theme}
                humanPlayer={gameState.currentPlayer}
                removablePositions={removablePositions}
                lastPlacedPosition={lastPlacedPosition}
                millLineToHighlight={millLineToHighlight}
                coachTip={coachTipVisible && coachTip ? coachTip : null}
              />
            </View>
            <View style={stylesheet.timerSlot} pointerEvents="none">
              <Timer
                timeLeft={timeLeftP1}
                totalSeconds={timerConfig.secondsPerPlayer}
                isActive={gameState.currentPlayer === 1 && !gameState.gameOver}
                theme={theme}
              />
            </View>
          </>
        ) : (
          <View style={stylesheet.boardOnly}>
            <Board
              gameState={gameState}
              validMoves={validMoves}
              onPositionPress={onPositionPress}
              theme={theme}
              humanPlayer={gameState.currentPlayer}
              removablePositions={removablePositions}
              lastPlacedPosition={lastPlacedPosition}
              millLineToHighlight={millLineToHighlight}
              coachTip={coachTipVisible && coachTip ? coachTip : null}
            />
          </View>
        )}
      </View>

      <View style={stylesheet.playerBottom}>
        <PlayerInfo
          player={1}
          name={player1DisplayName}
          stonesInHand={gameState.stonesInHand[1]}
          stonesOnBoard={gameState.stonesOnBoard[1]}
          isActive={gameState.currentPlayer === 1 && !gameState.gameOver}
          phaseLabel={phaseLabelP1}
          capturedCount={9 - gameState.stonesOnBoard[1] - gameState.stonesInHand[1]}
          theme={theme}
          layout="bottom"
          compact
        />
      </View>

      {!isGameOver && (
        <View style={stylesheet.status}>
          <Text
            style={[
              stylesheet.statusText,
              isRemovePhase && { color: theme.colors.danger, fontWeight: '600' },
            ]}
            numberOfLines={2}
          >
            {displayStatus}
          </Text>
        </View>
      )}

      {coachTipVisible && (
        <View style={stylesheet.tipBubble} pointerEvents="box-none">
          <Text style={stylesheet.tipIcon}>💡</Text>
          <Text style={stylesheet.tipText}>
            {coachTip ? t(`coach.${coachTip.reason}`) : t('coach.no_tip')}
          </Text>
          <TouchableOpacity
            style={stylesheet.tipDismiss}
            onPress={dismissCoach}
            activeOpacity={0.7}
          >
            <Text style={stylesheet.tipDismissText}>{t('game.coachDismiss')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <GameOverScreen
        visible={isGameOver && gameState != null}
        result={
          isDraw
            ? 'draw'
            : winner === (isOnline ? myPlayerNumber : 1)
              ? 'win'
              : 'lose'
        }
        reason={gameState && isGameOver ? getGameOverReason(gameState, t) : undefined}
        stats={{
          moves: gameState?.moveCount ?? 0,
          mills: millsClosed,
          time:
            gameTimeSeconds != null
              ? `${Math.floor(gameTimeSeconds / 60)}:${(gameTimeSeconds % 60).toString().padStart(2, '0')}`
              : '0:00',
        }}
        onRematch={handleRevanche}
        onBackToMenu={handleBackToMenu}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
