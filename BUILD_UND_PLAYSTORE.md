# Mühle-App: Build & Play Store

Kurze Übersicht, welche Dateien du brauchst und wie du sie erzeugst.

---

## Was brauchst du wofür?

| Zweck | Dateityp | Verwendung |
|-------|----------|------------|
| **An Freunde zum Testen schicken** | **APK** | Eine einzelne Datei (z.B. `muehle-app.apk`). Freunde laden die Datei auf ihr Android-Handy und installieren sie („Installation aus unbekannten Quellen“ ggf. erlauben). |
| **Im Play Store veröffentlichen** | **AAB (App Bundle)** | Google verlangt für neue Apps ein **Android App Bundle** (.aab). Das lädst du im Play Console hoch; daraus erzeugt Google die APKs für die Nutzer. |

Du kannst beides mit dem gleichen Tool (EAS Build) erzeugen – nur mit unterschiedlichen Profilen.

---

## Voraussetzungen

1. **Node.js** (bereits vorhanden, da du das Projekt schon starten kannst)
2. **Expo-Konto** (kostenlos): [expo.dev](https://expo.dev) → Sign Up
3. **EAS CLI** (Command-Line-Tool von Expo) – siehe unten

---

## 1. APK bauen (zum Teilen mit Freunden)

So erzeugst du eine **APK**, die du per Link, E-Mail oder Cloud-Link verschicken kannst.

### Schritt 1: EAS CLI installieren

Im Projektordner im Terminal:

```bash
npm install -g eas-cli
```

### Schritt 2: Bei Expo anmelden

```bash
eas login
```

(Falls du noch kein Konto hast: `eas register` oder auf expo.dev registrieren.)

### Schritt 3: Projekt für EAS konfigurieren (nur einmal nötig)

```bash
eas build:configure
```

Falls gefragt wird, ob eine `eas.json` angelegt werden soll: Ja. Im Projekt liegt bereits eine `eas.json` mit Profil **preview** (APK) und **production** (AAB).

### Schritt 4: APK bauen

```bash
npm run build:apk
```

(Alternativ: `eas build --platform android --profile preview`)

- Der Build läuft in der **Expo Cloud** (nicht auf deinem Rechner).
- Dauer typisch 10–20 Minuten.
- Am Ende bekommst du einen **Download-Link** zur APK.

### Schritt 5: APK teilen

- Link aus dem Build-Output kopieren und an Freunde schicken, **oder**
- APK herunterladen und z.B. per Google Drive / WeTransfer / E-Mail schicken.

**Freunde:** Auf dem Android-Gerät den Link öffnen bzw. die APK öffnen und „Installieren“ tippen. Falls nötig: Einstellungen → Sicherheit → „Unbekannte Quellen“ / „Installation aus unbekannten Quellen“ für den verwendeten Browser oder Dateimanager erlauben.

---

## 2. AAB für den Play Store bauen

Für die **Veröffentlichung im Play Store** brauchst du ein **Android App Bundle (AAB)**.

### Build ausführen

```bash
npm run build:playstore
```

(Alternativ: `eas build --platform android --profile production`)

Ergebnis: Eine **.aab**-Datei (Download-Link wie bei der APK).

### Im Play Store hochladen

1. **Google Play Console** öffnen: [play.google.com/console](https://play.google.com/console)
2. App anlegen (falls noch nicht geschehen).
3. Unter **Release** → **Production** (oder Testing) → **Neues Release erstellen**.
4. Die **.aab**-Datei hochladen.
5. Beschreibung, Screenshots, Datenschutz etc. ausfüllen und Release einreichen.

Die Play Console führt dich durch alle Pflichtangaben (App-Inhalt, Zielgruppe, Preise etc.).

---

## Nützliche Befehle

| Befehl | Bedeutung |
|--------|-----------|
| `npm run build:apk` | APK bauen (zum Testen/Teilen) |
| `npm run build:playstore` | AAB bauen (für Play Store) |
| `eas build:list` | Deine letzten Builds und Download-Links anzeigen |

---

## Hinweise

- **Kosten:** Expo bietet eine begrenzte Anzahl kostenloser Builds pro Monat. Für gelegentliche APKs und ein Play-Store-Release reicht das meist.
- **Icons & Splash:** Stelle sicher, dass unter `assets/images/` die Dateien `icon.png`, `adaptive-icon.png` und `splash.png` existieren (z.B. mit `npm run generate-assets` erzeugen).
- **Version erhöhen:** Vor einem neuen Play-Store-Release in `app.json` unter `expo.version` die Version anheben (z.B. `1.0.1`).

Wenn du magst, können wir als Nächstes z.B. die `app.json` für die erste Play-Store-Version durchgehen oder die genauen Schritte in der Play Console durchspielen.
