# Mühle App – Dokumentation für Claude AI

Aktuelle technische Dokumentation des Projekts **Mühle** (Nine Men's Morris) – React Native / Expo, Zustand, i18n, mehrere Spielmodi inkl. Tag Team und Auto-Save.

---

## 1. Projektüberblick

- **Name:** Mühle-App (Nine Men's Morris)
- **Typ:** Mobile-App (React Native mit Expo)
- **Sprachen:** TypeScript, Deutsch + Englisch (i18n)
- **Zweck:** Klassisches Mühle-Spiel mit KI, lokalem Duell, Blitz, Tag Team (2v2), Puzzles, optional Online und In-App-Käufen

---

## 2. Tech-Stack

| Bereich | Technologie |
|--------|-------------|
| Framework | Expo SDK 54, React 19.1, React Native 0.81 |
| Routing | expo-router ~6 (file-based) |
| State | Zustand 5 |
| i18n | i18next, react-i18next |
| Persistenz | @react-native-async-storage/async-storage |
| UI | react-native-svg, react-native-reanimated ~4, react-native-gesture-handler |
| Audio | expo-audio (Sound-Effekte) |
| Backend (optional) | Supabase (Auth, Realtime, Edge Functions) |
| Monetarisierung | RevenueCat (In-App-Käufe) |

---

## 3. Verzeichnisstruktur (relevant)

```
app/                    # Expo Router – Screens
  _layout.tsx           # Root: ThemeProvider, Stack, AppState-Save für Auto-Save
  (tabs)/               # Tab-Navigation
    _layout.tsx
    index.tsx           # Home: Quick Play, Daily Puzzle, Continue-Dialog, Stats
    play.tsx            # Spielmodus-Auswahl (AI, Local, Tag Team, Online, Blitz)
    puzzle.tsx          # Puzzle-Übersicht
    profile.tsx         # Profil, Stats, Achievements
  game/
    [mode].tsx          # Einzelbretter: ai, local, blitz, online
    tagteam.tsx         # Tag-Team-Modus (2 Bretter, 2v2)
  puzzle/
    [id].tsx            # Einzelpuzzle
  online/               # Online-Matchmaking, Friend-Match
  settings.tsx
  tutorial.tsx

lib/
  game/                 # Reine Spiellogik (kein React)
    types.ts            # GameState, Player, Position, Phase, GameMode, AIDifficulty
    constants.ts        # BOARD_SIZE, MILL_LINES, INITIAL_STONES
    board.ts            # Brett-Hilfen: Nachbarn, Steine, Mühlen, Hash
    engine.ts           # createInitialState, getValidMoves, makeMove, checkGameOver
    ai.ts               # getAIMove, getAIMoveDelay, evaluateBoard (Minimax)
    coach.ts            # getCoachTip – strategische Tipps
    puzzles.ts          # Tägliches Puzzle, Sammlung
    tutorial.ts         # Tutorial-Schritte
    timerConfig.ts      # Blitz-Zeitpresets
    tagTeamTypes.ts     # TagTeamConfig, TagTeamState, BoardId
    achievements.ts
  store/
    gameStore.ts        # Einzelbretter: state, startGame, restoreGame, handlePositionPress, applyAIMove, undo
    tagTeamStore.ts     # Tag Team: boardA/boardB, bonusStones, turnOrder, handlePositionPress, applyAIMove
    settingsStore.ts    # Theme, Sprache, Sound, Haptik, Undo, Coach
    statsStore.ts       # Siege, Spiele, Streak, Achievements
    puzzleStore.ts      # Daily Puzzle, Fortschritt
    onlineStore.ts      # Supabase-Matches
    purchasesStore.ts   # RevenueCat, Ad-Free, Themes
    tutorialStore.ts
  components/           # Wiederverwendbare UI
    Board.tsx           # SVG-Brett, Steine, Valid-Moves, Coach-Highlight
    Stone.tsx
    PlayerInfo.tsx
    GameOverScreen.tsx
    Timer.tsx
    MoveIndicator.tsx
    LanguageToggle.tsx
    AdBanner.tsx
    RewardedAdHint.tsx
    TutorialOverlay.tsx
  hooks/
    useGame.ts          # AI-Zug nach Verzögerung, State aus gameStore
    useBlitzTimer.ts    # Blitz-Timer-Tick
    useSound.ts
    useHaptics.ts
    useFeedback.ts
  theme/
    ThemeProvider.tsx
    types.ts
    themes.ts
    availableThemes.ts
  utils/
    savedGame.ts        # Auto-Save: SAVE_KEY v2, persistGameStateSync, loadSavedGame, deleteSavedGame, buildSavedGameFromStore
    gameMessages.ts    # getStatusMessage, getGameOverReason
    boardCoordinates.ts # positionToCoordinates, getBoardLineSegments
  i18n/
    index.ts
    locales/en.ts, de.ts
  supabase/
    client.ts
    database.types.ts
    types.ts
  iap/
    products.ts
    revenueCat.ts
  sound/
    SoundManager.ts
    soundSynthesis.ts
    wavUtils.ts
```

---

## 4. Spielmodi (GameMode)

| Modus | Beschreibung | Store | Route / Start |
|-------|--------------|--------|----------------|
| **ai** | Mensch vs KI (eine Schwierigkeit) | gameStore | `/game/ai` – von Home (Quick Play) oder Play |
| **local** | 2 Spieler, ein Gerät | gameStore | `/game/local` |
| **blitz** | Mit Zeitlimit pro Spieler | gameStore + timerConfig | `/game/blitz` – nach Timer-Modal |
| **tagteam** | 2v2, zwei Bretter, Bonus-Steine bei Schlag | tagTeamStore | `/game/tagteam` – nach Tag-Team-Modal |
| **online** | Supabase-Matchmaking / Friend-Match | onlineStore + game_state | `/game/online` mit matchId |

- **gameStore:** Ein Brett, `state`, `history`, `stateHistory`, `undosUsedThisGame`, `gameStartTime`, `mode`, `aiDifficulty`, Blitz-Felder.
- **tagTeamStore:** Zwei Bretter `boardA`, `boardB`, Teams, `bonusStones`, `turnOrder` 0–3, `mustPlaceBonus`.

---

## 5. Kern-Spiellogik (lib/game)

- **engine.ts:**  
  - `createInitialState()`  
  - `getValidMoves(state)` – wo setzen/ziehen/entfernen erlaubt  
  - `makeMove(state, position)` – immutable, liefert neues GameState (inkl. Mill, Remove, Phase, GameOver)  
  - `getRemovableStones(state)`, `checkGameOver(state)`, `computePhase(state)`

- **ai.ts:**  
  - `getAIMove(state, difficulty)` → `{ position, remove? }`  
  - `getAIMoveDelay(difficulty)` für UI-Verzögerung  
  - Schwierigkeiten: beginner … unfair (Level 1–5)

- **coach.ts:**  
  - `getCoachTip(state, humanPlayer)` → Tipp mit `from?`, `to`, `reason` (z. B. close_mill, block_opponent_mill)

- **types.ts:**  
  - `GameState`, `BoardState`, `Position` (0–23), `Player` 1|2, `Phase` placing|moving|flying, `GameMode`, `AIDifficulty`

---

## 6. Auto-Save (AI-Partie)

- **Ziel:** Nach Schließen/Absturz/Swipe-Back kann die Partie auf der Startseite mit „Continue Game“ fortgesetzt werden.
- **Key:** `muehle_saved_game_v2` (AsyncStorage).
- **Wann speichern:**  
  - Im **gameStore** nach jedem Zug (human/AI) und Undo: `persistGameStateSync(...)` (fire-and-forget).  
  - **Root-Layout** (`app/_layout.tsx`): `AppState` → bei `background`/`inactive` aktuelle Store-Daten mit `buildSavedGameFromStore` + `persistGameStateSync`.  
  - **Game-Screen:** Bei Unmount und bei `beforeRemove` (Navigation) gleiche Logik.
- **Wann löschen:** Bei Game Over (im Store), bei „Back to Menu“, bei Resign, beim Start einer **neuen** Partie (`startGame`).
- **Wichtig:** Speichern erfolgt im Store und in Layout/Screen – **nicht** nur in Komponenten-Lifecycle, damit bei schnellem Verlassen/Swipe nichts verloren geht.
- **lib/utils/savedGame.ts:**  
  - `persistGameStateSync(data)`, `buildSavedGameFromStore(store)`, `loadSavedGame()`, `deleteSavedGame()`, `SavedGame`-Typ, `getTimeAgo(iso, t)`.

---

## 7. Tag Team (2v2)

- **Konzept:** Zwei Bretter A/B, Teams 1 und 2. Schlägt ein Spieler einen Stein (Mill), erhält das **eigene** Team einen Bonus-Stein für das andere Brett (max 3).
- **Store:** `lib/store/tagTeamStore.ts` – `boardA`, `boardB`, `config` (Team-Zuordnung, KI-Schwierigkeiten), `bonusStones`, `turnOrder`, `mustPlaceBonus`, Game-Over wenn ein Team auf einem Brett verliert.
- **Screen:** `app/game/tagteam.tsx` – zwei Bretter, Bonus-Badge, Statuszeile, KI-Züge per `applyAIMove()` + Delay.
- **Konfiguration:** Auf dem Play-Screen „Tag Team“ → Modal (Partner-KI, Gegner-KI A/B) → Start Match → `startTagTeamGame(config)` → Push `/game/tagteam`.

---

## 8. Routing (Expo Router)

- **Tabs:** `(tabs)/index`, `play`, `puzzle`, `profile`.
- **Stack:**  
  - `game/[mode]` – ai, local, blitz, online (dynamisch).  
  - `game/tagteam` – statische Route für Tag Team.  
  - `puzzle/[id]`, `online`, `settings`, `tutorial`.
- **Parameter:**  
  - `/game/ai?restore=true` → Spiel lädt gespeicherte Partie und ruft `restoreGame(saved)` auf.  
  - `/game/online` mit `matchId` für laufendes Online-Match.

---

## 9. i18n

- **Keys:** Namespaces z. B. `common`, `home`, `play`, `game`, `save`, `tagTeam`, `coach`, `puzzle`, `settings`, `achievements` …
- **Dateien:** `lib/i18n/locales/en.ts`, `de.ts`.
- **Save/Continue:** `save.gameFound`, `save.continueGame`, `save.vsAi`, `save.savedAgo`, `save.newGame`, `save.justNow`, `save.minutesAgo`, `save.hoursAgo`.

---

## 10. Wichtige Konventionen

- **Kein React in lib/game:** Engine, AI, Coach, Board-Hilfen sind reines TypeScript.
- **Zustand:** Stores werden mit `useGameStore.getState()` auch außerhalb von Komponenten genutzt (z. B. Layout für Auto-Save).
- **Fire-and-forget beim Speichern:** `persistGameStateSync` ruft `AsyncStorage.setItem(..., json).catch(() => {})` auf, kein `await` in der Aufrufkette.
- **Ein gespeichertes Spiel:** Nur eine AI-Partie wird unter `muehle_saved_game_v2` gehalten; neue Partie oder Game Over überschreibt bzw. löscht.

---

## 11. Kurzreferenz für Claude

- **Neue Spielmodi:** `GameMode` in `lib/game/types.ts` erweitern; ggf. neuer Store oder Erweiterung von gameStore; neuer Screen unter `app/game/` und Eintrag im Play-Screen.
- **Neue Übersetzungen:** In `lib/i18n/locales/en.ts` und `de.ts` gleiche Keys ergänzen.
- **Auto-Save anpassen:** `lib/utils/savedGame.ts` (Key, Validierung, Felder) und Aufrufe von `persistGameStateSync` / `deleteSavedGame` in Store, Layout und Game-Screen prüfen.
- **KI-Verhalten:** `lib/game/ai.ts` (Bewertung, Tiefe, Zufall pro Level).
- **Coach-Texte:** `lib/game/coach.ts` (Gründe) und Übersetzungen unter `coach.*`.

Diese Dokumentation ist der aktuelle Stand für die Mühle-App und dient Claude AI als zentrale Referenz für Architektur, Datenfluss und Anpassungen.
