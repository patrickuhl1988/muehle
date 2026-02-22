# Mühle (Nine Men's Morris)

React Native / Expo App für Android (später iOS). Klassisches Brettspiel Mühle mit KI, Puzzle-Modus und mehreren Themes.

## Tech-Stack

- **React Native + Expo** (managed workflow), TypeScript strict
- **State:** Zustand
- **Rendering:** react-native-svg
- **Animationen:** react-native-reanimated, react-native-gesture-handler
- **Navigation:** expo-router (file-based)
- **Sound:** expo-audio | **Haptics:** expo-haptics
- **Styling:** StyleSheet + zentrales Theme-System (kein Tailwind)

## Projektstruktur

- `app/` – expo-router Screens (Tabs: Home, Spielen, Puzzle, Profil)
- `lib/game/` – Spiellogik (engine, board, ai, types, constants, puzzles)
- `lib/store/` – Zustand (game, settings, stats, puzzle)
- `lib/theme/` – ThemeProvider, themes, types
- `lib/components/` – Board, Stone, PlayerInfo, Timer, MoveIndicator
- `lib/hooks/` – useGame, useSound, useHaptics
- `assets/` – sounds, images

## Start

Im Projektordner (z. B. `mühle claude`):

```bash
npm install --legacy-peer-deps
npm start
# Android: npm run android
```

**Hinweis:** Platzhalter für App-Icon und Splash: `assets/images/icon.png`, `splash.png`, `adaptive-icon.png` (z. B. 1024×1024). Ohne diese Dateien nutzt Expo Standard-Assets.

## Tests

```bash
npm test
```

## Themes

- **Holz** (Standard) – warme Brettfarben
- **Minimal** – hell, reduziert
- **Neon** – dunkel, leuchtend
- **Dark** – Material Dark

## Lizenz

Privat / Projekt.
