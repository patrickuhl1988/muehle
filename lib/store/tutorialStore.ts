/**
 * Zustand store for the interactive tutorial. State machine with step 1–7.
 */

import { create } from 'zustand';
import type { GameState, Position } from '../game/types';
import { makeMove } from '../game/engine';
import {
  getTutorialStateForStep,
  getTutorialStepConfig,
  TUTORIAL_STEP2_AI_POSITION,
  TOTAL_STEPS,
} from '../game/tutorial';

export type TutorialStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface TutorialStoreState {
  /** Current step (1–7). */
  step: TutorialStep;
  /** Game state for current step (can be updated in step 2, 4). */
  tutorialState: GameState | null;
  /** True when step 2: player has placed, waiting for AI animation. */
  step2WaitingForAi: boolean;
  /** True when step 4: player has removed stone, show celebration. */
  step4JustRemoved: boolean;
  /** True when tutorial was completed or skipped. */
  completed: boolean;

  /** Reset and go to step 1. */
  startTutorial: () => void;
  /** Advance to next step (or complete). */
  nextStep: () => void;
  /** Skip tutorial (mark completed, step = 8 or completed flag). */
  skipTutorial: () => void;
  /** Apply player action in tutorial (place / remove). Returns true if action was valid. */
  tutorialPlace: (position: Position) => boolean;
  tutorialRemove: (position: Position) => boolean;
  /** Step 2: after player placed, apply "AI" move. */
  step2ApplyAiMove: () => void;
  /** Clear step4 celebration flag. */
  clearStep4Celebration: () => void;
}

function getInitialStateForStep(step: TutorialStep): GameState {
  return getTutorialStateForStep(step);
}

export const useTutorialStore = create<TutorialStoreState>((set, get) => ({
  step: 1,
  tutorialState: null,
  step2WaitingForAi: false,
  step4JustRemoved: false,
  completed: false,

  startTutorial() {
    const state = getInitialStateForStep(1);
    set({
      step: 1,
      tutorialState: state,
      step2WaitingForAi: false,
      step4JustRemoved: false,
      completed: false,
    });
  },

  nextStep() {
    const { step } = get();
    if (step >= TOTAL_STEPS) {
      set({ completed: true });
      return;
    }
    const next = (step + 1) as TutorialStep;
    const state = getInitialStateForStep(next);
    set({
      step: next,
      tutorialState: state,
      step2WaitingForAi: false,
      step4JustRemoved: false,
    });
  },

  skipTutorial() {
    set({ completed: true, step: TOTAL_STEPS });
  },

  tutorialPlace(position: Position): boolean {
    const { step, tutorialState } = get();
    if (!tutorialState || step !== 2) return false;
    const config = getTutorialStepConfig(2);
    if (config.allowedPositions && !config.allowedPositions.includes(position)) return false;
    const next = makeMove(tutorialState, position);
    set({
      tutorialState: next,
      step2WaitingForAi: true,
    });
    return true;
  },

  tutorialRemove(position: Position): boolean {
    const { step, tutorialState } = get();
    if (!tutorialState || step !== 4) return false;
    const next = makeMove(tutorialState, position);
    set({
      tutorialState: next,
      step4JustRemoved: true,
    });
    return true;
  },

  step2ApplyAiMove() {
    const { tutorialState } = get();
    if (!tutorialState || !get().step2WaitingForAi) return;
    const next = makeMove(tutorialState, TUTORIAL_STEP2_AI_POSITION);
    set({
      tutorialState: next,
      step2WaitingForAi: false,
    });
  },

  clearStep4Celebration() {
    set({ step4JustRemoved: false });
  },
}));
