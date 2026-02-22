/**
 * Creates minimal placeholder PNGs for icon, splash, adaptive-icon
 * so the app can start. Replace with real assets before release.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'assets', 'images');
const minimalPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon.png'), minimalPng);
fs.writeFileSync(path.join(dir, 'splash.png'), minimalPng);
fs.writeFileSync(path.join(dir, 'adaptive-icon.png'), minimalPng);
console.log('Created assets/images/icon.png, splash.png, adaptive-icon.png');
