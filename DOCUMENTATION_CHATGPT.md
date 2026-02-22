# Mühle – Technische Dokumentation für KI-Assistenten (z. B. ChatGPT)

Diese Datei beschreibt die **Mühle-App** (Nine Men's Morris) technisch so, dass ein KI-Assistent das Projekt verstehen, Änderungen vorschlagen und Code korrekt anpassen kann. Alle Pfade und Typen beziehen sich auf den aktuellen Stand des Repositories.

---

## 1. Projekt und Tech-Stack

- **App:** Mühle (Nine Men's Morris), Mobile-App
- **Framework:** Expo SDK 54, React Native, TypeScript
- **Routing:** expo-router (file-based), z. B. `app/game/[mode].tsx`, `app/game/tagteam.tsx`
- **State:** Zustand (Zustand-Stores in `lib/store/`)
- **i18n:** i18next, react-i18next; Keys in `lib/i18n/locales/de.ts` und `en.ts`
- **Spiel-Logik:** Rein in `lib/game/` (kein React), immutable

---

## 2. Spielregeln Mühle (Kurz)

- **Brett:** 24 Positionen (0–23), 3 konzentrische Quadrate, Verbindungen an den Mitten. Siehe `lib/game/constants.ts`: `ADJACENCY`, `MILL_LINES` (16 Mühlen).
- **Phasen:**
  - **placing:** Beide setzen abwechselnd je 9 Steine. Leere Felder = gültige Züge.
  - **moving:** Alle 18 Steine gesetzt. Zug = eigenen Stein wählen (`selectedStone`), dann auf benachbartes leeres Feld ziehen.
  - **flying:** Sobald ein Spieler nur noch 3 Steine hat: darf auf beliebiges leeres Feld springen.
- **Mühle:** 3 eigene Steine in einer Linie (MILL_LINES). Beim Schließen einer Mühle muss der aktuelle Spieler einen gegnerischen Stein entfernen (wenn alle in Mühlen: beliebiger Gegnerstein). `mustRemove` im State.
- **Ende:** Verloren, wenn weniger als 3 Steine und keine mehr in der Hand. Unentschieden: 50 Züge ohne Mühle oder 3-fache Stellungswiederholung.
- **Engine:** `lib/game/engine.ts` – `createInitialState()`, `getValidMoves(state)`, `makeMove(state, position)`, `computePhase(state)`, `checkGameOver(state)`.

---

## 3. Zentrale Typen (`lib/game/types.ts`)

```ts
type Position = number;           // 0..23
type Player = 1 | 2;
type Phase = 'placing' | 'moving' | 'flying';
type BoardState = (0 | 1 | 2)[]; // 24 Einträge

interface GameState {
  board: BoardState;
  currentPlayer: Player;
  phase: Phase;
  stonesInHand: { 1: number; 2: number };
  stonesOnBoard: { 1: number; 2: number };
  mustRemove: boolean;
  selectedStone: Position | null;  // moving/flying: gewählter Stein
  moveHistory: Move[];
  moveCount: number;
  gameOver: boolean;
  winner: Player | null;
  isDraw: boolean;
  lastMove: Move | null;
  lastMillAtMove: number;
  positionCount: Record<string, number>;
}

type GameMode = 'ai' | 'local' | 'online' | 'blitz' | 'tagteam';
type AIDifficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'unfair';
```

- **Moving/Flying:** Zuerst Stein setzen (`selectedStone = position`), dann `getValidMoves(state)` liefert Zielfelder; `makeMove(state, zielPosition)` führt den Zug aus. Ohne `selectedStone` gibt `getValidMoves` in moving/flying `[]` zurück.

---

## 4. Engine-API (`lib/game/engine.ts`)

| Funktion | Bedeutung |
|----------|-----------|
| `createInitialState(): GameState` | Leeres Brett, Phase placing, je 9 Steine in Hand. |
| `getValidMoves(state): Position[]` | Gültige Ziele: beim Setzen leere Felder; bei mustRemove `getRemovableStones`; in moving/flying nur wenn `selectedStone` gesetzt (benachbart oder beim Fliegen alle leeren). |
| `makeMove(state, position): GameState` | Führt einen Zug aus (setzen/ziehen/entfernen). Immutable, setzt `phase` via `computePhase(next)`. Bei Mühle: `mustRemove = true`, Spieler wechselt erst nach Entfernen. |
| `getRemovableStones(state): Position[]` | Gegnersteine, die entfernt werden dürfen (nicht in Mühle, oder alle wenn alle in Mühlen). |
| `getValidBonusPlacements(state): Position[]` | Leere Felder, auf denen das Setzen **keine** Mühle schließt (für Tag-Team-Bonus-Stein). |
| `computePhase(state): Phase` | placing, wenn noch Steine in Hand; sonst flying wenn jemand ≤3 Steine; sonst moving. |
| `checkGameOver(state): { gameOver, winner, isDraw }` | Sieg/Remis/Blockade/50-Züge/Repetition. |
| `checkMill(board, position, player): boolean` | Ob an `position` eine Mühle für `player` ist. |

---

## 5. Einzelbrett-Stores und Spielmodi

- **gameStore** (`lib/store/gameStore.ts`): Ein Brett, `state`, `validMoves`, `handlePositionPress(position)`, `applyAIMove()`, `startGame(mode, aiDifficulty?, timerConfig?)`, `restoreGame(saved)`, `resetGame()`. Blitz: `timerConfig`, `timeLeftP1`/`timeLeftP2`, `tickBlitzTimer()`.
- **Routen:** `/game/ai`, `/game/local`, `/game/blitz`, `/game/online` → `app/game/[mode].tsx`. Screen liest `mode` aus der Route.
- **handlePositionPress (Einzelbrett):** mustRemove → entfernen; placing → setzen; moving/flying → zuerst Stein wählen (`selectedStone`), dann Zielfeld; nach Zug: `validMoves` neu berechnen, bei AI `applyAIMove` nach Delay (useGame/useEffect).

---

## 6. Tag Team (2v2, zwei Bretter)

- **Konzept:** Zwei Bretter A und B. Team 1: Mensch auf A, KI-Partner auf B. Team 2: KI auf A und B. Schlägt jemand einen Stein (Mühle), bekommt **das eigene Team** einen Bonus-Stein für das **andere** Brett.
- **Types:** `lib/game/tagTeamTypes.ts`  
  - `BoardId = 'A' | 'B'`  
  - `TagTeamConfig`: team1 (boardAPlayer, boardBPlayer, boardBAiDifficulty), team2 (boardAAiDifficulty, boardBAiDifficulty), optional `maxBonusStones` (default 3).  
  - `TagTeamState`: boardA, boardB (je GameState), config, bonusStones {1,2}, bonusStonesUsedTotal {1,2}, turnOrder 0–3, mustPlaceBonus (BoardId | null), gameOver, winningTeam, roundsPlayed, teamCaptures.
- **Turn-Order:** 0 = Brett A Team 1 (Mensch), 1 = Brett B Team 2, 2 = Brett A Team 2, 3 = Brett B Team 1. Nach jedem Zug: `(turnOrder + 1) % 4`.
- **Bonus-Steine (Balancing):**  
  - Ein Bonus-Stein **kostet einen Zug** (nach dem Setzen wird turnOrder weitergeschaltet).  
  - **Max. 3 Bonus-Steine pro Team pro Partie** (Summe aus bereits platzierten + aktuell ausstehenden). Beim Generieren prüfen: `bonusStonesUsedTotal[team] + bonusStones[team] < maxBonusStones`.  
  - Beim Platzieren: nur Felder erlaubt, die **keine Mühle** schließen → `getValidBonusPlacements(stateForBonus)`. Nach Platzieren: `bonusStonesUsedTotal[team]++`.
- **Store:** `lib/store/tagTeamStore.ts` – `handlePositionPress(board, position)`, `applyAIMove()`, `startTagTeamGame(config)`, `resetTagTeam()`. Bei mustPlaceBonus: State mit +1 Stein in Hand, `makeMove`, dann wenn `lastMove?.formedMill` → Zug ablehnen (Bonus darf keine Mühle schließen).
- **Screen:** `app/game/tagteam.tsx` – zwei Bretter, dynamische Brettgröße, Turn-Bar, Bonus-Anzeige z. B. „x1 (2/3)“ bzw. „Maximum erreicht“. Gültige Züge für Bonus: `getValidBonusPlacements(stateForBonus)`.

---

## 7. Wichtige Dateien und Aufgaben

| Aufgabe | Relevante Dateien |
|--------|--------------------|
| Spiellogik / Züge / Phasen | `lib/game/engine.ts`, `lib/game/board.ts`, `lib/game/constants.ts` |
| KI-Zug | `lib/game/ai.ts` – getAIMove(state, difficulty), getAIMoveDelay(difficulty) |
| Einzelbrett-UI & Züge | `lib/store/gameStore.ts`, `app/game/[mode].tsx`, `lib/hooks/useGame.ts` |
| Tag Team Logik & Bonus | `lib/store/tagTeamStore.ts`, `lib/game/tagTeamTypes.ts`, `app/game/tagteam.tsx` |
| Spielmodus-Auswahl & Tag-Team-Config | `app/(tabs)/play.tsx` – Modals für Timer (Blitz) und Tag Team (Partner/Gegner-KI), dann `startTagTeamGame(config)` + Router |
| Brett-Komponente | `lib/components/Board.tsx` – gameState, validMoves, onPositionPress, theme, humanPlayer, optional boardSizeOverride |
| Übersetzungen | `lib/i18n/locales/de.ts`, `en.ts` – Keys z. B. play.*, game.*, tagTeam.*, save.* |
| Auto-Save (AI-Partie) | `lib/utils/savedGame.ts`, Aufrufe in gameStore, `app/_layout.tsx` (AppState), Game-Screen |
| Coach-Tipps | `lib/game/coach.ts` – getCoachTip(state, humanPlayer) |
| Blitz-Timer | `lib/game/timerConfig.ts`, `lib/hooks/useBlitzTimer.ts`, gameStore tickBlitzTimer |

---

## 8. i18n-Keys (Auswahl)

- **play:** tagTeam, tagTeamDesc, yourTeam, opponentTeam, boardA, boardB, startMatch, difficultyLevels.{beginner,easy,medium,hard,unfair}, tutorial, startGame, start.
- **tagTeam:** howItWorks, explanation, boardAYourGame, boardBPartner, turnBarYour, turnBarAi, yourTurnBoardA, partnerTurnBoardB, opponentTurnBoardA/B, placeBonusStone, bonusStone, bonusAvailable, bonusMaxReached, placeBonusOrMove, yourTeamWins, opponentTeamWins, teamCaptures, roundsPlayed.
- **game:** you, ai, aiThinking, placeStone, selectStone, moveStone, flyStone, millFormed, backToMenu.
- **common:** cancel, back, confirm, ok, save.

---

## 9. Konventionen für Code-Änderungen

- **lib/game:** Kein React, keine Hooks. Nur Typen, Konstanten und reine Funktionen.
- **Stores:** Zustand; bei Tag Team beide Bretter (boardA, boardB) und turnOrder/bonusStones/bonusStonesUsedTotal konsistent halten; nach makeMove Phase kommt aus der Engine.
- **Moving-Phase (Einzelbrett + Tag Team):** Zuerst `selectedStone` setzen (eigener Stein), dann getValidMoves nutzen und makeMove mit Zielfeld aufrufen. Kein makeMove ohne selectedStone in moving/flying.
- **Neue Übersetzungen:** Immer in `de.ts` und `en.ts` mit demselben Key ergänzen.
- **Routing:** Neue Spiel-Screens unter `app/game/`; bei Bedarf in `app/_layout.tsx` eine Stack.Screen-Option (z. B. headerShown: false) setzen.

---

## 10. Kurz-Checkliste für typische Änderungen

- **Neuer Spielmodus:** GameMode in types.ts, ggf. eigener Store oder Erweiterung gameStore/tagTeamStore, neuer Screen oder [mode], Eintrag in play.tsx.
- **Bonus-Regel anpassen:** tagTeamStore (Vergabe und Platzierung), getValidBonusPlacements/getMaxBonusPerGame, ggf. tagTeamTypes (maxBonusStones).
- **KI-Verhalten:** lib/game/ai.ts (Bewertung, Tiefe, Zufall).
- **Valid-Moves-Bug (moving):** Prüfen, ob selectedStone gesetzt wird und getValidMoves erst danach aufgerufen wird (gameStore und tagTeamStore).
- **Haptik/Sound:** useHaptics (light, medium, heavy, success, error), useSound – alle benötigten Callbacks aus den Hooks destructuren (z. B. `heavy` in [mode].tsx).

Diese Dokumentation ist als technische Referenz für KI-Assistenten gedacht und sollte bei größeren Änderungen an Engine, Stores oder Tag-Team-Regeln mit dem Code abgeglichen werden.
