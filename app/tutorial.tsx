/**
 * Interactive tutorial: 7 steps with overlay, progress dots, Board.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme/ThemeProvider';
import { useTutorialStore } from '../lib/store/tutorialStore';
import { useSettingsStore } from '../lib/store/settingsStore';
import { useStatsStore } from '../lib/store/statsStore';
import { getTutorialStepConfig, getTutorialStateForStep, TOTAL_STEPS } from '../lib/game/tutorial';
import { getValidMoves, getRemovableStones } from '../lib/game/engine';
import { Board } from '../lib/components/Board';
import { TutorialOverlay, type BoardLayout } from '../lib/components/TutorialOverlay';
import type { Position } from '../lib/game/types';

const MIN_BOARD_RATIO = 0.85;
const PROGRESS_DOT_SIZE = 8;
const PROGRESS_GAP = 6;

export default function TutorialScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const boardSize = Math.floor(width * MIN_BOARD_RATIO);
  const [boardLayout, setBoardLayout] = React.useState<BoardLayout>({
    x: (width - boardSize) / 2,
    y: 80,
    size: boardSize,
  });

  const {
    step,
    tutorialState,
    step2WaitingForAi,
    step4JustRemoved,
    completed,
    startTutorial,
    nextStep,
    skipTutorial,
    tutorialPlace,
    tutorialRemove,
    step2ApplyAiMove,
    clearStep4Celebration,
  } = useTutorialStore();
  const setTutorialCompleted = useSettingsStore((s) => s.setTutorialCompleted);
  const checkAchievements = useStatsStore((s) => s.checkAchievements);

  useEffect(() => {
    startTutorial();
  }, [startTutorial]);

  useEffect(() => {
    if (completed) {
      setTutorialCompleted(true);
      checkAchievements();
      router.replace('/(tabs)');
      return;
    }
  }, [completed, setTutorialCompleted, checkAchievements, router]);

  useEffect(() => {
    if (step2WaitingForAi) {
      const t = setTimeout(step2ApplyAiMove, 1200);
      return () => clearTimeout(t);
    }
  }, [step2WaitingForAi, step2ApplyAiMove]);

  useEffect(() => {
    if (step4JustRemoved) {
      const t = setTimeout(clearStep4Celebration, 1500);
      return () => clearTimeout(t);
    }
  }, [step4JustRemoved, clearStep4Celebration]);

  const config = getTutorialStepConfig(step);
  const state = tutorialState ?? getTutorialStateForStep(step);
  const overlayTitle = t(`tutorial.step${step}Title` as 'tutorial.step1Title');
  const overlayBody = t(`tutorial.step${step}Text` as 'tutorial.step1Text');
  const overlayText = overlayTitle + '\n\n' + overlayBody;

  const validMoves = useMemo(() => {
    if (step === 2 && config.allowedPositions) return config.allowedPositions;
    return getValidMoves(state);
  }, [step, config.allowedPositions, state]);

  const removablePositions = useMemo(() => {
    if (step === 4) return config.removablePositions ?? getRemovableStones(state);
    return getRemovableStones(state);
  }, [step, config.removablePositions, state]);

  const millLineToHighlight = config.millLine ?? null;

  const onPositionPress = useCallback(
    (position: Position) => {
      if (step === 2) {
        if (tutorialPlace(position)) return;
      }
      if (step === 4) {
        if (tutorialRemove(position)) return;
      }
    },
    [step, tutorialPlace, tutorialRemove]
  );

  const handleWeiter = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const handleSkip = useCallback(() => {
    skipTutorial();
  }, [skipTutorial]);

  const showWeiter = config.waitForButton || (step === 2 && !step2WaitingForAi);
  const blinkingPositions = step === 1 ? (Array.from({ length: 24 }, (_, i) => i) as Position[]) : null;

  const onBoardLayout = useCallback((event: { nativeEvent: { layout: { x: number; y: number; width: number; height: number } } }) => {
    const { x, y, width: w, height: h } = event.nativeEvent.layout;
    setBoardLayout({ x, y, size: Math.min(w, h) });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Progress dots */}
      <View style={styles.progressWrap}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              {
                backgroundColor: i + 1 <= step ? theme.colors.accent : theme.borderColor,
              },
            ]}
          />
        ))}
      </View>

      {/* Step 4: Celebration after removing stone */}
      {step4JustRemoved && (
        <View style={[styles.celebration, { backgroundColor: theme.successColor }]} pointerEvents="none">
          <Text style={styles.celebrationText}>{t('tutorial.celebration')}</Text>
        </View>
      )}

      {/* Board */}
      <View
        style={[styles.boardWrap, { width: boardSize, height: boardSize }]}
        onLayout={onBoardLayout}
      >
        <Board
          gameState={state}
          validMoves={step === 2 ? validMoves : step === 5 || step === 6 ? validMoves : []}
          onPositionPress={onPositionPress}
          theme={theme}
          removablePositions={step === 4 ? removablePositions : []}
          millLineToHighlight={millLineToHighlight}
          blinkingPositions={blinkingPositions}
          boardSizeOverride={boardSize}
        />
      </View>

      {/* Overlay */}
      <TutorialOverlay
        boardLayout={boardLayout}
        spotlightPositions={config.spotlightPositions}
        text={overlayText}
        showWeiter={showWeiter}
        isLastStep={step === TOTAL_STEPS}
        showSkip={true}
        onWeiter={handleWeiter}
        onSkip={handleSkip}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: PROGRESS_GAP,
    paddingVertical: 16,
  },
  progressDot: {
    width: PROGRESS_DOT_SIZE,
    height: PROGRESS_DOT_SIZE,
    borderRadius: PROGRESS_DOT_SIZE / 2,
  },
  boardWrap: {
    alignSelf: 'center',
    marginTop: 16,
  },
  celebration: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    zIndex: 10,
  },
  celebrationText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
});
