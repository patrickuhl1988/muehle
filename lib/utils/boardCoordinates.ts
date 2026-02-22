/**
 * Maps board positions (0-23) to SVG coordinates.
 * Relative coords 0-1 with 5% margin, multiplied by boardSize.
 * Used by Board and Stone for layout and touch targets.
 */

import type { Position } from '../game/types';
import { MILL_LINES } from '../game/constants';

/** Relative positions 0-1 (outer, middle, inner squares). */
const RELATIVE_COORDS: [number, number][] = [
  [0, 0],
  [0.5, 0],
  [1, 0],
  [1, 0.5],
  [1, 1],
  [0.5, 1],
  [0, 1],
  [0, 0.5],
  [0.25, 0.25],
  [0.5, 0.25],
  [0.75, 0.25],
  [0.75, 0.5],
  [0.75, 0.75],
  [0.5, 0.75],
  [0.25, 0.75],
  [0.25, 0.5],
  [0.375, 0.375],
  [0.5, 0.375],
  [0.625, 0.375],
  [0.625, 0.5],
  [0.625, 0.625],
  [0.5, 0.625],
  [0.375, 0.625],
  [0.375, 0.5],
];

const MARGIN_RATIO = 0.05;

/**
 * Returns SVG x,y for a position. Board is a square of size boardSize;
 * coordinates use a 5% margin so nothing is clipped.
 */
export function positionToCoordinates(
  position: Position,
  boardSize: number
): { x: number; y: number } {
  const [rx, ry] = RELATIVE_COORDS[position] ?? [0.5, 0.5];
  const margin = boardSize * MARGIN_RATIO;
  const inner = boardSize - 2 * margin;
  return {
    x: margin + rx * inner,
    y: margin + ry * inner,
  };
}

/**
 * Returns all 24 coordinates for the given board size.
 */
export function getAllCoordinates(boardSize: number): { x: number; y: number }[] {
  return RELATIVE_COORDS.map((_, i) => positionToCoordinates(i as Position, boardSize));
}

/**
 * Returns line segments for drawing the board (3 squares + 4 connectors).
 * Each segment is { x1, y1, x2, y2 } in pixel coordinates.
 */
export function getBoardLineSegments(boardSize: number): { x1: number; y1: number; x2: number; y2: number }[] {
  const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const [a, b, c] of MILL_LINES) {
    const pa = positionToCoordinates(a, boardSize);
    const pb = positionToCoordinates(b, boardSize);
    const pc = positionToCoordinates(c, boardSize);
    segments.push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y });
    segments.push({ x1: pb.x, y1: pb.y, x2: pc.x, y2: pc.y });
  }
  return segments;
}
