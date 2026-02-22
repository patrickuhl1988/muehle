/**
 * Tutorial overlay: dimming, optional spotlight (cutouts), text, Weiter, Überspringen.
 * Uses react-native-svg for mask-based spotlight.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, Mask, Rect, Circle } from 'react-native-svg';
import { positionToCoordinates } from '../utils/boardCoordinates';
import type { Position } from '../game/types';
import type { Theme } from '../theme/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPOTLIGHT_RADIUS = 36;

export interface BoardLayout {
  x: number;
  y: number;
  size: number;
}

export interface TutorialOverlayProps {
  /** Dimming opacity (0–1). */
  dimOpacity?: number;
  /** Board position/size for spotlight conversion. */
  boardLayout: BoardLayout;
  /** Position indices to "cut out" (spotlight). Null = no cutouts, full dim. */
  spotlightPositions: Position[] | null;
  /** Main instruction text. */
  text: string;
  /** Show primary button (Weiter / Los geht's!). */
  showWeiter?: boolean;
  /** When true, show "Los geht's!" / "Let's play!" instead of "Weiter". */
  isLastStep?: boolean;
  /** Show "Überspringen" link. */
  showSkip?: boolean;
  onWeiter: () => void;
  onSkip: () => void;
  theme: Theme;
}

/**
 * Renders a dimmed overlay with optional circular spotlights. Text and buttons at bottom.
 */
export function TutorialOverlay({
  dimOpacity = 0.65,
  boardLayout,
  spotlightPositions,
  text,
  showWeiter = true,
  isLastStep = false,
  showSkip = true,
  onWeiter,
  onSkip,
  theme,
}: TutorialOverlayProps) {
  const { t } = useTranslation();
  const primaryLabel = isLastStep ? t('tutorial.finish') : t('tutorial.next');
  const circles =
    spotlightPositions && spotlightPositions.length > 0
      ? spotlightPositions.map((pos) => {
          const { x, y } = positionToCoordinates(pos, boardLayout.size);
          return {
            cx: boardLayout.x + x,
            cy: boardLayout.y + y,
            r: SPOTLIGHT_RADIUS,
          };
        })
      : [];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dimming layer with optional spotlight cutouts */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="tutorialSpotlight">
              <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="white" />
              {circles.map((c, i) => (
                <Circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="black" />
              ))}
            </Mask>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            fill={`rgba(0,0,0,${dimOpacity})`}
            mask="url(#tutorialSpotlight)"
          />
        </Svg>
      </View>

      {/* Bottom card: text + buttons */}
      <View style={[styles.bottomCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}>
        <Text style={[styles.text, { color: theme.fontColor }]}>{text}</Text>
        <View style={styles.actions}>
          {showWeiter && (
            <TouchableOpacity
              style={[styles.weiterBtn, { backgroundColor: theme.colors.accent }]}
              onPress={onWeiter}
              activeOpacity={0.8}
            >
              <Text style={[styles.weiterText, { color: theme.id === 'holz' || theme.id === 'minimal' ? '#FFF' : theme.colors.background }]}>
                {primaryLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {showSkip && (
          <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
            <Text style={[styles.skipText, { color: theme.fontColorSecondary }]}>{t('tutorial.skip')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 32,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  actions: {
    width: '100%',
  },
  weiterBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weiterText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
  },
});
