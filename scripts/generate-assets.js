/**
 * Generates all graphic assets for the Mühle app:
 * - icon.png (512x512)
 * - adaptive-icon.png (512x512)
 * - splash.png (1284x2778)
 * - playstore/feature-graphic.png (1024x500)
 *
 * Run: node scripts/generate-assets.js
 * Requires: npm install canvas --save-dev
 */

const fs = require('fs');
const path = require('path');

let createCanvas;
try {
  const canvas = require('canvas');
  createCanvas = canvas.createCanvas;
} catch (e) {
  console.error('Missing "canvas" package. Install with: npm install canvas --save-dev');
  process.exit(1);
}

// --- Theme colors ---
const COLORS = {
  background: '#FDFAF5',
  goldLight: '#C4A265',
  goldDark: '#8B7A2B',
  goldMid: '#A89245',
  goldStoreDark: '#6B5D2A',
  boardLine: 'rgba(253, 250, 245, 0.9)',
  stoneBlack: '#2C2416',
  stoneWhite: '#FDFAF5',
  star: '#FFD700',
};

const ICON_SIZE = 512;
const ICON_RADIUS = 108;
const BOARD_OFFSET_Y = -24; // board slightly up for stones below

/**
 * Board geometry for a given scale and center.
 * Returns { outer, middle, inner } as [x,y,w,h] and center [cx,cy].
 */
function boardGeometry(centerX, centerY, scale = 1) {
  const outerSize = 340 * scale;
  const middleSize = 220 * scale;
  const innerSize = 100 * scale;
  const half = (s) => s / 2;
  return {
    cx: centerX,
    cy: centerY,
    outer: [centerX - half(outerSize), centerY - half(outerSize), outerSize, outerSize],
    middle: [centerX - half(middleSize), centerY - half(middleSize), middleSize, middleSize],
    inner: [centerX - half(innerSize), centerY - half(innerSize), innerSize, innerSize],
    outerSize,
    middleSize,
    innerSize,
  };
}

/**
 * Draw the Mühle board (3 squares + 4 connecting lines).
 */
function drawBoard(ctx, centerX, centerY, scale, lineWidths = { outer: 8, middle: 7, inner: 6 }) {
  const g = boardGeometry(centerX, centerY, scale);
  const lw = (key) => (lineWidths[key] != null ? lineWidths[key] * scale : 6 * scale);
  ctx.strokeStyle = COLORS.boardLine;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawRect = (x, y, w, h, lw) => {
    ctx.lineWidth = lw;
    ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
  };

  drawRect(...g.outer, lw('outer'));
  drawRect(...g.middle, lw('middle'));
  drawRect(...g.inner, lw('inner'));

  const [ox, oy, os] = [g.outer[0], g.outer[1], g.outerSize];
  const [mx, my, ms] = [g.middle[0], g.middle[1], g.middleSize];
  const [ix, iy, is] = [g.inner[0], g.inner[1], g.innerSize];

  const lwConn = Math.max(2, lw('middle') * 0.85);
  ctx.lineWidth = lwConn;

  // Top
  ctx.beginPath();
  ctx.moveTo(g.cx, oy);
  ctx.lineTo(g.cx, my);
  ctx.lineTo(g.cx, iy);
  ctx.stroke();
  // Right
  ctx.beginPath();
  ctx.moveTo(ox + os, g.cy);
  ctx.lineTo(mx + ms, g.cy);
  ctx.lineTo(ix + is, g.cy);
  ctx.stroke();
  // Bottom
  ctx.beginPath();
  ctx.moveTo(g.cx, oy + os);
  ctx.lineTo(g.cx, my + ms);
  ctx.lineTo(g.cx, iy + is);
  ctx.stroke();
  // Left
  ctx.beginPath();
  ctx.moveTo(ox, g.cy);
  ctx.lineTo(mx, g.cy);
  ctx.lineTo(ix, g.cy);
  ctx.stroke();
}

/**
 * Draw a stone (circle).
 */
function drawStone(ctx, x, y, radius, color, options = {}) {
  const { border, borderColor = COLORS.goldDark, shadow = true } = options;
  if (shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (border) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = border;
    ctx.stroke();
  }
  if (shadow) ctx.restore();
}

/**
 * Draw stones on the icon-sized board (intersection points).
 * scale 1 = icon size; center at (256, 256 + BOARD_OFFSET_Y).
 */
function drawIconStones(ctx, centerX, centerY, scale) {
  const g = boardGeometry(centerX, centerY, scale);
  const r = 28 * scale;
  const [ox, oy, os] = [g.outer[0], g.outer[1], g.outerSize];
  const [mx, my, ms] = [g.middle[0], g.middle[1], g.middleSize];
  const [ix, iy, is] = [g.inner[0], g.inner[1], g.innerSize];

  // Left column (3 points): outer left, middle left, inner left
  const leftX = ox;
  const midX = mx;
  const innerX = ix;
  const topY = oy;
  const midY = g.cy;
  const botY = iy + is;

  // Black stone – outer left
  drawStone(ctx, leftX, midY, r, COLORS.stoneBlack, { shadow: true });
  // White stone – middle left (with border)
  drawStone(ctx, midX, midY, r, COLORS.stoneWhite, { border: 2 * scale, shadow: true });
  // Black stone – inner bottom (suggests a mill)
  drawStone(ctx, g.cx, botY, r, COLORS.stoneBlack, { shadow: true });
}

/**
 * Clip to rounded rect (icon shape).
 */
function clipRoundedRect(ctx, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.clip();
}

// --- 1. App Icon 512x512 ---
function generateIcon() {
  const w = ICON_SIZE;
  const h = ICON_SIZE;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Full canvas gradient (opaque corners), then clip for board/stones
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, COLORS.goldLight);
  grad.addColorStop(1, COLORS.goldDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  clipRoundedRect(ctx, w, h, ICON_RADIUS);

  const centerX = w / 2;
  const centerY = h / 2 + BOARD_OFFSET_Y;

  drawBoard(ctx, centerX, centerY, 1);
  drawIconStones(ctx, centerX, centerY, 1);

  // Subtle inner shadow (dark edge)
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ICON_RADIUS, 0);
  ctx.lineTo(w - ICON_RADIUS, 0);
  ctx.quadraticCurveTo(w, 0, w, ICON_RADIUS);
  ctx.lineTo(w, h - ICON_RADIUS);
  ctx.quadraticCurveTo(w, h, w - ICON_RADIUS, h);
  ctx.lineTo(ICON_RADIUS, h);
  ctx.quadraticCurveTo(0, h, 0, h - ICON_RADIUS);
  ctx.lineTo(0, ICON_RADIUS);
  ctx.quadraticCurveTo(0, 0, ICON_RADIUS, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  return canvas;
}

// --- 2. Adaptive Icon (same as icon, 512x512) ---
function generateAdaptiveIcon() {
  return generateIcon();
}

// --- 3. Splash 1284x2778 ---
function generateSplash() {
  const w = 1284;
  const h = 2778;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, w, h);

  const centerX = w / 2;
  const boardPx = 400;
  const scale = boardPx / 340;
  const centerY = h * 0.38;

  drawBoard(ctx, centerX, centerY, scale, {
    outer: 8,
    middle: 7,
    inner: 6,
  });
  drawIconStones(ctx, centerX, centerY, scale);

  const textY = centerY + boardPx / 2 + 40;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.goldDark;
  ctx.font = '700 48px Georgia';
  ctx.fillText('Mühle', centerX, textY);
  ctx.font = '400 28px Georgia';
  ctx.fillText('Meister', centerX, textY + 40);
  return canvas;
}

// --- 4. Play Store feature graphic 1024x500 ---
function generateFeatureGraphic() {
  const w = 1024;
  const h = 500;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, COLORS.goldMid);
  grad.addColorStop(1, COLORS.goldStoreDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const marginLeft = 60;
  const centerY = h / 2;

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.background;
  ctx.font = '800 72px Georgia';
  ctx.fillText('Mühle', marginLeft, centerY - 50);
  ctx.font = '400 42px Georgia';
  ctx.globalAlpha = 0.9;
  ctx.fillText('Meister', marginLeft, centerY);
  ctx.globalAlpha = 0.7;
  ctx.font = '400 24px Georgia';
  ctx.fillText('Das klassische Brettspiel', marginLeft, centerY + 45);
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.star;
  ctx.font = '20px Georgia';
  ctx.fillText('★★★★★', marginLeft, centerY + 80);

  const boardSize = 380;
  const scale = boardSize / 340;
  const boardCenterX = w * 0.72;
  const boardCenterY = h / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  drawBoard(ctx, boardCenterX, boardCenterY, scale, {
    outer: 8,
    middle: 7,
    inner: 6,
  });
  drawIconStones(ctx, boardCenterX, boardCenterY, scale);
  ctx.restore();

  return canvas;
}

// --- Write all assets ---
function main() {
  const root = path.join(__dirname, '..');
  const imagesDir = path.join(root, 'assets', 'images');
  const playstoreDir = path.join(root, 'assets', 'playstore');

  fs.mkdirSync(imagesDir, { recursive: true });
  fs.mkdirSync(playstoreDir, { recursive: true });

  const icon = generateIcon();
  const iconPath = path.join(imagesDir, 'icon.png');
  fs.writeFileSync(iconPath, icon.toBuffer('image/png'));
  console.log('Written:', path.relative(root, iconPath));

  const adaptive = generateAdaptiveIcon();
  const adaptivePath = path.join(imagesDir, 'adaptive-icon.png');
  fs.writeFileSync(adaptivePath, adaptive.toBuffer('image/png'));
  console.log('Written:', path.relative(root, adaptivePath));

  const splash = generateSplash();
  const splashPath = path.join(imagesDir, 'splash.png');
  fs.writeFileSync(splashPath, splash.toBuffer('image/png'));
  console.log('Written:', path.relative(root, splashPath));

  const feature = generateFeatureGraphic();
  const featurePath = path.join(playstoreDir, 'feature-graphic.png');
  fs.writeFileSync(featurePath, feature.toBuffer('image/png'));
  console.log('Written:', path.relative(root, featurePath));

  console.log('\nDone. Check app.json: icon, adaptiveIcon.foregroundImage, splash.image.');
  console.log('Android adaptiveIcon.backgroundColor can be #A89245.');
}

main();
