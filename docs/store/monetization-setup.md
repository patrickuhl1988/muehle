# Monetarisierung – Setup (AdMob, RevenueCat)

## Abhängigkeiten (native Build nötig)

- **Werbung:** `react-native-google-mobile-ads` (nur in Development Build / Production, nicht in Expo Go).
- **In-App-Käufe:** `react-native-purchases` (RevenueCat SDK).

Installation (nach Bedarf):

```bash
npx expo install react-native-google-mobile-ads react-native-purchases
```

Für AdMob unter Expo ggf. Config Plugin in `app.json` / `app.config.js` eintragen (siehe Doku von `react-native-google-mobile-ads`).

## Umgebungsvariablen

In `.env` oder EAS Secrets:

- **RevenueCat (Android):** `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`
- **RevenueCat (iOS):** `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
- **AdMob Banner (Android):** `EXPO_PUBLIC_ADMOB_BANNER_ANDROID`
- **AdMob Banner (iOS):** `EXPO_PUBLIC_ADMOB_BANNER_IOS`
- **AdMob Rewarded (Android):** `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`
- **AdMob Rewarded (iOS):** `EXPO_PUBLIC_ADMOB_REWARDED_IOS`

Ohne diese Keys laufen Banner und Rewarded-Ads im Dev mit Test-IDs; Käufe schlagen ohne RevenueCat-Key fehl (graceful).

## Produkt-IDs (RevenueCat / Play Billing)

Siehe `lib/iap/products.ts`:

- `werbefrei` – Ad-Free (3,99 €)
- `neon_theme` – Neon Theme (0,99 €)
- `marmor_theme` – Marmor Theme (1,49 €)
- `theme_bundle` – Theme Bundle (4,99 €)
- `puzzle_pack_expert` – Puzzle-Paket Experte (1,99 €)

Entitlements in RevenueCat-Dashboard anlegen und mit diesen IDs verknüpfen.
