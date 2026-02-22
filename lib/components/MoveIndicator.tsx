/**
 * Visual indicator for possible moves.
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { getCoord, BOARD_WIDTH, BOARD_HEIGHT } from './Board';
import type { Position } from '../game/types';

interface MoveIndicatorProps {
  positions: Position[];
}

/**
 * Renders small dots at valid move positions.
 */
export function MoveIndicator({ positions }: MoveIndicatorProps) {
  const { theme } = useTheme();
  const highlight = theme.colors.highlight;

  if (positions.length === 0) return null;

  return (
    <View style={{ position: 'absolute', width: BOARD_WIDTH, height: BOARD_HEIGHT }} pointerEvents="none">
      <Svg width={BOARD_WIDTH} height={BOARD_HEIGHT} viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}>
        {positions.map((pos) => {
          const { x, y } = getCoord(pos);
          return <Circle key={pos} cx={x} cy={y} r={6} fill={highlight} opacity={0.9} />;
        })}
      </Svg>
    </View>
  );
}
